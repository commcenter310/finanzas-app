import { describe, expect, it } from 'vitest'
import { contextoMes, fechaLocalISO, finMesISO, inicioMesISO } from './fecha'

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
