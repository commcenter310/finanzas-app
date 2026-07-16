import { describe, expect, it } from 'vitest'
import {
  esFechaQuincenalValida,
  montoMensualProgramado,
  resolverVencimientoProgramado,
  siguienteFechaProgramada,
} from './pagosProgramados'

describe('resolverVencimientoProgramado', () => {
  it('mueve una deuda al siguiente mes cuando el abono cubre el pago mensual aunque haya sido al dia siguiente', () => {
    const r = resolverVencimientoProgramado({
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
    const r = resolverVencimientoProgramado({
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
    const r = resolverVencimientoProgramado({
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
    const r = resolverVencimientoProgramado({
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
    const r = resolverVencimientoProgramado({
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
    const r = resolverVencimientoProgramado({
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
    const r = resolverVencimientoProgramado({
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

  it('avanza una deuda quincenal del dia 15 al dia 30 del mismo mes', () => {
    const r = resolverVencimientoProgramado({
      fechaBaseISO: '2026-07-15',
      frecuencia: 'quincenal',
      pagos: [{ fecha: '2026-07-16', monto: 800 }],
      montoObjetivo: 800,
      saldoActual: 5000,
      hoy: new Date(2026, 6, 16),
      ventanaInicio: 'periodo',
    })

    expect(r.fecha.getMonth()).toBe(6)
    expect(r.fecha.getDate()).toBe(30)
    expect(r.dias).toBe(14)
    expect(r.ciclosPagados).toBe(1)
  })

  it('avanza una deuda quincenal del dia 30 al dia 15 del siguiente mes', () => {
    const r = resolverVencimientoProgramado({
      fechaBaseISO: '2026-07-30',
      frecuencia: 'quincenal',
      pagos: [{ fecha: '2026-07-30', monto: 800 }],
      montoObjetivo: 800,
      saldoActual: 5000,
      hoy: new Date(2026, 6, 30),
      ventanaInicio: 'periodo',
    })

    expect(r.fecha.getMonth()).toBe(7)
    expect(r.fecha.getDate()).toBe(15)
    expect(r.dias).toBe(16)
  })

  it('usa el ultimo dia de febrero para la segunda quincena', () => {
    const siguiente = siguienteFechaProgramada(new Date(2027, 1, 15), 'quincenal')
    expect(siguiente.getMonth()).toBe(1)
    expect(siguiente.getDate()).toBe(28)
  })

  it('no usa un pago de la primera quincena para cubrir el vencimiento del dia 30', () => {
    const r = resolverVencimientoProgramado({
      fechaBaseISO: '2026-07-30',
      frecuencia: 'quincenal',
      pagos: [{ fecha: '2026-07-15', monto: 800 }],
      montoObjetivo: 800,
      saldoActual: 5000,
      hoy: new Date(2026, 6, 20),
      ventanaInicio: 'periodo',
    })

    expect(r.fecha.getMonth()).toBe(6)
    expect(r.fecha.getDate()).toBe(30)
    expect(r.ciclosPagados).toBe(0)
  })

  it('calcula dos pagos mensuales equivalentes para una deuda quincenal', () => {
    expect(montoMensualProgramado(800, 'quincenal')).toBe(1600)
    expect(montoMensualProgramado(800, 'mensual')).toBe(800)
  })

  it('acepta los dias 15 y 30, incluyendo el ultimo dia de febrero', () => {
    expect(esFechaQuincenalValida('2026-07-15')).toBe(true)
    expect(esFechaQuincenalValida('2026-07-30')).toBe(true)
    expect(esFechaQuincenalValida('2027-02-28')).toBe(true)
    expect(esFechaQuincenalValida('2026-07-16')).toBe(false)
  })
})
