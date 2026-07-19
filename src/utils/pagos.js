import { crearOperacionId, rpcNoDisponible } from './operaciones'

const redondearDinero = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100

export function prepararPago(monto, saldo) {
  const montoSolicitado = redondearDinero(monto)
  const saldoAnterior = redondearDinero(saldo)

  if (!Number.isFinite(montoSolicitado) || montoSolicitado <= 0) {
    return { error: { code: 'PAGO_MONTO_INVALIDO', message: 'El monto debe ser mayor a cero.' } }
  }
  if (!Number.isFinite(saldoAnterior) || saldoAnterior <= 0) {
    return { error: { code: 'PAGO_SIN_SALDO', message: 'La cuenta ya no tiene saldo pendiente.' } }
  }

  const montoAplicado = Math.min(montoSolicitado, saldoAnterior)
  const saldoNuevo = redondearDinero(saldoAnterior - montoAplicado)
  return {
    montoSolicitado,
    montoAplicado,
    saldoAnterior,
    saldoNuevo,
    recortado: montoAplicado < montoSolicitado,
    liquida: saldoNuevo === 0,
  }
}

export function crearOperacionPago() {
  return crearOperacionId()
}

export function rpcPagoNoDisponible(error) {
  return rpcNoDisponible(error, ['registrar_pago_deuda', 'registrar_pago_credito'])
}

export function mensajeErrorPago(error) {
  const source = `${error?.code ?? ''} ${error?.message ?? ''}`
  if (source.includes('PAGO_MONTO_INVALIDO')) return 'Ingresa un monto mayor a $0.'
  if (source.includes('PAGO_SIN_SALDO')) return 'Esta cuenta ya no tiene saldo pendiente.'
  if (source.includes('PAGO_NO_ENCONTRADO')) return 'No encontramos la cuenta. Actualiza la página e intenta de nuevo.'
  if (source.includes('PAGO_CONCURRENCIA')) return 'El saldo cambió mientras pagabas. La información ya fue actualizada.'
  if (source.includes('PAGO_REVERSION_INCOMPLETA')) return 'El pago requiere revisión. Actualiza antes de volver a intentarlo.'
  return 'No pudimos registrar el pago. Intenta de nuevo.'
}
