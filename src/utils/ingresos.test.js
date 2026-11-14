import { describe, it, expect } from 'vitest'
import { baseMesPicker, filaIngreso, formDesdeIngreso, formNuevoIngreso, problemaIngreso } from './ingresos'

const hoy = new Date(2026, 10, 12) // 12 nov 2026

describe('formNuevoIngreso', () => {
  it('en el mes en curso sugiere hoy', () => {
    expect(formNuevoIngreso(11, 2026, hoy)).toMatchObject({ fecha_recepcion: '2026-11-12', mes: 11, anio: 2026 })
  })
  it('en otro mes sugiere su día 1, para que el ingreso aparezca en la lista que se ve', () => {
    expect(formNuevoIngreso(10, 2026, hoy)).toMatchObject({ fecha_recepcion: '2026-10-01', mes: 10, anio: 2026 })
  })
  it('del día 25 en adelante aplica al mes siguiente (también en diciembre)', () => {
    expect(formNuevoIngreso(12, 2026, new Date(2026, 11, 30))).toMatchObject({ fecha_recepcion: '2026-12-30', mes: 1, anio: 2027 })
  })
})

describe('problemaIngreso', () => {
  const completo = { concepto: 'Quincena', monto_actual: '5000', monto_presupuesto: '', fecha_recepcion: '2026-11-12' }
  it('formulario completo no tiene problema', () => expect(problemaIngreso(completo)).toBe(''))
  it('pide cada dato que falta', () => {
    expect(problemaIngreso({ ...completo, concepto: '   ' })).toMatch(/concepto/)
    expect(problemaIngreso({ ...completo, monto_actual: '0' })).toMatch(/recibiste/)
    expect(problemaIngreso({ ...completo, monto_presupuesto: '-1' })).toMatch(/esperado/)
    expect(problemaIngreso({ ...completo, fecha_recepcion: '' })).toMatch(/fecha/)
  })
})

describe('filaIngreso', () => {
  it('sin monto esperado usa el recibido y limpia textos', () => {
    expect(filaIngreso({ concepto: ' Quincena ', monto_actual: '5000', monto_presupuesto: '', fecha_recepcion: '2026-11-12', notas: '  ', mes: 11, anio: 2026 }))
      .toEqual({ concepto: 'Quincena', monto_actual: 5000, monto_presupuesto: 5000, fecha_recepcion: '2026-11-12', notas: null, mes: 11, anio: 2026 })
  })
  it('respeta un esperado de 0 y el mes elegido aunque difiera de la fecha', () => {
    expect(filaIngreso({ concepto: 'Bono', monto_actual: 800, monto_presupuesto: 0, fecha_recepcion: '2026-11-30', notas: 'extra', mes: '12', anio: '2026' }))
      .toMatchObject({ monto_presupuesto: 0, notas: 'extra', mes: 12, anio: 2026 })
  })
  it('sin mes elegido toma el de la fecha', () => {
    expect(filaIngreso({ concepto: 'x', monto_actual: 1, fecha_recepcion: '2026-03-05' })).toMatchObject({ mes: 3, anio: 2026 })
  })
})

describe('baseMesPicker', () => {
  it('se centra en el mes de la fecha cuando el elegido está a un mes o menos', () => {
    expect(baseMesPicker({ fecha_recepcion: '2026-11-30', mes: 12, anio: 2026 })).toEqual({ mes: 11, anio: 2026 })
    expect(baseMesPicker({ fecha_recepcion: '2026-12-30', mes: 1, anio: 2027 })).toEqual({ mes: 12, anio: 2026 })
  })
  it('si el elegido está más lejos (o no hay fecha) se centra en el elegido', () => {
    expect(baseMesPicker({ fecha_recepcion: '2026-08-10', mes: 11, anio: 2026 })).toEqual({ mes: 11, anio: 2026 })
    expect(baseMesPicker({ fecha_recepcion: '', mes: 11, anio: 2026 })).toEqual({ mes: 11, anio: 2026 })
  })
})

describe('formDesdeIngreso', () => {
  it('convierte nulos en campos vacíos', () => {
    expect(formDesdeIngreso({ concepto: 'a', monto_presupuesto: 1, monto_actual: 2, fecha_recepcion: null, notas: null, mes: 5, anio: 2026 }))
      .toMatchObject({ fecha_recepcion: '', notas: '' })
  })
})
