import { describe, it, expect } from 'vitest'
import { esDiaDelMes, esDiaDelMesOpcional, esMontoPositivo, textoLimpio } from './validaciones'

describe('validaciones de formularios', () => {
  it('esMontoPositivo', () => {
    expect(esMontoPositivo('120.50')).toBe(true)
    expect(esMontoPositivo(1)).toBe(true)
    for (const malo of ['', null, undefined, '0', '-5', 'abc']) expect(esMontoPositivo(malo)).toBe(false)
  })

  it('esDiaDelMes acepta 1–31 enteros', () => {
    expect(esDiaDelMes('1')).toBe(true)
    expect(esDiaDelMes(31)).toBe(true)
    for (const malo of ['', null, '0', '32', '15.5', 'x']) expect(esDiaDelMes(malo)).toBe(false)
  })

  it('esDiaDelMesOpcional: vacío vale, basura no', () => {
    expect(esDiaDelMesOpcional('')).toBe(true)
    expect(esDiaDelMesOpcional(null)).toBe(true)
    expect(esDiaDelMesOpcional('15')).toBe(true)
    expect(esDiaDelMesOpcional('40')).toBe(false)
  })

  it('textoLimpio', () => {
    expect(textoLimpio('  Renta ')).toBe('Renta')
    expect(textoLimpio(null)).toBe('')
  })
})
