// Traduce los códigos PAGO_* que lanzan las RPC registrar_pago_deuda /
// registrar_pago_credito (supabase-pagos-atomicos.sql) a mensajes para el usuario.
export function mensajeErrorPago(error) {
  const source = `${error?.code ?? ''} ${error?.message ?? ''}`
  if (source.includes('PAGO_MONTO_INVALIDO')) return 'Ingresa un monto mayor a $0.'
  if (source.includes('PAGO_SIN_SALDO')) return 'Esta cuenta ya no tiene saldo pendiente.'
  if (source.includes('PAGO_NO_ENCONTRADO')) return 'No encontramos la cuenta. Actualiza la página e intenta de nuevo.'
  if (source.includes('PAGO_MOVIMIENTO_NO_ENCONTRADO')) return 'No pudimos identificar el movimiento de este pago (¿cambiaste el nombre de la cuenta?). No se modificó nada.'
  if (source.includes('PAGO_CONCURRENCIA')) return 'El saldo cambió mientras pagabas. La información ya fue actualizada.'
  return 'No pudimos registrar el pago. Intenta de nuevo.'
}
