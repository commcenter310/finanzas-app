// Entiende el mensaje del usuario SIN inteligencia artificial cuando se puede:
// comandos ("resumen", "deshacer") y movimientos simples ("89 café nu ayer").
// Así el bot responde rápido y sigue funcionando si el proveedor de IA falla.
// Lo que no se entiende aquí devuelve null y pasa a la IA (groq.js).
// Todo es puro: recibe texto y catálogos, devuelve una "intención".
//
// Intenciones:
//   { tipo: 'si' } | { tipo: 'no' }
//   { tipo: 'comando', comando, categoria? }
//   { tipo: 'corregir', campo: 'monto'|'categoria'|'metodo', valor }
//   { tipo: 'gasto',   monto, descripcion, fecha, metodo, categoria, clasificacion, msi }
//   { tipo: 'ingreso', monto, descripcion, fecha }
//   { tipo: 'pago',    objetivo, monto, fecha, metodo }   (gasto fijo, deuda o tarjeta)
// `fecha` es null cuando el mensaje no la dice (se usa hoy); `metodo` y
// `categoria` son el objeto del catálogo o null.
import { buscarPorNombre, capitalizar, normalizar, parsearMonto, tokenizar } from './texto.js'
import { extraerFecha, fechaAceptable } from './fechas.js'

const SI = new Set(['si', 's', 'yes', 'confirmar', 'confirmo', 'confirma', 'ok', 'va', 'dale', 'claro', 'simon'])
const NO = new Set(['no', 'n', 'cancelar', 'cancela', 'cancel', 'omitir', 'nel'])

const COMANDOS = [
  ['ayuda', /^(ayuda|help|menu|comandos|que puedes hacer|como funcionas?|hola|buenas|buenos dias|buenas tardes|buenas noches)$/],
  ['resumen', /^(resumen|balance|como voy|como vamos)( (de|del|este|en el) mes| del mes| mensual)?$/],
  ['deudas', /^((mis|ver) )?deudas$|^cuanto debo$/],
  ['creditos', /^((mis|ver) )?(creditos|tarjetas)$|^fechas? de corte$/],
  ['ultimos', /^(ultimos|ultimas)( gastos| movimientos)?$|^(mis gastos|que registre|movimientos)$/],
  ['deshacer', /^(deshacer|deshaz|borrar|borra|eliminar|elimina)( (el|mi))?( ultimo)?( gasto| movimiento)?$/],
  ['pendientes', /^(pendientes|por pagar|que (me )?falta (por )?pagar|que debo pagar|(mis )?(gastos )?fijos)$/],
]
const PRESUPUESTO = /^(?:cuanto (?:me )?queda (?:en|de|para)|cuanto llevo (?:en|de)|presupuesto(?: de| en| para)?) (.+)$/

const CORREGIR_MONTO = /^(?:(?:corrige|corregir|cambia|cambiar)(?: el)?(?: monto)?(?: a| por)?|era|eran|fue|fueron|son)(?: de)? (\$?[\d.,]+k?)(?: pesos)?$/
const CORREGIR_CATEGORIA = /^(?:corrige|corregir|cambia|cambiar)(?: la)? categoria(?: a| por)? (.+)$/
const CORREGIR_METODO = /^(?:(?:corrige|corregir|cambia|cambiar)(?: el)? metodo(?: de pago)?(?: a| por)?|fue con|lo pague con) (.+)$/

const VERBOS_INGRESO = new Set(['ingrese', 'ingreso', 'recibi', 'cobre', 'deposito', 'gane'])
const VERBOS_INGRESO_ME = new Set(['pagaron', 'depositaron', 'cayo', 'cayeron', 'llego', 'llegaron', 'dieron'])
const VERBOS_PAGO = new Set(['pague', 'pago', 'abone', 'abono', 'liquide'])
const VERBOS_GASTO = new Set(['gaste', 'compre', 'gasto'])
const RELLENO = new Set(['pesos', 'peso', 'mxn', '$'])
const ORILLAS = new Set(['con', 'en', 'de', 'del', 'por', 'para', 'a', 'al', 'y', 'la', 'el', 'los', 'las', 'mi', 'mis', 'un', 'una'])
const MAX_PALABRAS_DESCRIPCION = 6

const sinRango = (lista, inicio, largo) => [...lista.slice(0, inicio), ...lista.slice(inicio + largo)]

