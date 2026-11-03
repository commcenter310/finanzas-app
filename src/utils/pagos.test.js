import { describe, expect, it } from 'vitest'
import { mensajeErrorPago } from './pagos'

describe('mensajeErrorPago', () => {
  it('convierte errores técnicos en mensajes accionables', () => {
    expect(mensajeErrorPago({ message: 'PAGO_CONCURRENCIA' })).toContain('saldo cambió')
    expect(mensajeErrorPago({ message: 'PAGO_SIN_SALDO' })).toContain('ya no tiene saldo')
    expect(mensajeErrorPago({ message: 'PAGO_MOVIMIENTO_NO_ENCONTRADO' })).toContain('No se modificó nada')
    expect(mensajeErrorPago({ message: 'fallo desconocido' })).toContain('No pudimos')
  })
})
