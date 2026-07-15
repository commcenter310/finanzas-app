import { describe, expect, it } from 'vitest'
import { crearOperacionPago, mensajeErrorPago, prepararPago, rpcPagoNoDisponible } from './pagos'

describe('prepararPago', () => {
  it('calcula un pago parcial sin liquidar la cuenta', () => {
    expect(prepararPago(1500, 18500)).toEqual({
      montoSolicitado: 1500,
      montoAplicado: 1500,
      saldoAnterior: 18500,
      saldoNuevo: 17000,
      recortado: false,
      liquida: false,
    })
  })

  it('liquida la cuenta cuando el pago coincide con el saldo', () => {
    const pago = prepararPago(1306, 1306)
    expect(pago.saldoNuevo).toBe(0)
    expect(pago.liquida).toBe(true)
    expect(pago.recortado).toBe(false)
  })

  it('recorta un sobrepago al saldo real', () => {
    const pago = prepararPago(2000, 1306)
    expect(pago.montoAplicado).toBe(1306)
    expect(pago.saldoNuevo).toBe(0)
    expect(pago.recortado).toBe(true)
  })

  it('rechaza montos inválidos y cuentas sin saldo', () => {
    expect(prepararPago(0, 100).error.code).toBe('PAGO_MONTO_INVALIDO')
    expect(prepararPago('abc', 100).error.code).toBe('PAGO_MONTO_INVALIDO')
    expect(prepararPago(100, 0).error.code).toBe('PAGO_SIN_SALDO')
  })
})

describe('errores de pago', () => {
  it('genera identificadores UUID válidos para la idempotencia', () => {
    expect(crearOperacionPago()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('detecta cuando las RPC atómicas todavía no están instaladas', () => {
    expect(rpcPagoNoDisponible({ code: 'PGRST202' })).toBe(true)
    expect(rpcPagoNoDisponible({ code: '42501' })).toBe(false)
  })

  it('convierte errores técnicos en mensajes accionables', () => {
    expect(mensajeErrorPago({ message: 'PAGO_CONCURRENCIA' })).toContain('saldo cambió')
    expect(mensajeErrorPago({ message: 'fallo desconocido' })).toContain('No pudimos')
  })
})
