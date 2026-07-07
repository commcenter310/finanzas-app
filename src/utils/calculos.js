// Lógica de cálculo de dinero, extraída como funciones puras para poder testearla.
// Aquí viven los cálculos que históricamente han tenido bugs de doble conteo.
import { calcNomina, parseMesesPrima } from './constantes'

// Suma de transacciones EXCLUYENDO las auto-generadas por gastos fijos.
// Los gastos fijos ya se cuentan por su lado; sin este filtro se duplicarían.
export const sumarTransaccionesSinFijos = (transacciones) =>
  (transacciones ?? [])
    .filter(t => t.origen !== 'gastos_fijos')
    .reduce((s, t) => s + Number(t.monto), 0)

// Total de gastos del mes = gastos fijos (monto real) + transacciones variables.
export const calcularTotalGastos = (gastosFijos, transacciones) => {
  const totalFijos = (gastosFijos ?? []).reduce((s, g) => s + Number(g.monto_actual ?? 0), 0)
  const totalTx = sumarTransaccionesSinFijos(transacciones)
  return { totalFijos, totalTx, totalGastos: totalFijos + totalTx }
}

// Saldo del mes anterior: positivo = sobró dinero, negativo = se gastó de más.
// Devuelve null cuando no hay ningún dato del mes anterior (para distinguir "sin datos" de 0).
export const calcularSaldoAnterior = (ingresosPrev, gastosFijosPrev, transaccionesPrev) => {
  if (!ingresosPrev && !gastosFijosPrev && !transaccionesPrev) return null
  const prevIng   = (ingresosPrev ?? []).reduce((s, i) => s + Number(i.monto_actual), 0)
  const prevFijos = (gastosFijosPrev ?? []).reduce((s, g) => s + Number(g.monto_actual), 0)
  const prevTx    = sumarTransaccionesSinFijos(transaccionesPrev)
  return prevIng - prevFijos - prevTx
}

// Solo arrastramos saldo POSITIVO (no se heredan deudas del mes anterior).
export const calcularSaldoArrastrado = (saldoAnterior) =>
  saldoAnterior !== null && saldoAnterior > 0 ? saldoAnterior : 0

// Dinero "Por Asignar" = saldo arrastrado + ingresos − gastos.
// Devuelve null si no hay ingresos ni saldo anterior, para no mostrar un negativo engañoso.
export const calcularPorAsignar = ({ totalIngresos, totalGastos, saldoAnterior }) => {
  const saldoArrastrado = calcularSaldoArrastrado(saldoAnterior)
  const sinDatos = totalIngresos === 0 && saldoAnterior === null
  return sinDatos ? null : saldoArrastrado + totalIngresos - totalGastos
}

// Gastos hormiga: solo cuentan los de clasificación 'deseo' bajo el umbral.
// Una medicina de $50 (necesidad) NO es hormiga; un café de $50 (deseo) SÍ.
export const calcularGastosHormiga = (transacciones, umbral) => {
  const tx = (transacciones ?? []).filter(
    t => Number(t.monto) <= umbral && t.clasificacion === 'deseo'
  )
  return {
    count: tx.length,
    total: tx.reduce((s, t) => s + Number(t.monto), 0),
    umbral,
  }
}

// Ingreso esperado del mes según las nóminas configuradas.
// null = sin nóminas. Incluye extraordinarios (aguinaldo/prima/utilidades) que caen en el mes.
export const calcularIngresoEsperado = (nominas, mes) => {
  const noms = nominas ?? []
  if (noms.length === 0) return null
  let total = noms.reduce((s, n) => s + calcNomina(n).ingresoOrdinarioAnual / 12, 0)
  noms.forEach(n => {
    const c = calcNomina(n)
    if (n.tiene_aguinaldo && n.mes_aguinaldo === mes) total += c.aguinaldo
    if (n.tiene_prima_vacacional && parseMesesPrima(n.meses_prima).includes(mes)) total += c.primaPorEvento
    if (n.tiene_utilidades && n.mes_utilidades === mes) total += c.utilidades
  })
  return total
}

