import { categorizeWithGroq } from './groq.js'
import { supabaseAdmin } from './supabase-admin.js'

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

// ── Enviar mensaje ──────────────────────────────────────────────────────────────
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

// ── Procesar mensaje entrante ──────────────────────────────────────────────────
export async function processMessage(telefono, texto) {
  // 1. Buscar usuario por teléfono
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('id, regla_necesidad, regla_deseo, regla_ahorro')
    .eq('telefono', telefono).single()

  console.log('🔍 Buscando perfil para teléfono:', telefono, '| Resultado:', profile ? 'ENCONTRADO' : 'NO ENCONTRADO')

  if (!profile) {
    console.log('❌ Número no registrado, enviando mensaje de ayuda')
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

  // 3. Interpretar con Groq
  const result = await categorizeWithGroq(texto, catNames, metNames)

  // 4. Manejar comandos especiales
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

  // 5. No entendido
  if (result.error || !result.monto) {
    const ayuda = '🤔 No entendí. Prueba:\n• "350 gasolina costco"\n• "89 starbucks bbva"\n• "120 tacos"\n• "cómo voy este mes"\n• "mis deudas"\n• "mis créditos"'
    await sendMessage(telefono, ayuda)
    await logMessage(telefono, texto, ayuda, null, false, 'No entendido')
    return
  }

  // 6. Buscar IDs de categoría y método
  const cat = categorias?.find(c => c.nombre.toLowerCase() === result.categoria?.toLowerCase())
  const met = metodos?.find(m => m.nombre.toLowerCase() === result.metodo_pago?.toLowerCase())

  // 7. Insertar transacción
  const hoy = new Date().toISOString().split('T')[0]
  const { data: tx, error } = await supabaseAdmin
    .from('transacciones')
    .insert({
      user_id: profile.id,
      descripcion: result.descripcion || texto,
      monto: Number(result.monto),
      categoria_id: cat?.id ?? null,
      clasificacion: result.clasificacion ?? cat?.clasificacion ?? 'deseo',
      metodo_pago_id: met?.id ?? null,
      fecha: hoy,
      origen: 'whatsapp',
      mensaje_original: texto,
    })
    .select().single()

  if (error) {
    await sendMessage(telefono, '❌ Error al guardar el gasto. Intenta de nuevo.')
    await logMessage(telefono, texto, null, null, false, error.message)
    return
  }

  // 8. Respuesta de confirmación
  const clasifEmoji = { necesidad: '🔵', deseo: '🟡', ahorro: '🟢' }
  const respuesta = [
    `✅ *Gasto registrado*`,
    `💸 -$${Number(result.monto).toLocaleString('es-MX')} — ${cat?.nombre ?? 'Sin categoría'}`,
    `📝 ${result.descripcion || texto}`,
    `${clasifEmoji[result.clasificacion ?? 'deseo']} ${(result.clasificacion ?? 'deseo').toUpperCase()}`,
    met ? `💳 ${met.nombre}` : null,
    `📅 ${hoy}`,
  ].filter(Boolean).join('\n')

  await sendMessage(telefono, respuesta)
  await logMessage(telefono, texto, respuesta, tx.id, true, null)
}

// ── Helpers de respuestas ──────────────────────────────────────────────────────
async function buildResumen(profile) {
  const hoy = new Date()
  const mes = hoy.getMonth() + 1
  const anio = hoy.getFullYear()
  const inicio = `${anio}-${String(mes).padStart(2,'0')}-01`
  const fin = new Date(anio, mes, 0).toISOString().split('T')[0]
  const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const [{ data: ingresos }, { data: txs }] = await Promise.all([
    supabaseAdmin.from('ingresos').select('monto_actual').eq('user_id', profile.id).eq('mes', mes).eq('anio', anio),
    supabaseAdmin.from('transacciones').select('monto, clasificacion').eq('user_id', profile.id).gte('fecha', inicio).lte('fecha', fin),
  ])

  const totalIng = ingresos?.reduce((s,i) => s + Number(i.monto_actual), 0) ?? 0
  const totalGas = txs?.reduce((s,t) => s + Number(t.monto), 0) ?? 0
  const necesidad = txs?.filter(t => t.clasificacion === 'necesidad').reduce((s,t) => s + Number(t.monto), 0) ?? 0
  const deseo = txs?.filter(t => t.clasificacion === 'deseo').reduce((s,t) => s + Number(t.monto), 0) ?? 0
  const ahorro = txs?.filter(t => t.clasificacion === 'ahorro').reduce((s,t) => s + Number(t.monto), 0) ?? 0
  const balance = totalIng - totalGas

  const f = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`

  return [
    `📊 *Resumen ${MESES_ES[mes-1]} ${anio}*`,
    '',
    `💰 Ingresos: ${f(totalIng)}`,
    `💸 Gastos: ${f(totalGas)}`,
    `${balance >= 0 ? '✅' : '🔴'} Balance: ${f(balance)}`,
    '',
    `📐 *Regla 50/30/20:*`,
    `🔵 Necesidad: ${f(necesidad)} (meta ${f(totalIng * profile.regla_necesidad)})`,
    `🟡 Deseo: ${f(deseo)} (meta ${f(totalIng * profile.regla_deseo)})`,
    `🟢 Ahorro: ${f(ahorro)} (meta ${f(totalIng * profile.regla_ahorro)})`,
  ].join('\n')
}

async function buildDeudas(userId) {
  const { data: deudas } = await supabaseAdmin.from('deudas')
    .select('nombre, saldo_actual, fecha_proximo_pago')
    .eq('user_id', userId).eq('liquidada', false)

  if (!deudas?.length) return '✅ No tienes deudas activas registradas.'

  const total = deudas.reduce((s,d) => s + Number(d.saldo_actual), 0)
  const f = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`

  const lista = deudas.map(d =>
    `• ${d.nombre}: ${f(d.saldo_actual)}${d.fecha_proximo_pago ? ` (pago: ${d.fecha_proximo_pago})` : ''}`
  ).join('\n')

  return `💳 *Deudas activas:*\n\n${lista}\n\n💰 Total: ${f(total)}`
}

async function buildCreditos(userId) {
  const { data: creditos } = await supabaseAdmin.from('creditos')
    .select('nombre, fecha_corte, fecha_pago, mejor_fecha_inicio, mejor_fecha_fin, saldo_utilizado, limite_credito')
    .eq('user_id', userId).eq('activo', true)

  if (!creditos?.length) return 'No tienes créditos registrados.'

  const hoy = new Date().getDate()
  const f = (n) => `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`

  const lista = creditos.map(c => {
    const enRango = c.mejor_fecha_inicio && c.mejor_fecha_fin
      ? hoy >= c.mejor_fecha_inicio && hoy <= c.mejor_fecha_fin
      : false
    const diasPago = c.fecha_pago >= hoy ? c.fecha_pago - hoy : 30 - hoy + c.fecha_pago
    return [
      `💳 *${c.nombre}*`,
      `Corte: día ${c.fecha_corte} | Pago: día ${c.fecha_pago} (${diasPago} días)`,
      c.limite_credito ? `Saldo: ${f(c.saldo_utilizado)} de ${f(c.limite_credito)}` : `Saldo: ${f(c.saldo_utilizado)}`,
      enRango ? '✅ Buena fecha para usar' : `Mejor usar entre días ${c.mejor_fecha_inicio ?? '?'} y ${c.mejor_fecha_fin ?? '?'}`,
    ].join('\n')
  }).join('\n\n')

  return `🏦 *Tus créditos:*\n\n${lista}`
}

// ── Log ──────────────────────────────────────────────────────────────────────
async function logMessage(telefono, entrada, respuesta, txId, procesado, error) {
  await supabaseAdmin.from('whatsapp_log').insert({
    telefono, mensaje_entrante: entrada, respuesta_bot: respuesta,
    transaccion_id: txId, procesado, error,
  })
}
