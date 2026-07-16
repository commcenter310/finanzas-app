import { describe, expect, it } from 'vitest'
import { resolverVencimientoMensual } from './pagosProgramados'

describe('resolverVencimientoMensual', () => {
  it('mueve una deuda al siguiente mes cuando el abono cubre el pago mensual aunque haya sido al dia siguiente', () => {
    const r = resolverVencimientoMensual({
      fechaBaseISO: '2026-06-30',
      pagos: [{ fecha: '2026-07-01', monto: 1500 }],
      montoObjetivo: 1500,
      saldoActual: 18500,
      hoy: new Date(2026, 6, 8),
      ventanaInicio: 'mes',
    })

    expect(r.fecha.getFullYear()).toBe(2026)
    expect(r.fecha.getMonth()).toBe(6)
    expect(r.fecha.getDate()).toBe(30)
    expect(r.estado).toBe('mes')
    expect(r.dias).toBe(22)
  })

  it('mantiene vencida una deuda si el pago registrado no cubre la mensualidad', () => {
    const r = resolverVencimientoMensual({
      fechaBaseISO: '2026-06-30',
      pagos: [{ fecha: '2026-07-01', monto: 500 }],
      montoObjetivo: 1500,
      saldoActual: 18500,
      hoy: new Date(2026, 6, 8),
      ventanaInicio: 'mes',
    })

    expect(r.fecha.getMonth()).toBe(5)
    expect(r.fecha.getDate()).toBe(30)
    expect(r.estado).toBe('vencido')
  })

  it('un pago grande puede cubrir mas de un ciclo mensual', () => {
    const r = resolverVencimientoMensual({
      fechaBaseISO: '2026-06-15',
      pagos: [{ fecha: '2026-07-01', monto: 3000 }],
      montoObjetivo: 1500,
      saldoActual: 18500,
      hoy: new Date(2026, 6, 8),
      ventanaInicio: 'mes',
    })

    expect(r.fecha.getMonth()).toBe(7)
    expect(r.fecha.getDate()).toBe(15)
    expect(r.ciclosPagados).toBe(2)
  })

  it('no vuelve a contar el pago del mes anterior si la fecha guardada ya es el siguiente vencimiento', () => {
    const r = resolverVencimientoMensual({
      fechaBaseISO: '2026-07-15',
      pagos: [
        { fecha: '2026-06-17', monto: 653 },
        { fecha: '2026-07-16', monto: 653 },
      ],
      montoObjetivo: 653,
      saldoActual: 653,
      hoy: new Date(2026, 6, 16),
      ventanaInicio: 'mes',
    })

    expect(r.fecha.getFullYear()).toBe(2026)
    expect(r.fecha.getMonth()).toBe(7)
    expect(r.fecha.getDate()).toBe(15)
    expect(r.dias).toBe(30)
    expect(r.ciclosPagados).toBe(1)
  })

  it('no adelanta una fecha futura con un pago que pertenece al mes anterior', () => {
    const r = resolverVencimientoMensual({
      fechaBaseISO: '2026-08-15',
      pagos: [{ fecha: '2026-07-16', monto: 653 }],
      montoObjetivo: 653,
      saldoActual: 653,
      hoy: new Date(2026, 6, 16),
      ventanaInicio: 'mes',
    })

    expect(r.fecha.getMonth()).toBe(7)
    expect(r.fecha.getDate()).toBe(15)
    expect(r.dias).toBe(30)
    expect(r.ciclosPagados).toBe(0)
  })

  it('para tarjetas, un pago en el mes del vencimiento mueve el recordatorio al siguiente mes', () => {
    const r = resolverVencimientoMensual({
      diaPago: 15,
      mes: 7,
      anio: 2026,
      pagos: [{ fecha: '2026-07-01', monto: 1000 }],
      hoy: new Date(2026, 6, 8),
      ventanaInicio: 'mes',
    })

    expect(r.fecha.getMonth()).toBe(7)
    expect(r.fecha.getDate()).toBe(15)
    expect(r.ciclosPagados).toBe(1)
  })

  it('para tarjetas, un pago del mes anterior no cubre automaticamente el mes actual', () => {
    const r = resolverVencimientoMensual({
      diaPago: 15,
      mes: 7,
      anio: 2026,
      pagos: [{ fecha: '2026-06-20', monto: 1000 }],
      hoy: new Date(2026, 6, 8),
      ventanaInicio: 'mes',
    })

    expect(r.fecha.getMonth()).toBe(6)
    expect(r.fecha.getDate()).toBe(15)
    expect(r.ciclosPagados).toBe(0)
  })
})
