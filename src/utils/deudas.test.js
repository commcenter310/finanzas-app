import { describe, it, expect } from 'vitest'
import { filaDeuda } from './deudas'

describe('filaDeuda', () => {
  it('los campos opcionales vacíos van como null (un "" en fecha/número da error 400)', () => {
    expect(filaDeuda({ nombre: ' Préstamo ', saldo_actual: '1000', saldo_original: '', pago_mensual: '', frecuencia_pago: 'mensual', tasa_interes: '', fecha_proximo_pago: '', notas: '' }))
      .toEqual({ nombre: 'Préstamo', saldo_actual: 1000, saldo_original: null, pago_mensual: null, frecuencia_pago: 'mensual', tasa_interes: null, fecha_proximo_pago: null, notas: null })
  })
  it('conserva lo capturado y solo acepta quincenal o mensual', () => {
    expect(filaDeuda({ nombre: 'Auto', saldo_actual: 5000, saldo_original: '8000', pago_mensual: '750.5', frecuencia_pago: 'quincenal', tasa_interes: '12', fecha_proximo_pago: '2026-11-15', notas: ' banco ' }))
      .toEqual({ nombre: 'Auto', saldo_actual: 5000, saldo_original: 8000, pago_mensual: 750.5, frecuencia_pago: 'quincenal', tasa_interes: 12, fecha_proximo_pago: '2026-11-15', notas: 'banco' })
    expect(filaDeuda({ nombre: 'x', saldo_actual: 1, frecuencia_pago: 'semanal' }).frecuencia_pago).toBe('mensual')
  })
})
