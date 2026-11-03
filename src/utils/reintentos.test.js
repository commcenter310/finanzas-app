import { describe, expect, it } from 'vitest'
import { conReintentos } from './reintentos'

const sinEspera = () => Promise.resolve()

describe('conReintentos', () => {
  it('no reintenta si el primer intento sale bien', async () => {
    let llamadas = 0
    const r = await conReintentos(async () => { llamadas++; return { data: 'ok', error: null } }, [1, 1], sinEspera)
    expect(r.data).toBe('ok')
    expect(llamadas).toBe(1)
  })

  it('reintenta hasta que sale bien', async () => {
    let llamadas = 0
    const r = await conReintentos(async () => {
      llamadas++
      return llamadas < 3 ? { data: null, error: { message: 'red' } } : { data: 'ok', error: null }
    }, [1, 1], sinEspera)
    expect(r).toEqual({ data: 'ok', error: null })
    expect(llamadas).toBe(3)
  })

  it('devuelve el error si todos los intentos fallan, esperando entre cada uno', async () => {
    const esperas = []
    let llamadas = 0
    const r = await conReintentos(async () => { llamadas++; return { data: null, error: { message: 'red' } } }, [500, 1500], async ms => { esperas.push(ms) })
    expect(r.error.message).toBe('red')
    expect(llamadas).toBe(3)
    expect(esperas).toEqual([500, 1500])
  })
})
