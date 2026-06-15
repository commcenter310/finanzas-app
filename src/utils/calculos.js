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

// Proyección de fin de mes: extrapola el gasto variable al ritmo actual.
// Los gastos fijos ya se conocen completos; solo se proyecta lo variable.
export const calcularProyeccion = ({
  totalTx, totalFijos, totalIngresos, ingresoEsperado, saldoArrastrado, mes, anio, hoy = new Date(),
}) => {
  const esMesActual = mes === (hoy.getMonth() + 1) && anio === hoy.getFullYear()
  const diasMes = new Date(anio, mes, 0).getDate()
  const diaActual = esMesActual ? hoy.getDate() : diasMes
  const gastoVariableProyectado = esMesActual && diaActual > 0
    ? (totalTx / diaActual) * diasMes
    : totalTx
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
