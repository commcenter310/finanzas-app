import { describe, expect, it } from 'vitest'
import { fechaLocalISO, finMesISO, inicioMesISO } from './fecha'

describe('fechaLocalISO', () => {
  it('formatea fechas locales como YYYY-MM-DD', () => {
    expect(fechaLocalISO(new Date(2026, 6, 6))).toBe('2026-07-06')
  })

  it('calcula inicio y fin de mes', () => {
    expect(inicioMesISO(2, 2026)).toBe('2026-02-01')
    expect(finMesISO(2, 2026)).toBe('2026-02-28')
    expect(finMesISO(2, 2028)).toBe('2028-02-29')
  })
})