// Días reales hasta la próxima ocurrencia de un día del mes (ej. "día 30 de pago").
// Usa el calendario real: meses de 28/29/30/31 días. Si el día objetivo no existe
// en el mes (ej. día 31 en junio), se recorre al último día de ese mes.
export const diasHastaDiaDelMes = (diaObjetivo, desde = new Date()) => {
  if (diaObjetivo == null) return null
  const hoy = desde.getDate()
  const diasEsteMes = new Date(desde.getFullYear(), desde.getMonth() + 1, 0).getDate()
  if (diaObjetivo >= hoy) {
    return Math.min(diaObjetivo, diasEsteMes) - hoy
  }
  const diasProxMes = new Date(desde.getFullYear(), desde.getMonth() + 2, 0).getDate()
  return (diasEsteMes - hoy) + Math.min(diaObjetivo, diasProxMes)
}

// ── Ciclo de corte de tarjetas de crédito ────────────────────────────────────

// Fecha real del corte en un mes dado (día 31 en junio → 30, convención bancaria)
const fechaCorteEnMes = (anio, mesIdx0, diaCorte) => {
  const dias = new Date(anio, mesIdx0 + 1, 0).getDate()
  return new Date(anio, mesIdx0, Math.min(diaCorte, dias))
}

// Los tres cortes relevantes: el previo, el último ocurrido y el próximo
export const cortesRecientes = (diaCorte, hoy = new Date()) => {
  let corte = fechaCorteEnMes(hoy.getFullYear(), hoy.getMonth(), diaCorte)
  if (corte > hoy) corte = fechaCorteEnMes(hoy.getFullYear(), hoy.getMonth() - 1, diaCorte)
  const cortePrevio  = fechaCorteEnMes(corte.getFullYear(), corte.getMonth() - 1, diaCorte)
  const proximoCorte = fechaCorteEnMes(corte.getFullYear(), corte.getMonth() + 1, diaCorte)
  return { cortePrevio, ultimoCorte: corte, proximoCorte }
}

// Estado del ciclo de una tarjeta a partir de sus compras.
// Modelo "totalero" (pagas completo cada mes, sin intereses ni saldo arrastrado):
// - Compra normal: se factura en el periodo (cortePrevio, corte] donde cae su fecha.
// - Compra a MSI (msi_meses = N): se factura monto/N en N cortes consecutivos,
//   empezando en el primer corte >= fecha de compra.
// Devuelve:
//   pagoProximo        → lo facturado al último corte (lo que pagas el día de pago)
//   gastoPeriodoActual → lo que llevas acumulado para el PRÓXIMO corte
//   msiPendiente       → suma de mensualidades MSI que faltan por facturar
//   msiActivos         → cuántas compras MSI siguen vivas
export const calcularEstadoTarjeta = ({ transaccionesTarjeta = [], diaCorte, hoy = new Date() }) => {
  if (!diaCorte) return null
  const { cortePrevio, ultimoCorte, proximoCorte } = cortesRecientes(diaCorte, hoy)
  // Mediodía para esquivar desfases de zona horaria al parsear 'YYYY-MM-DD'
  const aFecha = (s) => new Date(`${s}T12:00:00`)
  // Comparaciones con granularidad de DÍA (la hora no importa en cortes)
  const ymd = (d) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
  const mesesEntre = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())

  let pagoProximo = 0, gastoPeriodoActual = 0, msiPendiente = 0, msiActivos = 0

  for (const t of transaccionesTarjeta) {
    const f = aFecha(t.fecha)
    const monto = Number(t.monto)
    const n = t.msi_meses && Number(t.msi_meses) > 1 ? Number(t.msi_meses) : null

    if (!n) {
      if (ymd(f) > ymd(cortePrevio) && ymd(f) <= ymd(ultimoCorte)) pagoProximo += monto
      else if (ymd(f) > ymd(ultimoCorte) && ymd(f) <= ymd(proximoCorte)) gastoPeriodoActual += monto
      continue
    }

    // MSI: primer corte que la factura
    const mensualidad = monto / n
    let primerCorte = fechaCorteEnMes(f.getFullYear(), f.getMonth(), diaCorte)
    if (ymd(primerCorte) < ymd(f)) primerCorte = fechaCorteEnMes(f.getFullYear(), f.getMonth() + 1, diaCorte)

    // ¿El último corte facturó una mensualidad? (índice 1..N)
    const idxUltimo = mesesEntre(primerCorte, ultimoCorte) + 1
    if (primerCorte <= ultimoCorte && idxUltimo >= 1 && idxUltimo <= n) pagoProximo += mensualidad

    // ¿El próximo corte facturará una?
    const idxProximo = mesesEntre(primerCorte, proximoCorte) + 1
    if (primerCorte <= proximoCorte && idxProximo >= 1 && idxProximo <= n) gastoPeriodoActual += mensualidad

    // Mensualidades que faltan después del último corte
    const facturadas = primerCorte <= ultimoCorte ? Math.min(Math.max(idxUltimo, 0), n) : 0
    const restantes = n - facturadas
    if (restantes > 0) { msiPendiente += restantes * mensualidad; msiActivos += 1 }
  }

  return { pagoProximo, gastoPeriodoActual, msiPendiente, msiActivos, ultimoCorte, proximoCorte }
}

