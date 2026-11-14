// Todo el acceso a la base de datos del bot (service_role). El resto del bot
// no toca Supabase directamente: así la conversación se puede probar con
// dobles de este módulo.
import { supabaseAdmin as db } from './supabase-admin.js'
import { mesAnterior, rangoMes } from './fechas.js'

const MINUTOS_PREGUNTA_PENDIENTE = 15

const lanzar = (error) => { if (error) throw new Error(error.message ?? String(error)) }

// ── Log y mensajes duplicados ────────────────────────────────────────────────
// Meta reenvía un mensaje si el bot tarda. El id del mensaje (wamid) tiene
// índice único en whatsapp_log: si ya existe, el mensaje ya se atendió.
export async function reservarMensaje({ telefono, entrada, wamid }) {
  const fila = { telefono, mensaje_entrante: entrada, procesado: false }
  if (wamid) {
    const { data, error } = await db.from('whatsapp_log').insert({ ...fila, wamid }).select('id').single()
    if (!error) return { logId: data.id, duplicado: false }
    if (error.code === '23505') return { logId: null, duplicado: true }
    console.error('No se pudo reservar el mensaje (¿falta supabase-whatsapp.sql?):', error.message)
  }
  const { data, error } = await db.from('whatsapp_log').insert(fila).select('id').single()
  if (error) console.error('Error guardando whatsapp_log:', error.message)
  return { logId: data?.id ?? null, duplicado: false }
}

export async function cerrarLog(logId, { entrada, respuesta = null, txId = null, procesado = false, error = null }) {
  if (!logId) return
  const cambios = { respuesta_bot: respuesta, transaccion_id: txId, procesado, error }
  if (entrada != null) cambios.mensaje_entrante = entrada
  const { error: fallo } = await db.from('whatsapp_log').update(cambios).eq('id', logId)
  if (fallo) console.error('Error actualizando whatsapp_log:', fallo.message)
}

// ── Usuario y catálogos ──────────────────────────────────────────────────────
export const perfilPorTelefono = (telefono) => db.from('profiles')
  .select('id, nombre, whatsapp_verificado, regla_necesidad, regla_deseo, regla_ahorro')
  .eq('telefono', telefono).maybeSingle()

export async function catalogos(userId) {
  const [c, m] = await Promise.all([
    db.from('categorias').select('id, nombre, clasificacion, icono').eq('user_id', userId).eq('activa', true).order('nombre'),
    db.from('metodos_pago').select('id, nombre, tipo, credito_id').eq('user_id', userId).eq('activo', true).order('nombre'),
  ])
  lanzar(c.error ?? m.error)
  return { categorias: c.data ?? [], metodos: m.data ?? [] }
}

// Ids de métodos de pago, del usado más recientemente al menos
export async function metodosRecientes(userId) {
  const { data } = await db.from('transacciones').select('metodo_pago_id')
    .eq('user_id', userId).not('metodo_pago_id', 'is', null)
    .order('created_at', { ascending: false }).limit(40)
  return [...new Set((data ?? []).map(t => t.metodo_pago_id))]
}

// ── Pregunta pendiente (estado de la conversación) ───────────────────────────
// Caduca sola: si el bot preguntó algo ayer, el mensaje de hoy no es la respuesta.
// (La verificación del número trae su propia fecha de vencimiento.)
export async function leerEstado(telefono) {
  const { data, error } = await db.from('whatsapp_estado').select('estado, datos, updated_at').eq('telefono', telefono).maybeSingle()
  if (error) { console.error('Error leyendo estado WhatsApp:', error.message); return null }
  if (!data || data.estado === 'esperando_verificacion') return data ?? null
  const minutos = (Date.now() - new Date(data.updated_at).getTime()) / 60_000
  if (minutos > MINUTOS_PREGUNTA_PENDIENTE) { await borrarEstado(telefono); return null }
  return data
}
export async function guardarEstado(telefono, estado, datos) {
  const { error } = await db.from('whatsapp_estado').upsert({ telefono, estado, datos, updated_at: new Date().toISOString() })
  if (error) console.error('Error guardando estado WhatsApp:', error.message)
}
export async function borrarEstado(telefono) {
  const { error } = await db.from('whatsapp_estado').delete().eq('telefono', telefono)
  if (error) console.error('Error limpiando estado WhatsApp:', error.message)
}

// ── Escrituras de dinero ─────────────────────────────────────────────────────
// Siempre por whatsapp_ejecutar (supabase-whatsapp.sql), que reutiliza las RPC
// atómicas de la app: movimiento y saldo de tarjeta cambian juntos o no cambian.
// operacion: registrar_gasto | actualizar_gasto | eliminar_gasto |
//            pagar_gasto_fijo | pagar_deuda | pagar_credito
export const ejecutar = (userId, operacion, args) =>
  db.rpc('whatsapp_ejecutar', { p_user_id: userId, p_operacion: operacion, p_args: args })

