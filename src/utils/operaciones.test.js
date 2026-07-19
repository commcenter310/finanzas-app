import { describe, expect, it } from 'vitest'
import {
  crearOperacionId,
  liberarOperacionId,
  mensajeErrorOperacion,
  obtenerOperacionId,
  rpcNoDisponible,
} from './operaciones'

describe('operaciones idempotentes', () => {
  it('genera UUID validos', () => {
    expect(crearOperacionId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('reutiliza el id mientras la firma no cambia', () => {
    const store = new Map()
    const primero = obtenerOperacionId(store, 'gasto', { monto: 100, fecha: '2026-07-18' })
    const reintento = obtenerOperacionId(store, 'gasto', { monto: 100, fecha: '2026-07-18' })
    const distinto = obtenerOperacionId(store, 'gasto', { monto: 200, fecha: '2026-07-18' })

    expect(reintento).toBe(primero)
    expect(distinto).not.toBe(primero)
  })

  it('libera una operacion confirmada', () => {
    const store = new Map()
    const primero = obtenerOperacionId(store, 7, 'firma')
    liberarOperacionId(store, 7)
    expect(obtenerOperacionId(store, 7, 'firma')).not.toBe(primero)
  })
})

describe('errores de operaciones', () => {
  it('detecta RPC pendientes de instalar sin ocultar errores reales', () => {
    expect(rpcNoDisponible({ code: 'PGRST202' }, ['registrar_transaccion_atomica'])).toBe(true)
    expect(rpcNoDisponible({ message: 'registrar_transaccion_atomica was not found in the schema cache' }, ['registrar_transaccion_atomica'])).toBe(true)
    expect(rpcNoDisponible({ code: '42501' }, ['registrar_transaccion_atomica'])).toBe(false)
  })

  it('convierte errores tecnicos en mensajes accionables', () => {
    expect(mensajeErrorOperacion({ message: 'OPERACION_PROTEGIDA' })).toContain('módulo de origen')
    expect(mensajeErrorOperacion({ code: 'OPERACION_REVERSION_INCOMPLETA' })).toContain('revertirse')
    expect(mensajeErrorOperacion({ message: 'desconocido' })).toContain('No pudimos')
  })
})
