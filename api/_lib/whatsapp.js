// La conversación del bot: recibe un mensaje ya limpio del webhook, decide
// qué quiso decir el usuario y responde. No toca Supabase ni Meta directo:
// usa datos.js (base de datos), meta.js (envío) y groq.js (IA), que en las
// pruebas se reemplazan por dobles.
import crypto from 'node:crypto'
import * as datos from './datos.js'
import * as meta from './meta.js'
import { interpretarConIA, transcribirAudio } from './groq.js'
import { intencionDesdeIA, interpretarLocal } from './interprete.js'
import { fechaLocalISO, MESES, partesFecha } from './fechas.js'
import {
  alertaPresupuesto, textoAyuda, textoCreditos, textoDeudas, textoGasto,
  textoPendientes, textoPresupuesto, textoResumen, textoUltimos,
} from './respuestas.js'
import { buscarEnTexto, fmx, normalizar } from './texto.js'
import { maskTelefono } from './env.js'
import { mesAplicacionIngreso } from '../../src/utils/fecha.js'

const MINUTOS_CODIGO = 10
const FORMATO_CORTO = 'Prueba con el formato corto: *89 café nu*, o escribe *ayuda*.'

// Un id de operación por mensaje de WhatsApp: si Meta reenvía el mensaje, la
// base de datos reconoce la misma operación y no la registra dos veces.
export function operacionId(wamid, paso = '') {
  if (!wamid) return crypto.randomUUID()
  const h = crypto.createHash('sha256').update(`${wamid}:${paso}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

const MENSAJES_ERROR = {
  OPERACION_METODO_INVALIDO: 'Ese método de pago ya no está disponible. Revisa tus métodos en la app → Perfil.',
  OPERACION_CREDITO_INVALIDO: 'La tarjeta ligada a ese método ya no está activa.',
  OPERACION_CATEGORIA_INVALIDA: 'Esa categoría ya no está disponible.',
  OPERACION_MONTO_INVALIDO: 'El monto debe ser mayor a cero.',
  OPERACION_MSI_INVALIDO: 'Los meses deben ser entre 2 y 60.',
  OPERACION_PROTEGIDA: 'Ese movimiento se administra desde la app (viene de un gasto fijo, deuda o ahorro).',
  OPERACION_NO_ENCONTRADA: 'Ese registro ya no existe.',
  PAGO_SIN_SALDO: 'Esa cuenta ya no tiene saldo pendiente.',
  PAGO_NO_ENCONTRADO: 'No encontré esa deuda o tarjeta.',
}
const mensajeError = (error) => {
  const clave = Object.keys(MENSAJES_ERROR).find(k => String(error?.message ?? '').includes(k))
  return `❌ ${clave ? MENSAJES_ERROR[clave] : 'No pude guardar el cambio. Intenta de nuevo en un momento.'}`
}

// ── Responder y dejar registro ───────────────────────────────────────────────
// extras: { ok, error, txId, opciones: [{ id, titulo }], enLog }
async function responder(c, texto, { ok = true, error = null, txId = null, opciones = null, enLog } = {}) {
  const cuerpo = `${c.prefijo ?? ''}${texto}`
  let errorEnvio = null
  try {
    if (opciones?.length) await meta.enviarOpciones(c.telefono, cuerpo, opciones)
    else await meta.enviarTexto(c.telefono, cuerpo)
  } catch (e) {
    errorEnvio = e.message
    console.error('No se pudo enviar la respuesta a', maskTelefono(c.telefono), '|', e.message)
  }
  await datos.cerrarLog(c.logId, {
    entrada: c.entradaLog,
    respuesta: enLog ?? texto,
    txId,
    procesado: ok && !errorEnvio,
    error: errorEnvio ?? error,
  })
}

// ── Punto de entrada ─────────────────────────────────────────────────────────
// mensaje: { telefono, wamid, tipo: 'texto'|'opcion'|'audio'|'otro', texto?, opcionId?, mediaId? }
export async function procesarMensaje(mensaje) {
  const entrada = mensaje.tipo === 'audio' ? '[nota de voz]'
    : mensaje.tipo === 'otro' ? '[mensaje no soportado]'
    : String(mensaje.texto ?? '')
  const { logId, duplicado } = await datos.reservarMensaje({ telefono: mensaje.telefono, entrada, wamid: mensaje.wamid })
  if (duplicado) {
    console.log('Mensaje repetido de Meta, ignorado:', maskTelefono(mensaje.telefono))
    return
  }

  const c = { ...mensaje, logId, hoy: fechaLocalISO(), prefijo: '' }
  try {
    await atender(c)
  } catch (error) {
    console.error('Error atendiendo mensaje de', maskTelefono(c.telefono), '|', error)
    await responder(c, 'Tuve un problema al procesar tu mensaje. Intenta de nuevo en unos minutos.', { ok: false, error: error.message })
  }
}

async function atender(c) {
  // 1. ¿De quién es el número?
  const { data: perfil, error: errorPerfil } = await datos.perfilPorTelefono(c.telefono)
  if (errorPerfil) throw new Error(errorPerfil.message)
  if (!perfil) {
    c.entradaLog = '[número sin registrar]'
    return responder(c, '❌ Este número no está registrado en Finni.\n\nAbre la app → *Perfil* → y escribe ahí tu número de WhatsApp.', { ok: false, error: 'Número no registrado' })
  }
  c.perfil = perfil

  // 2. Solo se atienden números verificados (ver supabase-whatsapp.sql)
  if (!perfil.whatsapp_verificado) return pedirVerificacion(c)

  // 3. Tipos de mensaje
  if (c.tipo === 'otro') {
    return responder(c, 'Por ahora solo entiendo texto y notas de voz. Escribe *ayuda* para ver ejemplos.', { ok: false, error: 'Tipo de mensaje no soportado' })
  }
  if (c.tipo === 'audio') {
    const transcrito = await escucharAudio(c)
    if (!transcrito) return
  }

  // 4. Catálogos del usuario
  const { categorias, metodos } = await datos.catalogos(perfil.id)
  c.categorias = categorias
  c.metodos = metodos

  // 5. ¿Había una pregunta pendiente?
  const local = interpretarLocal(c.texto, c)
  const pendiente = await datos.leerEstado(c.telefono)
  if (pendiente) {
    const resuelto = await continuarPendiente(c, pendiente, local)
    if (resuelto) return
  }

  // Tocó un botón de una pregunta que ya caducó
  if (c.tipo === 'opcion') {
    return responder(c, 'Esa pregunta ya caducó. Mándame el gasto otra vez, por favor.', { ok: false, error: 'Opción sin pregunta pendiente' })
  }

  // 6. Entender el mensaje: primero sin IA; si no, con IA
  let intencion = local
  if (!intencion) {
    const ia = await interpretarConIA(c.texto, c)
    if (ia?.error) {
      return responder(c, `No entendí tu mensaje y el asistente inteligente no está disponible ahora. ${FORMATO_CORTO}`, { ok: false, error: `${ia.error}: ${ia.detalle ?? ''}`.trim() })
    }
    intencion = intencionDesdeIA(ia, c)
    c.vinoDeIA = true
  }
  if (!intencion || intencion.tipo === 'si' || intencion.tipo === 'no') {
    return responder(c, `🤔 No entendí. ${FORMATO_CORTO}`, { ok: false, error: 'No entendido' })
  }

  return despachar(c, intencion)
}

function despachar(c, intencion) {
  switch (intencion.tipo) {
    case 'gasto': return registrarGasto(c, intencion)
    case 'ingreso': return registrarIngreso(c, intencion)
    case 'pago': return registrarPago(c, intencion)
    case 'corregir': return corregirUltimo(c, intencion)
    case 'comando': return ejecutarComando(c, intencion)
    default: return responder(c, `🤔 No entendí. ${FORMATO_CORTO}`, { ok: false, error: 'No entendido' })
  }
}

// ── Verificación del número ──────────────────────────────────────────────────
// El código viaja por WhatsApp y se escribe en la app: demuestra que quien
// tiene la cuenta también tiene el teléfono. No se guarda en el log (el log
// se puede leer desde la app).
async function pedirVerificacion(c) {
  c.entradaLog = '[número sin verificar]'
  const estado = await datos.leerEstado(c.telefono)
  const vigente = estado?.estado === 'esperando_verificacion' && new Date(estado.datos?.expira) > new Date()
  let codigo = vigente ? estado.datos.codigo : null
  if (!codigo) {
    codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
    await datos.guardarEstado(c.telefono, 'esperando_verificacion', {
      codigo,
      expira: new Date(Date.now() + MINUTOS_CODIGO * 60_000).toISOString(),
      intentos: 0,
    })
  }
  return responder(c,
    `🔐 Para confirmar que este número es tuyo, abre Finni → *Perfil* → WhatsApp y escribe este código:\n\n*${codigo}*\n\nVence en ${MINUTOS_CODIGO} minutos. Después ya puedes mandarme tus gastos.`,
    { ok: false, error: 'Número sin verificar', enLog: 'Código de verificación enviado' })
}

// ── Nota de voz ──────────────────────────────────────────────────────────────
async function escucharAudio(c) {
  const fallo = async (texto, error) => { await responder(c, texto, { ok: false, error }); return false }
  let audio
  try {
    audio = await meta.descargarMedia(c.mediaId)
  } catch (error) {
    return fallo(error.message === 'AUDIO_MUY_LARGO'
      ? 'Esa nota de voz es muy larga. Mándame una más corta o escríbelo.'
      : 'No pude descargar tu nota de voz. Intenta de nuevo o escríbelo.', error.message)
  }
  const r = await transcribirAudio(audio.buffer, audio.mime)
  if (r.error) return fallo('No pude entender la nota de voz. Intenta de nuevo o escríbelo.', `${r.error}: ${r.detalle ?? ''}`.trim())
  c.texto = r.texto
  c.entradaLog = `🎙️ ${r.texto}`
  c.prefijo = `🎙️ _"${r.texto}"_\n\n`
  return true
}

// ── Pregunta pendiente ───────────────────────────────────────────────────────
// Devuelve true si el mensaje era la respuesta (o canceló). Si el mensaje es
// una orden nueva completa, la pregunta se descarta y se atiende lo nuevo.
async function continuarPendiente(c, pendiente, local) {
  const esOrdenNueva = local && !['si', 'no'].includes(local.tipo)

  if (pendiente.estado === 'esperando_metodo') {
    const g = pendiente.datos
    if (local?.tipo === 'no') {
      await datos.borrarEstado(c.telefono)
      await responder(c, `❌ No guardé *${g.descripcion}* (${fmx(g.monto)}).`)
      return true
    }
    const metodo = c.tipo === 'opcion' && c.opcionId?.startsWith('metodo:')
      ? c.metodos.find(m => String(m.id) === c.opcionId.slice(7))
      : esOrdenNueva ? null : buscarEnTexto(c.metodos, c.texto)
    if (metodo) {
      await datos.borrarEstado(c.telefono)
      await guardarGasto(c, {
        ...g,
        metodo,
        categoria: c.categorias.find(x => x.id === g.categoria_id) ?? null,
      }, g.operacion_id, g.mensaje_original)
      return true
    }
    if (esOrdenNueva) {
      await datos.borrarEstado(c.telefono)
      c.prefijo += `_(Dejé sin guardar *${g.descripcion}* de ${fmx(g.monto)} porque no me dijiste con qué pagaste.)_\n\n`
      return false
    }
    await preguntarMetodo(c, g, `❓ No reconocí *"${c.texto}"* como método de pago.\n\n`)
    return true
  }

  if (pendiente.estado === 'esperando_confirmacion_deshacer') {
    const si = c.opcionId === 'si' || local?.tipo === 'si'
    const no = c.opcionId === 'no' || local?.tipo === 'no'
    if (si) {
      await datos.borrarEstado(c.telefono)
      const d = pendiente.datos
      const { data, error } = await datos.ejecutar(c.perfil.id, 'eliminar_gasto', { transaccion_id: d.tx_id })
      if (error) await responder(c, mensajeError(error), { ok: false, error: error.message })
      else if (!data?.eliminada) await responder(c, 'Ese gasto ya no existe; no había nada que borrar.')
      else await responder(c, `🗑️ *Gasto eliminado*\n📝 ${d.descripcion} — ${fmx(d.monto)}\n📅 ${d.fecha}`)
      return true
    }
    if (no) {
      await datos.borrarEstado(c.telefono)
      await responder(c, 'De acuerdo, no borré nada.')
      return true
    }
    if (esOrdenNueva) { await datos.borrarEstado(c.telefono); return false }
    await responder(c, '¿Borro ese gasto?', { opciones: [{ id: 'si', titulo: 'Sí, bórralo' }, { id: 'no', titulo: 'No' }] })
    return true
  }

  // Estado desconocido o viejo: se limpia
  await datos.borrarEstado(c.telefono)
  return false
}

// ── Gastos ───────────────────────────────────────────────────────────────────
async function registrarGasto(c, g) {
  const descripcion = g.descripcion ?? g.categoria?.nombre ?? 'Gasto'
  let { categoria, clasificacion } = g

  // Categoría: la que ya usó antes para lo mismo; si no hay, se le pregunta a la IA
  if (!categoria) {
    const previa = await datos.categoriaPorHistorial(c.perfil.id, descripcion)
    categoria = previa ? c.categorias.find(x => x.id === previa.categoria_id) ?? null : null
    if (categoria) clasificacion = previa.clasificacion ?? categoria.clasificacion
  }
  if (!categoria && !c.vinoDeIA && c.categorias.length > 0) {
    const sugerida = intencionDesdeIA(await interpretarConIA(c.texto, c), c)
    if (sugerida?.tipo === 'gasto') {
      categoria = sugerida.categoria
      clasificacion = sugerida.clasificacion ?? clasificacion
    }
  }
  clasificacion = clasificacion ?? categoria?.clasificacion ?? 'deseo'

  const gasto = {
    monto: g.monto, descripcion, fecha: g.fecha ?? c.hoy,
    categoria, categoria_id: categoria?.id ?? null, clasificacion, msi: g.msi ?? null,
  }
  const operacion = operacionId(c.wamid, 'gasto')

  // Método: el del mensaje; si solo tiene uno, ese; si no, se pregunta
  const metodo = g.metodo ?? (c.metodos.length === 1 ? c.metodos[0] : null)
  if (!metodo && c.metodos.length > 1) {
    const pendiente = { ...gasto, categoria: undefined, operacion_id: operacion, mensaje_original: c.texto }
    await datos.guardarEstado(c.telefono, 'esperando_metodo', pendiente)
    return preguntarMetodo(c, pendiente)
  }
  return guardarGasto(c, { ...gasto, metodo }, operacion, c.texto)
}

async function preguntarMetodo(c, g, antes = '') {
  const recientes = await datos.metodosRecientes(c.perfil.id)
  const orden = (m) => { const i = recientes.indexOf(m.id); return i === -1 ? 999 : i }
  const opciones = [...c.metodos].sort((a, b) => orden(a) - orden(b))
    .map(m => ({ id: `metodo:${m.id}`, titulo: m.nombre, descripcion: m.credito_id ? 'Tarjeta de crédito' : undefined }))
  return responder(c, `${antes}📝 *${g.descripcion}* — ${fmx(g.monto)}\n\n¿Con qué pagaste? Toca una opción o escribe el nombre (o *cancelar*).`,
    { ok: false, error: 'Esperando método de pago', opciones })
}

async function guardarGasto(c, g, operacion, mensajeOriginal) {
  const { data, error } = await datos.ejecutar(c.perfil.id, 'registrar_gasto', {
    descripcion: g.descripcion,
    monto: g.monto,
    categoria_id: g.categoria_id ?? g.categoria?.id ?? null,
    clasificacion: g.clasificacion,
    metodo_pago_id: g.metodo?.id ?? null,
    fecha: g.fecha,
    msi_meses: g.metodo?.credito_id ? g.msi ?? null : null,
    operacion_id: operacion,
    mensaje_original: mensajeOriginal,
  })
  if (error) return responder(c, mensajeError(error), { ok: false, error: error.message })

  const alerta = g.categoria ? alertaPresupuesto(await datos.presupuestoCategoria(c.perfil.id, g.categoria.id, ...mesDe(g.fecha))) : null
  const nota = !g.categoria ? '_Sin categoría: escribe *cambia la categoría a …* para ponérsela._' : null
  return responder(c, textoGasto('✅ *Gasto registrado*', g, { hoy: c.hoy, alerta, nota }), { txId: data?.transaccion_id ?? null })
}

const mesDe = (fechaISO) => { const { mes, anio } = partesFecha(fechaISO); return [mes, anio] }

// ── Corregir el último gasto registrado por WhatsApp ─────────────────────────
async function corregirUltimo(c, { campo, valor }) {
  const tx = await datos.ultimoGastoWhatsapp(c.perfil.id)
  if (!tx) return responder(c, 'No encontré ningún gasto registrado por WhatsApp para corregir.', { ok: false, error: 'Sin gasto que corregir' })

  const nuevo = {
    transaccion_id: tx.id, descripcion: tx.descripcion, monto: Number(tx.monto),
    categoria_id: tx.categoria_id, clasificacion: tx.clasificacion,
    metodo_pago_id: tx.metodo_pago_id, fecha: tx.fecha, msi_meses: tx.msi_meses,
  }
  if (campo === 'monto') {
    nuevo.monto = valor
  } else if (campo === 'categoria') {
    const categoria = buscarEnTexto(c.categorias, valor)
    if (!categoria) return responder(c, `No encontré la categoría *"${valor}"*.\n\nTus categorías: ${c.categorias.map(x => x.nombre).join(', ')}`, { ok: false, error: 'Categoría no reconocida' })
    nuevo.categoria_id = categoria.id
    nuevo.clasificacion = categoria.clasificacion
  } else {
    const metodo = buscarEnTexto(c.metodos, valor)
    if (!metodo) return responder(c, `No encontré el método *"${valor}"*.\n\nTus métodos: ${c.metodos.map(x => x.nombre).join(', ')}`, { ok: false, error: 'Método no reconocido' })
    nuevo.metodo_pago_id = metodo.id
    if (!metodo.credito_id) nuevo.msi_meses = null
  }

  const { error } = await datos.ejecutar(c.perfil.id, 'actualizar_gasto', nuevo)
  if (error) return responder(c, mensajeError(error), { ok: false, error: error.message })
  return responder(c, textoGasto('✏️ *Gasto corregido*', {
    monto: nuevo.monto, descripcion: nuevo.descripcion, fecha: nuevo.fecha, clasificacion: nuevo.clasificacion,
    categoria: c.categorias.find(x => x.id === nuevo.categoria_id) ?? null,
    metodo: c.metodos.find(x => x.id === nuevo.metodo_pago_id) ?? null,
    msi: nuevo.msi_meses,
  }, { hoy: c.hoy }), { txId: tx.id })
}

// ── Ingresos ─────────────────────────────────────────────────────────────────
async function registrarIngreso(c, g) {
  const fecha = g.fecha ?? c.hoy
  // Mismo criterio que la app: lo recibido del día 25 en adelante cuenta para el mes siguiente
  const aplica = mesAplicacionIngreso(fecha)
  const { error } = await datos.registrarIngreso(c.perfil.id, { concepto: g.descripcion, monto: g.monto, fecha, ...aplica })
  if (error) return responder(c, '❌ No pude guardar el ingreso. Intenta de nuevo.', { ok: false, error: error.message })

  const [mesFecha] = mesDe(fecha)
  return responder(c, [
    '✅ *Ingreso registrado*',
    `💰 +${fmx(g.monto)} — ${g.descripcion}`,
    fecha !== c.hoy ? `📅 ${fecha}` : null,
    aplica.mes !== mesFecha ? `📆 Cuenta para ${MESES[aplica.mes - 1]} (llegó a fin de mes)` : null,
  ].filter(Boolean).join('\n'))
}

// ── Pagos de algo ya registrado: gasto fijo, deuda o tarjeta ─────────────────
// "aboné 500 a nu" / "pagué 500 de la tarjeta nu": el objetivo queda vacío o genérico
const SOLO_TARJETA = /^((la |mi )?(tarjeta|tdc)( de credito)?|credito)?$/
async function registrarPago(c, p) {
  const fecha = p.fecha ?? c.hoy
  const [mes, anio] = mesDe(fecha)
  const [fijos, deudas, tarjetas] = await Promise.all([
    datos.fijosPendientes(c.perfil.id, mes, anio),
    datos.deudasActivas(c.perfil.id),
    datos.tarjetas(c.perfil.id),
  ])
  const conSaldo = tarjetas.filter(t => Number(t.saldo_utilizado) > 0)

  const fijo = p.objetivo ? buscarEnTexto(fijos, p.objetivo, 'concepto') : null
  if (fijo) {
    const monto = p.monto ?? Number(fijo.monto_previsto)
    const { data, error } = await datos.ejecutar(c.perfil.id, 'pagar_gasto_fijo', {
      gasto_id: fijo.id, monto, fecha, operacion_id: operacionId(c.wamid, 'fijo'),
    })
    if (error) return responder(c, mensajeError(error), { ok: false, error: error.message })
    const quedan = fijos.length - 1
    return responder(c, [
      '✅ *Gasto fijo pagado*',
      `🧾 ${fijo.concepto} — ${fmx(monto)}${monto !== Number(fijo.monto_previsto) ? ` (previsto ${fmx(fijo.monto_previsto)})` : ''}`,
      fecha !== c.hoy ? `📅 ${fecha}` : null,
      quedan > 0 ? `Te ${quedan === 1 ? 'queda 1 pendiente' : `quedan ${quedan} pendientes`} este mes.` : '🎉 Ya no tienes fijos pendientes este mes.',
    ].filter(Boolean).join('\n'), { txId: data?.transaccion_id ?? null })
  }

  // Deuda o tarjeta. "aboné 500 a nu": NU es un método → su tarjeta es el objetivo.
  const deuda = p.objetivo ? buscarEnTexto(deudas, p.objetivo) : null
  const tarjeta = (p.objetivo ? buscarEnTexto(conSaldo, p.objetivo) : null)
    ?? (p.metodo?.credito_id && SOLO_TARJETA.test(normalizar(p.objetivo)) ? conSaldo.find(t => t.id === p.metodo.credito_id) ?? null : null)
  const cuenta = deuda ?? tarjeta
  if (cuenta) {
    if (p.monto === null) {
      return responder(c, `¿Cuánto abonaste a *${cuenta.nombre}*? Escríbelo así: *aboné 500 a ${cuenta.nombre}*`, { ok: false, error: 'Falta el monto del abono' })
    }
    const esDeuda = Boolean(deuda)
    const { data, error } = await datos.ejecutar(c.perfil.id, esDeuda ? 'pagar_deuda' : 'pagar_credito', {
      id: cuenta.id, monto: p.monto, notas: 'WhatsApp', fecha, operacion_id: operacionId(c.wamid, 'abono'),
    })
    if (error) return responder(c, mensajeError(error), { ok: false, error: error.message })
    const aplicado = Number(data?.monto_aplicado ?? p.monto)
    const saldo = Number(data?.saldo_nuevo ?? 0)
    return responder(c, [
      `✅ *${esDeuda ? 'Abono registrado' : 'Pago de tarjeta registrado'}*`,
      `${esDeuda ? '🏷️' : '💳'} ${cuenta.nombre} — ${fmx(aplicado)}`,
      data?.recortado ? `_(Mandaste ${fmx(p.monto)}; apliqué solo lo que debías.)_` : null,
      saldo > 0 ? `Saldo restante: ${fmx(saldo)}` : '🎉 ¡Quedó liquidada!',
    ].filter(Boolean).join('\n'))
  }

  // No es algo registrado: si trae monto, es un gasto normal ("pagué 200 de estacionamiento")
  if (p.monto !== null && p.objetivo) {
    return registrarGasto(c, { monto: p.monto, descripcion: p.objetivo, fecha: p.fecha, metodo: p.metodo, categoria: null, clasificacion: null, msi: p.msi })
  }
  return responder(c, [
    `No encontré *"${p.objetivo || 'eso'}"* entre tus gastos fijos pendientes, deudas o tarjetas.`,
    '',
    textoPendientes(fijos, mes, anio),
  ].join('\n'), { ok: false, error: 'Pago sin destino' })
}

// ── Consultas ────────────────────────────────────────────────────────────────
async function ejecutarComando(c, { comando, categoria: textoCategoria }) {
  const id = c.perfil.id
  const [mes, anio] = mesDe(c.hoy)

  if (comando === 'ayuda') return responder(c, textoAyuda())
  if (comando === 'resumen') return responder(c, textoResumen(await datos.datosResumen(id, mes, anio), c.perfil, mes, anio))
  if (comando === 'pendientes') return responder(c, textoPendientes(await datos.fijosPendientes(id, mes, anio), mes, anio))
  if (comando === 'ultimos') return responder(c, textoUltimos(await datos.ultimosMovimientos(id, 5)))
  if (comando === 'creditos') return responder(c, textoCreditos(await datos.tarjetas(id), c.hoy))
  if (comando === 'deudas') {
    const [deudas, tarjetas] = await Promise.all([datos.deudasActivas(id), datos.tarjetas(id)])
    return responder(c, textoDeudas(deudas, tarjetas))
  }
  if (comando === 'presupuesto') {
    const categoria = buscarEnTexto(c.categorias, textoCategoria)
    if (!categoria) return responder(c, `No encontré la categoría *"${textoCategoria}"*.\n\nTus categorías: ${c.categorias.map(x => x.nombre).join(', ')}`, { ok: false, error: 'Categoría no reconocida' })
    return responder(c, textoPresupuesto(categoria, await datos.presupuestoCategoria(id, categoria.id, mes, anio), mes, anio))
  }
  if (comando === 'deshacer') {
    const tx = await datos.ultimoGastoWhatsapp(id)
    if (!tx) return responder(c, 'No encontré ningún gasto registrado por WhatsApp para borrar.', { ok: false, error: 'Sin gasto que deshacer' })
    await datos.guardarEstado(c.telefono, 'esperando_confirmacion_deshacer', { tx_id: tx.id, descripcion: tx.descripcion, monto: tx.monto, fecha: tx.fecha })
    return responder(c, `🗑️ *¿Borro este gasto?*\n📝 ${tx.descripcion} — ${fmx(tx.monto)}\n📅 ${tx.fecha}`,
      { ok: false, error: 'Esperando confirmación', opciones: [{ id: 'si', titulo: 'Sí, bórralo' }, { id: 'no', titulo: 'No' }] })
  }
  return responder(c, `🤔 No entendí. ${FORMATO_CORTO}`, { ok: false, error: 'No entendido' })
}