// "a 12 meses", "en 6 meses", "12 msi", "12msi", "a 12 meses sin intereses"
function extraerMsi(ts) {
  const n = ts.map(t => t.norm)
  const valido = (v) => Number.isInteger(v) && v >= 2 && v <= 60
  for (let i = 0; i < n.length; i++) {
    const pegado = /^(\d{1,2})msi$/.exec(n[i])
    if (pegado && valido(Number(pegado[1]))) return { msi: Number(pegado[1]), ts: sinRango(ts, i, 1) }

    const conPrep = n[i] === 'a' || n[i] === 'en'
    const j = conPrep ? i + 1 : i
    const meses = Number(n[j])
    if (/^\d{1,2}$/.test(n[j] ?? '') && valido(meses) && ['meses', 'msi', 'mensualidades'].includes(n[j + 1])) {
      if (!conPrep && n[j + 1] !== 'msi') continue   // "3 meses" suelto no es un plan de pagos
      let largo = j + 2 - i
      if (n[j + 2] === 'sin' && /^interes(es)?$/.test(n[j + 3] ?? '')) largo += 2
      return { msi: meses, ts: sinRango(ts, i, largo) }
    }
  }
  return { msi: null, ts }
}

// Quita preposiciones y artículos que quedaron colgando en las orillas
function recortarOrillas(ts) {
  let r = ts.filter(t => !RELLENO.has(t.norm))
  while (r.length && ORILLAS.has(r[0].norm)) r = r.slice(1)
  while (r.length && ORILLAS.has(r[r.length - 1].norm)) r = r.slice(0, -1)
  return r
}

// Saca del mensaje fecha, plan a meses, monto y método de pago.
// Devuelve null si hay más de un monto (mensaje ambiguo → IA).
function desarmar(ts, { hoy, metodos }) {
  let fecha = null
  const f = extraerFecha(ts.map(t => t.norm), hoy)
  if (f) { fecha = f.fecha; ts = sinRango(ts, f.inicio, f.largo) }

  const conMsi = extraerMsi(ts)
  ts = conMsi.ts

  const montos = ts.map((t, i) => ({ i, valor: parsearMonto(t.norm) })).filter(m => m.valor !== null)
  if (montos.length > 1) return null
  const monto = montos.length ? montos[0].valor : null
  if (montos.length) ts = sinRango(ts, montos[0].i, 1)

  let metodo = null
  const m = buscarPorNombre(metodos, ts.map(t => t.norm))
  if (m) { metodo = m.item; ts = sinRango(ts, m.inicio, m.largo) }

  return { fecha, msi: conMsi.msi, monto, metodo, resto: recortarOrillas(ts) }
}

const textoDe = (ts) => capitalizar(ts.map(t => t.orig).join(' '))

