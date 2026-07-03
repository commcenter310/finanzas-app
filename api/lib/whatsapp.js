import { categorizeWithGroq } from './groq.js'
import { supabaseAdmin } from './supabase-admin.js'

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

// ── Enviar mensaje ────────────────────────────────────────────────────────────
export async function sendMessage(to, text) {
  console.log('📤 Enviando mensaje a:', to, '| PhoneNumberID:', PHONE_NUMBER_ID)
  const r = await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  })
  const data = await r.json()
  console.log('📤 Respuesta de Meta al enviar:', JSON.stringify(data))
}

// ── Estado conversacional ─────────────────────────────────────────────────────
async function getEstado(telefono) {
  const { data } = await supabaseAdmin
    .from('whatsapp_estado').select('estado, datos').eq('telefono', telefono).single()
  return data
}
async function setEstado(telefono, estado, datos) {
  await supabaseAdmin.from('whatsapp_estado')
    .upsert({ telefono, estado, datos, updated_at: new Date().toISOString() })
}
async function clearEstado(telefono) {
  await supabaseAdmin.from('whatsapp_estado').delete().eq('telefono', telefono)
}

// ── Normalizar texto ──────────────────────────────────────────────────────────
const norm = s => s?.toLowerCase().trim() ?? ''

// ── Formatear moneda ──────────────────────────────────────────────────────────
const fmx = n => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`

// ── Calcular fecha con días de retroceso ──────────────────────────────────────
function calcularFecha(diasAtras = 0) {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  return d.toISOString().split('T')[0]
}

// ── Procesar mensaje entrante ─────────────────────────────────────────────────
export async function processMessage(telefono, texto) {
  // 1. Buscar usuario
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('id, regla_necesidad, regla_deseo, regla_ahorro')
    .eq('telefono', telefono).single()

  console.log('🔍 Buscando perfil para teléfono:', telefono, '| Resultado:', profile ? 'ENCONTRADO' : 'NO ENCONTRADO')

  if (!profile) {
    await sendMessage(telefono,
      '❌ Tu número no está registrado.\n\nVe a la app web → Perfil → y vincula tu número de WhatsApp.')
    await logMessage(telefono, texto, null, null, false, 'Número no registrado')
    return
  }

  // 2. Cargar categorías y métodos del usuario
  const [{ data: categorias }, { data: metodos }] = await Promise.all([
    supabaseAdmin.from('categorias').select('id, nombre, clasificacion').eq('user_id', profile.id).eq('activa', true),
    supabaseAdmin.from('metodos_pago').select('id, nombre').eq('user_id', profile.id).eq('activo', true),
  ])
  const catNames = categorias?.map(c => c.nombre).join(', ') ?? ''
  const metNames = metodos?.map(m => m.nombre).join(', ') ?? ''

  // 3. Verificar estado pendiente
  const estadoPendiente = await getEstado(telefono)

  // 3a. Confirmación de deshacer (2º paso)
  if (estadoPendiente?.estado === 'esperando_confirmacion_deshacer') {
    const respTexto = norm(texto)
    if (['sí', 'si', 'yes', 'confirmar', 'confirma'].includes(respTexto)) {
      const { tx_id, descripcion, monto, fecha } = estadoPendiente.datos
      await clearEstado(telefono)
      const { error } = await supabaseAdmin.from('transacciones').delete().eq('id', tx_id)
      if (error) {
        await sendMessage(telefono, '❌ Error al eliminar el gasto. Intenta de nuevo.')
        await logMessage(telefono, texto, null, null, false, error.message)
        return
      }
      const respuesta = `🗑️ *Gasto eliminado*\n📝 ${descripcion} — ${fmx(monto)}\n📅 ${fecha}`
      await sendMessage(telefono, respuesta)
      await logMessage(telefono, texto, respuesta, null, true, null)
      return
    }
    if (['no', 'cancelar', 'cancel', 'omitir'].includes(respTexto)) {
      await clearEstado(telefono)
      await sendMessage(telefono, '❌ Cancelado. El gasto no fue eliminado.')
      await logMessage(telefono, texto, 'Deshacer cancelado', null, true, null)
      return
    }
    // Respuesta no reconocida — recordar opciones
    await sendMessage(telefono, 'Responde *sí* para confirmar la eliminación o *no* para cancelar.')
    return
  }

  // 3b. Esperando método de pago
  if (estadoPendiente?.estado === 'esperando_metodo') {
    const respTexto = texto.trim().toLowerCase()

    // Cancelar
    if (['cancelar', 'cancel', 'no', 'omitir'].includes(respTexto)) {
      await clearEstado(telefono)
      await sendMessage(telefono, '❌ Gasto cancelado.')
      await logMessage(telefono, texto, 'Gasto cancelado', null, true, null)
      return
    }

    // Buscar método
    const datos = estadoPendiente.datos
    const met = metodos?.find(m =>
      norm(m.nombre) === norm(texto) ||
      norm(m.nombre).includes(norm(texto)) ||
      norm(texto).includes(norm(m.nombre))
    )

    if (!met) {
      const lista = metodos?.map(m => m.nombre).join(' · ') ?? 'ninguno configurado'
      await sendMessage(telefono,
        `❓ No reconocí *"${texto}"* como método de pago.\n\nMétodos disponibles:\n💳 ${lista}\n\nO escribe *cancelar* para no guardar.`)
      await logMessage(telefono, texto, null, null, false, 'Método no reconocido')
      return
    }

    // Guardar transacción con método
    await clearEstado(telefono)
    const { data: tx, error } = await supabaseAdmin.from('transacciones').insert({
      user_id: profile.id,
      descripcion: datos.descripcion,
      monto: datos.monto,
      categoria_id: datos.cat_id,
      clasificacion: datos.clasificacion,
      metodo_pago_id: met.id,
      fecha: datos.fecha,
      origen: 'whatsapp',
      mensaje_original: datos.mensaje_original,
    }).select().single()

    if (error) {
      await sendMessage(telefono, '❌ Error al guardar el gasto. Intenta de nuevo.')
      await logMessage(telefono, texto, null, null, false, error.message)
      return
    }

    const cat = categorias?.find(c => c.id === datos.cat_id)
    const clasifEmoji = { necesidad: '🔵', deseo: '🟡', ahorro: '🟢' }
    const alerta = await checkPresupuesto(profile.id, datos.cat_id, datos.fecha)

    const respuesta = [
      `✅ *Gasto registrado*`,
      `💸 -${fmx(datos.monto)} — ${cat?.nombre ?? 'Sin categoría'}`,
      `📝 ${datos.descripcion}`,
      `${clasifEmoji[datos.clasificacion ?? 'deseo']} ${(datos.clasificacion ?? 'deseo').toUpperCase()}`,
      `💳 ${met.nombre}`,
      `📅 ${datos.fecha}`,
      alerta,
    ].filter(Boolean).join('\n')

    await sendMessage(telefono, respuesta)
    await logMessage(telefono, texto, respuesta, tx.id, true, null)
    return
  }

  // 4. Interpretar con Groq
  const result = await categorizeWithGroq(texto, catNames, metNames)

  // 5. Comandos especiales
  if (result.comando === 'resumen') {
    const msg = await buildResumen(profile)
    await sendMessage(telefono, msg)
    await logMessage(telefono, texto, msg, null, true, null)
    return
  }
  if (result.comando === 'deudas') {
    const msg = await buildDeudas(profile.id)
    await sendMessage(telefono, msg)
    await logMessage(telefono, texto, msg, null, true, null)
    return
  }
  if (result.comando === 'creditos') {
    const msg = await buildCreditos(profile.id)
    await sendMessage(telefono, msg)
    await logMessage(telefono, texto, msg, null, true, null)
    return
  }
  if (result.comando === 'ultimos') {
    const msg = await buildUltimos(profile.id)
    await sendMessage(telefono, msg)
    await logMessage(telefono, texto, msg, null, true, null)
    return
  }
  if (result.comando === 'deshacer') {
    const msg = await buildDeshacer(profile.id, telefono)
    await sendMessage(telefono, msg)
    await logMessage(telefono, texto, msg, null, false, null)
    return
  }
  if (result.comando === 'presupuesto') {
    const msg = await buildPresupuesto(profile.id, result.categoria, categorias)
    await sendMessage(telefono, msg)
    await logMessage(telefono, texto, msg, null, true, null)
    return
  }

  // 6. No entendido
  if (result.error || (!result.monto && result.tipo !== 'ingreso')) {
    const ayuda = [
      '🤔 No entendí. Ejemplos:',
      '• *89 starbucks* — registrar gasto',
      '• *350 gasolina bbva* — gasto con método',
      '• *ayer 200 gasolina* — gasto de fecha pasada',
      '• *ingresé 5000 nómina* — registrar ingreso',
      '• *cómo voy este mes*',
      '• *últimos gastos*',
      '• *mis deudas*',
      '• *cuánto me queda en café* — ver presupuesto restante',
      '• *deshacer* — borra el último gasto',
    ].join('\n')
    await sendMessage(telefono, ayuda)
    await logMessage(telefono, texto, ayuda, null, false, 'No entendido')
    return
  }

  // 6.5 Validar monto — la salida del LLM no es confiable (negativos, NaN, absurdos)
  const montoNum = Number(result.monto)
  if (!Number.isFinite(montoNum) || montoNum <= 0 || montoNum > 10_000_000) {
    await sendMessage(telefono, `❌ No pude leer un monto válido en tu mensaje.\n\nEjemplo: *89 starbucks* o *ingresé 5000 nómina*`)
    await logMessage(telefono, texto, null, null, false, `Monto inválido: ${result.monto}`)
    return
  }

  // 7. Ingreso
  if (result.tipo === 'ingreso') {
    const hoy = new Date()
    const fechaRecepcion = hoy.toISOString().split('T')[0]
    const dia     = hoy.getDate()
    const mesRec  = hoy.getMonth() + 1
    const anioRec = hoy.getFullYear()
    // Mismo criterio que la web: si el dinero llega a fin de mes (día ≥ 25),
    // se aplica al mes siguiente (la nómina del 30 cubre la quincena del mes que entra)
    const aplicaSiguiente = dia >= 25
    const MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    const mesAplica  = aplicaSiguiente ? (mesRec === 12 ? 1 : mesRec + 1) : mesRec
    const anioAplica = aplicaSiguiente ? (mesRec === 12 ? anioRec + 1 : anioRec) : anioRec
    const { error } = await supabaseAdmin.from('ingresos').insert({
      user_id: profile.id,
      concepto: result.descripcion || 'Ingreso WhatsApp',
      monto_actual: montoNum,
      monto_presupuesto: 0,
      fecha_recepcion: fechaRecepcion,
      mes: mesAplica,
      anio: anioAplica,
    })
    if (error) {
      await sendMessage(telefono, '❌ Error al guardar el ingreso. Intenta de nuevo.')
      await logMessage(telefono, texto, null, null, false, error.message)
      return
    }
    const respuesta = [
      `✅ *Ingreso registrado*`,
      `💰 +${fmx(result.monto)} — ${result.descripcion || 'Ingreso'}`,
      `📅 ${fechaRecepcion}`,
      aplicaSiguiente ? `📆 Aplica a ${MES[mesAplica - 1]} (lo recibiste a fin de mes)` : null,
    ].filter(Boolean).join('\n')
    await sendMessage(telefono, respuesta)
    await logMessage(telefono, texto, respuesta, null, true, null)
    return
  }

  // 8. Buscar categoría (matching flexible)
  const cat = result.categoria
    ? categorias?.find(c =>
        norm(c.nombre) === norm(result.categoria) ||
        norm(c.nombre).includes(norm(result.categoria)) ||
        norm(result.categoria).includes(norm(c.nombre))
      )
    : null

  // 9. Buscar método (matching flexible)
  const met = result.metodo_pago
    ? metodos?.find(m =>
        norm(m.nombre) === norm(result.metodo_pago) ||
        norm(m.nombre).includes(norm(result.metodo_pago)) ||
        norm(result.metodo_pago).includes(norm(m.nombre))
      )
    : null

  const hoy = calcularFecha(result.dias_atras ?? 0)

  // 10. Sin método → guardar estado y preguntar
  if (!met) {
    await setEstado(telefono, 'esperando_metodo', {
      cat_id: cat?.id ?? null,
      clasificacion: result.clasificacion ?? cat?.clasificacion ?? 'deseo',
      descripcion: result.descripcion || texto,
      monto: montoNum,
      fecha: hoy,
      mensaje_original: texto,
    })
    const lista = metodos?.map(m => m.nombre).join(' · ') ?? 'ninguno configurado'
    const pregunta = [
      `📝 *${result.descripcion || texto}* — ${fmx(result.monto)}`,
      ``,
      `¿Con qué método pagaste?`,
      `💳 ${lista}`,
      ``,
      `_(o escribe *cancelar* para no guardar)_`,
    ].join('\n')
    await sendMessage(telefono, pregunta)
    await logMessage(telefono, texto, pregunta, null, false, 'Esperando método de pago')
    return
  }

  // 11. Insertar transacción completa
  const { data: tx, error } = await supabaseAdmin.from('transacciones').insert({
    user_id: profile.id,
    descripcion: result.descripcion || texto,
    monto: montoNum,
    categoria_id: cat?.id ?? null,
    clasificacion: result.clasificacion ?? cat?.clasificacion ?? 'deseo',
    metodo_pago_id: met.id,
    fecha: hoy,
    origen: 'whatsapp',
    mensaje_original: texto,
  }).select().single()

  if (error) {
    await sendMessage(telefono, '❌ Error al guardar el gasto. Intenta de nuevo.')
    await logMessage(telefono, texto, null, null, false, error.message)
    return
  }

  // 12. Respuesta + alerta de presupuesto
  const clasifEmoji = { necesidad: '🔵', deseo: '🟡', ahorro: '🟢' }
  const alerta = await checkPresupuesto(profile.id, cat?.id, hoy)

  const respuesta = [
    `✅ *Gasto registrado*`,
    `💸 -${fmx(result.monto)} — ${cat?.nombre ?? 'Sin categoría'}`,
    `📝 ${result.descripcion || texto}`,
    `${clasifEmoji[result.clasificacion ?? 'deseo']} ${(result.clasificacion ?? 'deseo').toUpperCase()}`,
    `💳 ${met.nombre}`,
    `📅 ${hoy}`,
    alerta,
  ].filter(Boolean).join('\n')

  await sendMessage(telefono, respuesta)
  await logMessage(telefono, texto, respuesta, tx.id, true, null)
}

// ── Alerta de presupuesto ─────────────────────────────────────────────────────
async function checkPresupuesto(userId, catId, fecha) {
  if (!catId) return null
  const [anioStr, mesStr] = fecha.split('-')
  const mesAct  = parseInt(mesStr)
  const anioAct = parseInt(anioStr)
  const inicio  = `${anioAct}-${String(mesAct).padStart(2, '0')}-01`
  const fin     = new Date(anioAct, mesAct, 0).toISOString().split('T')[0]

  const [{ data: presu }, { data: txs }] = await Promise.all([
    supabaseAdmin.from('presupuestos').select('monto_limite')
      .eq('user_id', userId).eq('categoria_id', catId).eq('mes', mesAct).eq('anio', anioAct).single(),
    supabaseAdmin.from('transacciones').select('monto')
      .eq('user_id', userId).eq('categoria_id', catId).gte('fecha', inicio).lte('fecha', fin),
  ])

  if (!presu?.monto_limite || presu.monto_limite <= 0) return null

  const gastado = txs?.reduce((s, t) => s + Number(t.monto), 0) ?? 0
  const pct     = (gastado / presu.monto_limite) * 100

  if (pct >= 100) return `\n⚠️ *Presupuesto EXCEDIDO* — ${fmx(gastado)} de ${fmx(presu.monto_limite)} (${pct.toFixed(0)}%)`
  if (pct >= 80)  return `\n🟡 Presupuesto al ${pct.toFixed(0)}% — te quedan ${fmx(presu.monto_limite - gastado)}`
  return null
}

// ── Últimos movimientos ───────────────────────────────────────────────────────
async function buildUltimos(userId) {
  const { data: txs } = await supabaseAdmin
    .from('transacciones')
    .select('descripcion, monto, fecha, categorias(nombre, icono), metodos_pago(nombre)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!txs?.length) return '📋 No tienes gastos registrados recientemente.'

  const lista = txs.map((t, i) => {
    const cat = t.categorias ? `${t.categorias.icono} ${t.categorias.nombre}` : '📦'
    const met = t.metodos_pago ? ` · ${t.metodos_pago.nombre}` : ''
    return `${i + 1}. ${cat} ${t.descripcion} — ${fmx(t.monto)}${met} · ${t.fecha}`
  }).join('\n')

  return `📋 *Últimos 5 gastos:*\n\n${lista}`
}

// ── Consultar presupuesto por categoría ──────────────────────────────────────
async function buildPresupuesto(userId, catNombre, categorias) {
  const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const ahora = new Date()
  const mes   = ahora.getMonth() + 1
  const anio  = ahora.getFullYear()
  const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`
  const fin    = new Date(anio, mes, 0).toISOString().split('T')[0]

  // Matching flexible de categoría
  const cat = catNombre
    ? categorias?.find(c =>
        norm(c.nombre) === norm(catNombre) ||
        norm(c.nombre).includes(norm(catNombre)) ||
        norm(catNombre).includes(norm(c.nombre))
      )
    : null

  if (!cat) {
    const lista = categorias?.map(c => c.nombre).join(', ') ?? 'ninguna'
    return `❓ No encontré la categoría *"${catNombre}"*.\n\nCategorías disponibles: ${lista}`
  }

  const [{ data: presu }, { data: txs }] = await Promise.all([
    supabaseAdmin.from('presupuestos').select('monto_limite')
      .eq('user_id', userId).eq('categoria_id', cat.id).eq('mes', mes).eq('anio', anio).single(),
    supabaseAdmin.from('transacciones').select('monto')
      .eq('user_id', userId).eq('categoria_id', cat.id).gte('fecha', inicio).lte('fecha', fin),
  ])

  const gastado = txs?.reduce((s, t) => s + Number(t.monto), 0) ?? 0
  const mesLabel = `${MESES_ES[mes - 1]} ${anio}`

  if (!presu?.monto_limite || presu.monto_limite <= 0) {
    return `⚪ Sin límite configurado para *${cat.nombre}*.\nGastado este mes (${mesLabel}): ${fmx(gastado)}`
  }

  const limite     = presu.monto_limite
  const disponible = limite - gastado
  const pct        = Math.min((gastado / limite) * 100, 100).toFixed(0)
  const emoji      = gastado >= limite ? '🔴' : gastado / limite >= 0.8 ? '🟡' : '✅'

  return [
    `📊 *${cat.nombre} — ${mesLabel}*`,
    `💸 Gastado: ${fmx(gastado)}`,
    `🎯 Presupuesto: ${fmx(limite)}`,
    `${emoji} ${disponible >= 0 ? `Disponible: ${fmx(disponible)} (${pct}% usado)` : `Excedido por ${fmx(-disponible)}`}`,
  ].join('\n')
}

