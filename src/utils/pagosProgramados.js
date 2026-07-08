const MS_DIA = 24 * 60 * 60 * 1000

export const inicioDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())

export const parseFechaISO = (fecha) => {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null
  return new Date(`${fecha}T12:00:00`)
}

export const diasEnMes = (anio, mes) => new Date(anio, mes, 0).getDate()

export const fechaPorDia = (anio, mes, dia) =>
  new Date(anio, mes - 1, Math.min(Number(dia), diasEnMes(anio, mes)))

export const sumarMeses = (fecha, meses) => {
  const dia = fecha.getDate()
  const destino = new Date(fecha.getFullYear(), fecha.getMonth() + meses, 1)
  const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate()
  return new Date(destino.getFullYear(), destino.getMonth(), Math.min(dia, ultimoDia))
}

export const diffDias = (fecha, desde = new Date()) =>
  Math.round((inicioDia(fecha) - inicioDia(desde)) / MS_DIA)

export const estadoPorDias = (dias) => {
  if (dias < 0) return 'vencido'
  if (dias === 0) return 'hoy'
  if (dias <= 7) return 'pronto'
  return 'mes'
}

const inicioMes = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), 1)

const normalizarPagos = (pagos) =>
  (pagos ?? [])
    .map(p => ({
      fecha: parseFechaISO(p.fecha),
      monto: Number(p.monto ?? 0),
    }))
    .filter(p => p.fecha && p.monto > 0)
    .sort((a, b) => a.fecha - b.fecha)

export function resolverVencimientoMensual({
  fechaBaseISO = null,
  diaPago = null,
  mes = null,
  anio = null,
  pagos = [],
  montoObjetivo = null,
  saldoActual = null,
  hoy = new Date(),
  ventanaInicio = 'ciclo',
  maxCiclos = 48,
} = {}) {
  const base = fechaBaseISO
    ? parseFechaISO(fechaBaseISO)
    : diaPago
    ? fechaPorDia(anio ?? hoy.getFullYear(), mes ?? hoy.getMonth() + 1, diaPago)
    : null

  if (!base) return null

  let proximo = inicioDia(base)
  let ciclosPagados = 0
  let montoAplicado = 0
  let ultimoPago = null
  const pagosRestantes = normalizarPagos(pagos)
  const objetivoMensual = Number(montoObjetivo ?? 0)

  for (let i = 0; i < maxCiclos; i++) {
    const inicioCobertura = ventanaInicio === 'mes' ? inicioMes(proximo) : sumarMeses(proximo, -1)
    const saldo = Number(saldoActual ?? 0)
    const objetivo = objetivoMensual > 0
      ? Math.min(objetivoMensual, saldo > 0 ? saldo : objetivoMensual)
      : 0

    let cubierto = false
    let montoCiclo = 0

    if (objetivo > 0) {
      let faltante = objetivo

      for (const pago of pagosRestantes) {
        if (pago.monto <= 0 || inicioDia(pago.fecha) < inicioDia(inicioCobertura)) continue

        const usado = Math.min(pago.monto, faltante)
        pago.monto -= usado
        faltante -= usado
        montoCiclo += usado
        if (!ultimoPago || pago.fecha > ultimoPago) ultimoPago = pago.fecha
        if (faltante <= 0.005) break
      }

      cubierto = faltante <= 0.005
    } else {
      const pago = pagosRestantes.find(p =>
        p.monto > 0 && inicioDia(p.fecha) >= inicioDia(inicioCobertura)
      )
      if (pago) {
        montoCiclo = pago.monto
        pago.monto = 0
        ultimoPago = !ultimoPago || pago.fecha > ultimoPago ? pago.fecha : ultimoPago
        cubierto = true
      }
    }

    if (!cubierto) break

    ciclosPagados += 1
    montoAplicado += montoCiclo
    proximo = sumarMeses(proximo, 1)
  }

  const dias = diffDias(proximo, hoy)
  return {
    fecha: proximo,
    dias,
    estado: estadoPorDias(dias),
    ciclosPagados,
    pagadoEsteCiclo: ciclosPagados > 0,
    montoAplicado,
    ultimoPago,
  }
}