export function interpretarLocal(texto, { hoy, metodos = [], categorias = [] }) {
  const norm = normalizar(texto)
  if (!norm) return null
  if (SI.has(norm)) return { tipo: 'si' }
  if (NO.has(norm)) return { tipo: 'no' }

  for (const [comando, patron] of COMANDOS) if (patron.test(norm)) return { tipo: 'comando', comando }
  const presupuesto = PRESUPUESTO.exec(norm)
  if (presupuesto) return { tipo: 'comando', comando: 'presupuesto', categoria: presupuesto[1] }

  const categoriaNueva = CORREGIR_CATEGORIA.exec(norm)
  if (categoriaNueva) return { tipo: 'corregir', campo: 'categoria', valor: categoriaNueva[1] }
  const metodoNuevo = CORREGIR_METODO.exec(norm)
  if (metodoNuevo) return { tipo: 'corregir', campo: 'metodo', valor: metodoNuevo[1] }
  const montoNuevo = CORREGIR_MONTO.exec(norm)
  if (montoNuevo && parsearMonto(montoNuevo[1]) !== null) return { tipo: 'corregir', campo: 'monto', valor: parsearMonto(montoNuevo[1]) }

  let ts = tokenizar(texto)
  if (ts[0]?.norm === 'ya') ts = ts.slice(1)
  const primero = ts[0]?.norm
  const segundo = ts[1]?.norm

  // ── Ingreso: "recibí 5000 nómina", "me pagaron 3000"
  const ingresoMe = primero === 'me' && VERBOS_INGRESO_ME.has(segundo)
  if (VERBOS_INGRESO.has(primero) || ingresoMe) {
    const partes = desarmar(ts.slice(ingresoMe ? 2 : 1), { hoy, metodos: [] })
    if (!partes || partes.monto === null || partes.resto.length > MAX_PALABRAS_DESCRIPCION) return null
    return { tipo: 'ingreso', monto: partes.monto, descripcion: textoDe(partes.resto) || 'Ingreso', fecha: partes.fecha }
  }

  // ── Pago de algo ya registrado: "pagué la luz", "aboné 500 a nu"
  if (VERBOS_PAGO.has(primero)) {
    const partes = desarmar(ts.slice(1), { hoy, metodos })
    if (!partes || partes.resto.length > MAX_PALABRAS_DESCRIPCION) return null
    if (partes.resto.length === 0 && partes.monto === null) return null
    return {
      tipo: 'pago',
      objetivo: textoDe(partes.resto),
      monto: partes.monto,
      fecha: partes.fecha,
      metodo: partes.metodo,
      msi: partes.msi,
    }
  }

  // ── Gasto: "89 starbucks bbva", "ayer 200 gasolina", "3000 tele nu a 12 meses"
  if (VERBOS_GASTO.has(primero)) ts = ts.slice(1)
  const partes = desarmar(ts, { hoy, metodos })
  if (!partes || partes.monto === null || partes.resto.length > MAX_PALABRAS_DESCRIPCION) return null
  const categoria = buscarPorNombre(categorias, partes.resto.map(t => t.norm))?.item ?? null
  return {
    tipo: 'gasto',
    monto: partes.monto,
    descripcion: textoDe(partes.resto) || null,
    fecha: partes.fecha,
    metodo: partes.metodo,
    categoria,
    clasificacion: categoria?.clasificacion ?? null,
    msi: partes.msi,
  }
}

// ── Respuesta de la IA → misma forma de intención ────────────────────────────
// La salida de un modelo no es de fiar: todo se valida contra los catálogos.
const COMANDOS_IA = new Set(['ayuda', 'resumen', 'deudas', 'creditos', 'ultimos', 'deshacer', 'pendientes', 'presupuesto'])
const CLASIFICACIONES = new Set(['necesidad', 'deseo', 'ahorro'])

const porNombreExacto = (lista, nombre) => {
  const buscado = normalizar(nombre)
  if (!buscado) return null
  return (lista ?? []).find(x => normalizar(x.nombre) === buscado)
    ?? buscarPorNombre(lista, buscado.split(' '))?.item
    ?? null
}

export function intencionDesdeIA(r, { hoy, metodos = [], categorias = [] }) {
  if (!r || typeof r !== 'object') return null

  if (r.tipo === 'comando' && COMANDOS_IA.has(r.comando)) {
    return r.comando === 'presupuesto'
      ? { tipo: 'comando', comando: 'presupuesto', categoria: String(r.categoria ?? r.objetivo ?? '') }
      : { tipo: 'comando', comando: r.comando }
  }

  const monto = Number(r.monto)
  const montoValido = Number.isFinite(monto) && monto > 0 && monto <= 10_000_000
  const fecha = fechaAceptable(r.fecha, hoy) ? r.fecha : null
  const metodo = porNombreExacto(metodos, r.metodo_pago)
  const descripcion = String(r.descripcion ?? '').trim().slice(0, 120) || null
  const meses = Number(r.msi_meses)
  const msi = Number.isInteger(meses) && meses >= 2 && meses <= 60 ? meses : null

  if (r.tipo === 'ingreso' && montoValido) return { tipo: 'ingreso', monto, descripcion: descripcion ?? 'Ingreso', fecha }
  if (r.tipo === 'pago' && (r.objetivo || descripcion)) {
    return { tipo: 'pago', objetivo: String(r.objetivo ?? descripcion).trim(), monto: montoValido ? monto : null, fecha, metodo, msi }
  }
  if (r.tipo === 'gasto' && montoValido) {
    const categoria = porNombreExacto(categorias, r.categoria)
    const clasificacion = CLASIFICACIONES.has(r.clasificacion) ? r.clasificacion : categoria?.clasificacion ?? null
    return { tipo: 'gasto', monto, descripcion, fecha, metodo, categoria, clasificacion, msi }
  }
  return null
}