// Proyección de fin de mes. Los gastos fijos se toman completos (ya se conocen);
// lo variable se proyecta con dos correcciones anti-drama:
// 1. MSI: una compra a N meses pesa solo su mensualidad (monto/N), no el total —
//    en efectivo eso es lo que realmente sale este mes.
// 2. Suavizado: lo YA gastado queda fijo (no se re-extrapola) y el ritmo diario
//    para los días restantes se calcula SIN el gasto más grande del mes — así
//    una compra única fuerte no se multiplica como si fuera a repetirse a diario.
export const calcularProyeccion = ({
  transaccionesVariables = [], totalFijos, totalIngresos, ingresoEsperado, saldoArrastrado, mes, anio, hoy = new Date(),
}) => {
  const esMesActual = mes === (hoy.getMonth() + 1) && anio === hoy.getFullYear()
  const diasMes = new Date(anio, mes, 0).getDate()
  const diaActual = esMesActual ? hoy.getDate() : diasMes

  // Peso "en efectivo" de cada gasto: MSI cuenta solo la mensualidad
  const pesoEfectivo = (t) =>
    t.msi_meses && Number(t.msi_meses) > 1 ? Number(t.monto) / Number(t.msi_meses) : Number(t.monto)
  const montos = transaccionesVariables.map(pesoEfectivo)
  const gastadoVariable = montos.reduce((s, m) => s + m, 0)

  // Ritmo diario recortado: se excluye el gasto más grande (outlier/one-off)
  const mayorGasto = montos.length ? Math.max(...montos) : 0
  const ritmoDiario = esMesActual && diaActual > 0
    ? Math.max(0, gastadoVariable - mayorGasto) / diaActual
    : 0
  const gastoVariableProyectado = esMesActual
    ? gastadoVariable + ritmoDiario * (diasMes - diaActual)
    : gastadoVariable

  const gastoProyectado = totalFijos + gastoVariableProyectado
  const baseIngreso = ingresoEsperado != null && ingresoEsperado > totalIngresos
    ? ingresoEsperado
    : totalIngresos
  const hayBase = baseIngreso > 0 || saldoArrastrado > 0
  return {
    esMesActual,
    diaActual,
    diasMes,
    gastoProyectado,
    saldoProyectado: hayBase ? saldoArrastrado + baseIngreso - gastoProyectado : null,
  }
}
