import { describe, it, expect } from 'vitest'
import { extraerFecha, fechaAceptable, fechaLocalISO, rangoMes, sumarDias } from './fechas.js'

const HOY = '2026-11-14' // sábado
const f = (frase) => extraerFecha(frase.split(' '), HOY)

describe('fechaLocalISO', () => {
  it('usa la zona del usuario, no UTC: a las 23:30 de Mazatlán sigue siendo hoy', () => {
    const instante = new Date('2026-11-15T06:30:00Z') // 23:30 del 14 en Mazatlán (UTC−7)
    expect(fechaLocalISO(instante, 'America/Mazatlan')).toBe('2026-11-14')
    expect(fechaLocalISO(instante, 'UTC')).toBe('2026-11-15')
  })
})

describe('extraerFecha', () => {
  it('palabras relativas', () => {
    expect(f('ayer 200 gasolina')).toEqual({ fecha: '2026-11-13', inicio: 0, largo: 1 })
    expect(f('350 tacos antier').fecha).toBe('2026-11-12')
    expect(f('antes de ayer 50 pan')).toEqual({ fecha: '2026-11-12', inicio: 0, largo: 3 })
    expect(f('hace 3 dias 89 cafe')).toEqual({ fecha: '2026-11-11', inicio: 0, largo: 3 })
    expect(f('hoy 20 chicles').fecha).toBe(HOY)
  })
  it('días de la semana: el más reciente', () => {
    expect(f('el lunes 120 nu')).toEqual({ fecha: '2026-11-09', inicio: 0, largo: 2 })
    expect(f('viernes 80 cine').fecha).toBe('2026-11-13')
    expect(f('el sabado 80 cine').fecha).toBe(HOY)            // hoy es sábado
    expect(f('el sabado pasado 80 cine')).toEqual({ fecha: '2026-11-07', inicio: 0, largo: 3 })
  })
  it('fecha con mes', () => {
    expect(f('el 5 de noviembre 300 super')).toEqual({ fecha: '2026-11-05', inicio: 0, largo: 4 })
    expect(f('el 20 de diciembre 300 super').fecha).toBe('2025-12-20')   // aún no llega este año
  })
  it('sin fecha, o fecha imposible, devuelve null', () => {
    expect(f('89 starbucks')).toBeNull()
    expect(f('el 31 de febrero 100 x')).toBeNull()
    expect(f('hace 99 dias 100 x')).not.toBeNull()
  })
})

describe('utilidades', () => {
  it('sumarDias cruza meses y años', () => {
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28')
    expect(sumarDias('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('rangoMes', () => expect(rangoMes(2, 2028)).toEqual({ inicio: '2028-02-01', fin: '2028-02-29' }))
  it('fechaAceptable rechaza futuro, formato raro y más de un año', () => {
    expect(fechaAceptable('2026-11-15', HOY)).toBe(false)
    expect(fechaAceptable('14/11/2026', HOY)).toBe(false)
    expect(fechaAceptable('2025-01-01', HOY)).toBe(false)
    expect(fechaAceptable('2026-11-01', HOY)).toBe(true)
  })
})
