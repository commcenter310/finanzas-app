import { describe, it, expect } from 'vitest'
import {
  formatMXN, rangoQuincena, quincenaActual,
  parseMesesPrima, serializeMesesPrima, calcNomina, PERIODOS_ANIO,
} from './constantes'

describe('formatMXN', () => {
  it('formatea como pesos mexicanos', () => {
    expect(formatMXN(1234.5)).toContain('1,234.5')
    expect(formatMXN(1234.5)).toContain('$')
  })
  it('null/undefined → $0.00', () => {
    expect(formatMXN(null)).toContain('0.00')
    expect(formatMXN(undefined)).toContain('0.00')
  })
})

describe('rangoQuincena', () => {
  it('Q1 = días 1 al 15', () => {
    const r = rangoQuincena(6, 2026, 1)
    expect(r.diaInicio).toBe(1)
    expect(r.diaFin).toBe(15)
    expect(r.fechaInicio).toBe('2026-06-01')
    expect(r.fechaFin).toBe('2026-06-15')
  })
  it('Q2 = día 16 al último del mes (junio: 30)', () => {
    const r = rangoQuincena(6, 2026, 2)
    expect(r.diaInicio).toBe(16)
    expect(r.diaFin).toBe(30)
    expect(r.fechaFin).toBe('2026-06-30')
  })
  it('Q2 de febrero respeta los 28 días', () => {
    expect(rangoQuincena(2, 2026, 2).diaFin).toBe(28)
  })
})

describe('quincenaActual', () => {
  it('día ≤ 15 → Q1, día > 15 → Q2', () => {
    expect(quincenaActual(new Date(2026, 5, 10))).toBe(1)
    expect(quincenaActual(new Date(2026, 5, 15))).toBe(1)
    expect(quincenaActual(new Date(2026, 5, 16))).toBe(2)
    expect(quincenaActual(new Date(2026, 5, 30))).toBe(2)
  })
})

describe('parseMesesPrima / serializeMesesPrima', () => {
  it('parsea "7,12" → [7, 12]', () => {
    expect(parseMesesPrima('7,12')).toEqual([7, 12])
  })
  it('serializa [7,12] → "7,12"', () => {
    expect(serializeMesesPrima([7, 12])).toBe('7,12')
  })
  it('descarta meses fuera de rango 1-12', () => {
    expect(parseMesesPrima('0,5,13')).toEqual([5])
    expect(serializeMesesPrima([0, 5, 13])).toBe('5')
  })
  it('round-trip', () => {
    expect(parseMesesPrima(serializeMesesPrima([3, 9]))).toEqual([3, 9])
  })
  it('maneja vacío', () => {
    expect(parseMesesPrima('')).toEqual([])
    expect(serializeMesesPrima([])).toBe('')
    expect(serializeMesesPrima(null)).toBe('')
  })
})

describe('calcNomina', () => {
  it('ingreso ordinario = neto × periodos del año', () => {
    const r = calcNomina({ monto_neto: 10000, frecuencia: 'quincenal' })
    expect(r.periodos).toBe(PERIODOS_ANIO.quincenal) // 24
    expect(r.ingresoOrdinarioAnual).toBe(240000)
    expect(r.promedioMensual).toBe(20000)
  })

  it('frecuencia mensual = 12 periodos', () => {
    const r = calcNomina({ monto_neto: 20000, frecuencia: 'mensual' })
    expect(r.ingresoOrdinarioAnual).toBe(240000)
  })

  it('aguinaldo = sueldo diario × días (base/30)', () => {
    const r = calcNomina({
      monto_neto: 10000, frecuencia: 'quincenal',
      sueldo_base_mensual: 12000, tiene_aguinaldo: true, dias_aguinaldo: 15,
    })
    // sueldoDiario = 12000/30 = 400; aguinaldo = 400 * 15 = 6000
    expect(r.sueldoDiario).toBe(400)
    expect(r.aguinaldo).toBe(6000)
  })

  it('prima vacacional por evento × veces al año', () => {
    const r = calcNomina({
      monto_neto: 10000, frecuencia: 'quincenal',
      sueldo_base_mensual: 12000, tiene_prima_vacacional: true,
      dias_prima_vacacional: 6, veces_prima_al_anio: 2,
    })
    // primaPorEvento = 400 * 6 = 2400; anual = 2400 * 2 = 4800
    expect(r.primaPorEvento).toBe(2400)
    expect(r.primaAnual).toBe(4800)
  })

  it('utilidades es monto fijo', () => {
    const r = calcNomina({
      monto_neto: 10000, frecuencia: 'quincenal',
      tiene_utilidades: true, monto_utilidades: 8000,
    })
    expect(r.utilidades).toBe(8000)
  })

  it('ingreso anual total = ordinario + extraordinarios', () => {
    const r = calcNomina({
      monto_neto: 10000, frecuencia: 'quincenal', sueldo_base_mensual: 12000,
      tiene_aguinaldo: true, dias_aguinaldo: 15,            // 6000
      tiene_prima_vacacional: true, dias_prima_vacacional: 6, veces_prima_al_anio: 2, // 4800
      tiene_utilidades: true, monto_utilidades: 8000,       // 8000
    })
    expect(r.extraordinarioAnual).toBe(6000 + 4800 + 8000) // 18800
    expect(r.ingresoAnualTotal).toBe(240000 + 18800)       // 258800
  })

  it('sin prestaciones activadas no suma extraordinarios', () => {
    const r = calcNomina({
      monto_neto: 10000, frecuencia: 'quincenal', sueldo_base_mensual: 12000,
      tiene_aguinaldo: false, dias_aguinaldo: 15, // está el dato pero la bandera es false
    })
    expect(r.aguinaldo).toBe(0)
    expect(r.extraordinarioAnual).toBe(0)
  })
})