export const registrarIngreso = (userId, { concepto, monto, fecha, mes, anio }) =>
  db.from('ingresos').insert({
    user_id: userId, concepto, monto_actual: monto, monto_presupuesto: monto,
    fecha_recepcion: fecha, mes, anio,
  })

// ── Lecturas ─────────────────────────────────────────────────────────────────
const escaparLike = (s) => String(s).replace(/[\\%_*]/g, c => (c === '*' ? '' : `\\${c}`))

// Categoría que el usuario ya le puso antes a un gasto con la misma descripción
export async function categoriaPorHistorial(userId, descripcion) {
  const { data } = await db.from('transacciones').select('categoria_id, clasificacion')
    .eq('user_id', userId).ilike('descripcion', escaparLike(descripcion)).not('categoria_id', 'is', null)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data ?? null
}

const CAMPOS_GASTO = 'id, descripcion, monto, categoria_id, clasificacion, metodo_pago_id, fecha, msi_meses, categorias(nombre, icono), metodos_pago(nombre, credito_id)'

export async function ultimoGastoWhatsapp(userId) {
  const { data } = await db.from('transacciones').select(CAMPOS_GASTO)
    .eq('user_id', userId).eq('origen', 'whatsapp')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data ?? null
}

export async function gastoPorId(userId, id) {
  const { data } = await db.from('transacciones').select(CAMPOS_GASTO).eq('user_id', userId).eq('id', id).maybeSingle()
  return data ?? null
}

export async function ultimosMovimientos(userId, n = 5) {
  const { data } = await db.from('transacciones').select(CAMPOS_GASTO)
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(n)
  return data ?? []
}

// Lo mismo que consulta el Inicio de la app para calcular el mes
export async function datosResumen(userId, mes, anio) {
  const rango = rangoMes(mes, anio)
  const prev = mesAnterior(mes, anio)
  const rangoPrev = rangoMes(prev.mes, prev.anio)
  const [ing, fijos, tx, ingPrev, fijosPrev, txPrev] = await Promise.all([
    db.from('ingresos').select('monto_actual').eq('user_id', userId).eq('mes', mes).eq('anio', anio),
    db.from('gastos_fijos').select('monto_previsto, monto_actual, clasificacion, pagado').eq('user_id', userId).eq('mes', mes).eq('anio', anio),
    db.from('transacciones').select('monto, clasificacion, origen').eq('user_id', userId).gte('fecha', rango.inicio).lte('fecha', rango.fin),
    db.from('ingresos').select('monto_actual').eq('user_id', userId).eq('mes', prev.mes).eq('anio', prev.anio),
    db.from('gastos_fijos').select('monto_actual').eq('user_id', userId).eq('mes', prev.mes).eq('anio', prev.anio),
    db.from('transacciones').select('monto, origen').eq('user_id', userId).gte('fecha', rangoPrev.inicio).lte('fecha', rangoPrev.fin),
  ])
  for (const r of [ing, fijos, tx, ingPrev, fijosPrev, txPrev]) lanzar(r.error)
  return {
    ingresos: ing.data ?? [], gastosFijos: fijos.data ?? [], transacciones: tx.data ?? [],
    ingresosPrev: ingPrev.data ?? [], gastosFijosPrev: fijosPrev.data ?? [], transaccionesPrev: txPrev.data ?? [],
  }
}

export async function presupuestoCategoria(userId, categoriaId, mes, anio) {
  const rango = rangoMes(mes, anio)
  const [presu, tx] = await Promise.all([
    db.from('presupuestos').select('monto_limite').eq('user_id', userId).eq('categoria_id', categoriaId).eq('mes', mes).eq('anio', anio).maybeSingle(),
    db.from('transacciones').select('monto').eq('user_id', userId).eq('categoria_id', categoriaId).gte('fecha', rango.inicio).lte('fecha', rango.fin),
  ])
  return {
    limite: Number(presu.data?.monto_limite ?? 0),
    gastado: (tx.data ?? []).reduce((s, t) => s + Number(t.monto), 0),
  }
}

export async function fijosPendientes(userId, mes, anio) {
  const { data, error } = await db.from('gastos_fijos').select('id, concepto, monto_previsto, dia_cobro')
    .eq('user_id', userId).eq('mes', mes).eq('anio', anio).eq('pagado', false)
    .order('dia_cobro', { ascending: true, nullsFirst: false })
  lanzar(error)
  return data ?? []
}

export async function deudasActivas(userId) {
  const { data, error } = await db.from('deudas').select('id, nombre, saldo_actual, fecha_proximo_pago')
    .eq('user_id', userId).eq('liquidada', false).order('saldo_actual', { ascending: false })
  lanzar(error)
  return data ?? []
}

export async function tarjetas(userId) {
  const { data, error } = await db.from('creditos').select('id, nombre, saldo_utilizado, limite_credito, fecha_corte, fecha_pago')
    .eq('user_id', userId).eq('activo', true).order('nombre')
  lanzar(error)
  return data ?? []
}