// ── Deshacer último gasto — paso 1: buscar y pedir confirmación ───────────────
async function buildDeshacer(userId, telefono) {
  const { data: tx } = await supabaseAdmin
    .from('transacciones')
    .select('id, descripcion, monto, fecha')
    .eq('user_id', userId)
    .eq('origen', 'whatsapp')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!tx) return '❌ No encontré ningún gasto registrado por WhatsApp para eliminar.'

  // Guardar estado para el 2º paso (confirmación)
  await setEstado(telefono, 'esperando_confirmacion_deshacer', {
    tx_id:       tx.id,
    descripcion: tx.descripcion,
    monto:       tx.monto,
    fecha:       tx.fecha,
  })

  return [
    `🗑️ *¿Confirmas borrar este gasto?*`,
    `📝 ${tx.descripcion} — ${fmx(tx.monto)}`,
    `📅 ${tx.fecha}`,
    ``,
    `Responde *sí* para confirmar o *no* para cancelar.`,
  ].join('\n')
}

// ── Resumen del mes ───────────────────────────────────────────────────────────
async function buildResumen(profile) {
  const hoy  = new Date()
  const mes  = hoy.getMonth() + 1
  const anio = hoy.getFullYear()
  const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`
  const fin    = new Date(anio, mes, 0).toISOString().split('T')[0]
  const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const [{ data: ingresos }, { data: txs }] = await Promise.all([
    supabaseAdmin.from('ingresos').select('monto_actual').eq('user_id', profile.id).eq('mes', mes).eq('anio', anio),
    supabaseAdmin.from('transacciones').select('monto, clasificacion').eq('user_id', profile.id).gte('fecha', inicio).lte('fecha', fin),
  ])

  const totalIng  = ingresos?.reduce((s, i) => s + Number(i.monto_actual), 0) ?? 0
  const totalGas  = txs?.reduce((s, t) => s + Number(t.monto), 0) ?? 0
  const necesidad = txs?.filter(t => t.clasificacion === 'necesidad').reduce((s, t) => s + Number(t.monto), 0) ?? 0
  const deseo     = txs?.filter(t => t.clasificacion === 'deseo').reduce((s, t) => s + Number(t.monto), 0) ?? 0
  const ahorro    = txs?.filter(t => t.clasificacion === 'ahorro').reduce((s, t) => s + Number(t.monto), 0) ?? 0
  const balance   = totalIng - totalGas

  return [
    `📊 *Resumen ${MESES_ES[mes - 1]} ${anio}*`,
    '',
    `💰 Ingresos: ${fmx(totalIng)}`,
    `💸 Gastos: ${fmx(totalGas)}`,
    `${balance >= 0 ? '✅' : '🔴'} Balance: ${fmx(balance)}`,
    '',
    `📐 *Regla 50/30/20:*`,
    `🔵 Necesidad: ${fmx(necesidad)} (meta ${fmx(totalIng * profile.regla_necesidad)})`,
    `🟡 Deseo: ${fmx(deseo)} (meta ${fmx(totalIng * profile.regla_deseo)})`,
    `🟢 Ahorro: ${fmx(ahorro)} (meta ${fmx(totalIng * profile.regla_ahorro)})`,
  ].join('\n')
}

// ── Deudas ────────────────────────────────────────────────────────────────────
async function buildDeudas(userId) {
  const { data: deudas } = await supabaseAdmin.from('deudas')
    .select('nombre, saldo_actual, fecha_proximo_pago')
    .eq('user_id', userId).eq('liquidada', false)

  if (!deudas?.length) return '✅ No tienes deudas activas registradas.'

  const total = deudas.reduce((s, d) => s + Number(d.saldo_actual), 0)
  const lista = deudas.map(d =>
    `• ${d.nombre}: ${fmx(d.saldo_actual)}${d.fecha_proximo_pago ? ` (pago: ${d.fecha_proximo_pago})` : ''}`
  ).join('\n')

  return `💳 *Deudas activas:*\n\n${lista}\n\n💰 Total: ${fmx(total)}`
}

// ── Créditos ──────────────────────────────────────────────────────────────────
async function buildCreditos(userId) {
  const { data: creditos } = await supabaseAdmin.from('creditos')
    .select('nombre, fecha_corte, fecha_pago, mejor_fecha_inicio, mejor_fecha_fin, saldo_utilizado, limite_credito')
    .eq('user_id', userId).eq('activo', true)

  if (!creditos?.length) return 'No tienes créditos registrados.'

  const ahora = new Date()
  const hoy   = ahora.getDate()
  // Días reales hasta un día del mes (meses de 28-31 días; día inexistente → último del mes)
  const diasHasta = (diaObj) => {
    if (diaObj == null) return null
    const diasEsteMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate()
    if (diaObj >= hoy) return Math.min(diaObj, diasEsteMes) - hoy
    const diasProxMes = new Date(ahora.getFullYear(), ahora.getMonth() + 2, 0).getDate()
    return (diasEsteMes - hoy) + Math.min(diaObj, diasProxMes)
  }

  const lista = creditos.map(c => {
    const enRango  = c.mejor_fecha_inicio && c.mejor_fecha_fin
      ? hoy >= c.mejor_fecha_inicio && hoy <= c.mejor_fecha_fin : false
    const diasPago = diasHasta(c.fecha_pago)
    return [
      `💳 *${c.nombre}*`,
      `Corte: día ${c.fecha_corte ?? '?'} | Pago: día ${c.fecha_pago ?? '?'}${diasPago != null ? ` (${diasPago} días)` : ''}`,
      c.limite_credito ? `Saldo: ${fmx(c.saldo_utilizado)} de ${fmx(c.limite_credito)}` : `Saldo: ${fmx(c.saldo_utilizado)}`,
      enRango ? '✅ Buena fecha para usar' : `Mejor usar entre días ${c.mejor_fecha_inicio ?? '?'} y ${c.mejor_fecha_fin ?? '?'}`,
    ].join('\n')
  }).join('\n\n')

  return `🏦 *Tus créditos:*\n\n${lista}`
}

// ── Log ───────────────────────────────────────────────────────────────────────
async function logMessage(telefono, entrada, respuesta, txId, procesado, error) {
  await supabaseAdmin.from('whatsapp_log').insert({
    telefono, mensaje_entrante: entrada, respuesta_bot: respuesta,
    transaccion_id: txId, procesado, error,
  })
}
