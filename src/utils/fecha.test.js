import { describe, expect, it } from 'vitest'
import {
  contextoMes, fechaLocalISO, finMesISO, inicioMesISO,
  mesAnterior, mesSiguiente, mesAplicacionIngreso, ultimosMeses,
} from './fecha'

describe('fechaLocalISO', () => {
  it('formatea fechas locales como YYYY-MM-DD', () => {
    expect(fechaLocalISO(new Date(2026, 6, 6))).toBe('2026-07-06')
  })

  it('calcula inicio y fin de mes', () => {
    expect(inicioMesISO(2, 2026)).toBe('2026-02-01')
    expect(finMesISO(2, 2026)).toBe('2026-02-28')
    expect(finMesISO(2, 2028)).toBe('2028-02-29')
  })

  it('usa el dia actual solo para proyectar el mes en curso', () => {
    const hoy = new Date(2026, 6, 14)

    expect(contextoMes(7, 2026, hoy)).toMatchObject({
      diasDelMes: 31,
      diasTranscurridos: 14,
      esMesActual: true,
    })
    expect(contextoMes(6, 2026, hoy)).toMatchObject({
      diasDelMes: 30,
      diasTranscurridos: 30,
      esMesPasado: true,
    })
    expect(contextoMes(8, 2026, hoy)).toMatchObject({
      diasDelMes: 31,
      diasTranscurridos: 0,
      esMesActual: false,
      esMesPasado: false,
    })
  })
})

describe('mesAnterior / mesSiguiente', () => {
  it('cruza el cambio de año', () => {
    expect(mesAnterior(1, 2026)).toEqual({ mes: 12, anio: 2025 })
    expect(mesAnterior(7, 2026)).toEqual({ mes: 6, anio: 2026 })
    expect(mesSiguiente(12, 2026)).toEqual({ mes: 1, anio: 2027 })
    expect(mesSiguiente(7, 2026)).toEqual({ mes: 8, anio: 2026 })
  })
})

describe('mesAplicacionIngreso', () => {
  it('sugiere el mes siguiente a partir del día 25', () => {
    expect(mesAplicacionIngreso('2026-05-24')).toEqual({ mes: 5, anio: 2026 })
    expect(mesAplicacionIngreso('2026-05-25')).toEqual({ mes: 6, anio: 2026 })
    expect(mesAplicacionIngreso('2026-12-30')).toEqual({ mes: 1, anio: 2027 })
  })
})

describe('ultimosMeses', () => {
  it('no repite meses en días 29-31 y cruza el año', () => {
    expect(ultimosMeses(3, new Date(2026, 9, 31))).toEqual([
      { mes: 8, anio: 2026 }, { mes: 9, anio: 2026 }, { mes: 10, anio: 2026 },
    ])
    expect(ultimosMeses(2, new Date(2026, 0, 30))).toEqual([
      { mes: 12, anio: 2025 }, { mes: 1, anio: 2026 },
    ])
  })
})
