import { describe, expect, it } from 'vitest'
import { construirPlanQuincena, proyectarMeses, rangoPeriodo } from './planificacion'

// Nómina quincenal de $10,000 neto → $20,000 ordinario al mes.
// Sueldo base $30,000 → $1,000 diarios; 15 días de aguinaldo en diciembre = $15,000.
const nomina = {
  nombre: 'Trabajo', frecuencia: 'quincenal', monto_neto: 10000, sueldo_base_mensual: 30000,
  tiene_aguinaldo: true, dias_aguinaldo: 15, mes_aguinaldo: 12,
}

describe('rangoPeriodo', () => {
  it('divide el mes en quincenas y respeta febrero', () => {
    expect(rangoPeriodo('q1', 2, 2026)).toMatchObject({ diaInicio: 1, diaFin: 15, fechaInicio: '2026-02-01', fechaFin: '2026-02-15' })
    expect(rangoPeriodo('q2', 2, 2026)).toMatchObject({ diaInicio: 16, diaFin: 28, fechaFin: '2026-02-28' })
    expect(rangoPeriodo('mes', 2, 2028)).toMatchObject({ diaInicio: 1, diaFin: 29, fechaInicio: '2028-02-01', fechaFin: '2028-02-29' })
  })
})

describe('construirPlanQuincena', () => {
  const base = {
    mes: 11, anio: 2026,
    hoy: new Date(2026, 10, 20), // estamos en la 2ª quincena
    gastosFijos: [
      { id: 1, concepto: 'Renta', monto_previsto: 5000, dia_cobro: 5, pagado: false },
      { id: 2, concepto: 'Luz', monto_previsto: 800, dia_cobro: 20, pagado: false },
      { id: 3, concepto: 'Gym', monto_previsto: 400, dia_cobro: null, pagado: false },
    ],
    deudas: [
      // le quedan $600: el pago sugerido no pasa del saldo
      { id: 10, nombre: 'Préstamo', pago_mensual: 1000, saldo_actual: 600, frecuencia_pago: 'mensual', fecha_proximo_pago: '2026-11-10' },
      { id: 11, nombre: 'Tienda', pago_mensual: 300, saldo_actual: 1000, frecuencia_pago: 'quincenal' },
    ],
  }

  it('1ª quincena: incluye lo que cae del 1 al 15 y lo que no tiene fecha', () => {
    const plan = construirPlanQuincena({ ...base, modo: 'q1' })
    const resumen = plan.compromisos.map(c => [c.concepto, c.montoSugerido, c.dia_cobro])
    expect(resumen).toEqual([
      ['Renta', 5000, 5],
      ['Gym', 400, null],
      ['Préstamo', 600, 10],
      ['Tienda', 300, 15],
    ])
    expect(plan.totalCompromisos).toBe(6300)
  })

  it('2ª quincena: solo lo que cae del 16 en adelante (quincenal el día 30)', () => {
    const plan = construirPlanQuincena({ ...base, modo: 'q2' })
    expect(plan.compromisos.map(c => [c.concepto, c.montoSugerido, c.dia_cobro])).toEqual([
      ['Luz', 800, 20],
      ['Tienda', 300, 30],
    ])
  })

  it('mes completo: la deuda quincenal aparece dos veces sin pasar del saldo', () => {
    const plan = construirPlanQuincena({
      ...base, modo: 'mes',
      deudas: [{ id: 11, nombre: 'Tienda', pago_mensual: 700, saldo_actual: 1000, frecuencia_pago: 'quincenal' }],
      gastosFijos: [],
    })
    expect(plan.compromisos.map(c => [c.concepto, c.montoSugerido])).toEqual([
      ['Tienda · 1ª quincena', 700],
      ['Tienda · 2ª quincena', 300],
    ])
  })

  it('usa el monto apartado (no el sugerido) y calcula lo disponible', () => {
    const plan = construirPlanQuincena({
      ...base, modo: 'q1',
      ingresos: [{ monto_presupuesto: 10000, monto_actual: 9000 }],
      apartados: [
        { id: 50, tipo: 'gasto_fijo', origen_id: 1, quincena: 1, monto: 4500, apartado: true },
        { id: 51, tipo: 'otro', origen_id: null, concepto: 'Regalo', quincena: 1, monto: 200, apartado: true },
      ],
    })
    expect(plan.compromisos.find(c => c.concepto === 'Renta').apartadoRow.id).toBe(50)
    expect(plan.compromisos.find(c => c.concepto === 'Regalo').montoSugerido).toBe(200)
    // Renta apartada 4500 + Gym 400 + Préstamo 600 + Tienda 300 + Regalo 200
    expect(plan.totalCompromisos).toBe(6000)
    expect(plan.totalApartado).toBe(4700)
    expect(plan.countApartados).toBe(2)
    expect(plan.ingresoEsperado).toBe(10000)
    expect(plan.ingresoRecibido).toBe(9000)
    expect(plan.libreSiApartasTodo).toBe(4000)
    expect(plan.disponibleAhora).toBe(5300)
  })

  it('sin ingresos registrados estima con la nómina principal (media quincena del ordinario)', () => {
    const q = construirPlanQuincena({ ...base, modo: 'q1', nominaPrincipal: nomina })
    expect(q.usandoEstimado).toBe(true)
    expect(q.ingresoEsperado).toBe(10000)
    const mes = construirPlanQuincena({ ...base, modo: 'mes', nominaPrincipal: nomina })
    expect(mes.ingresoEsperado).toBe(20000)
    const conIngresos = construirPlanQuincena({ ...base, modo: 'q1', nominaPrincipal: nomina, ingresos: [{ monto_presupuesto: 0, monto_actual: 8000 }] })
    expect(conIngresos.usandoEstimado).toBe(false)
    expect(conIngresos.ingresoEsperado).toBe(8000)
  })

  it('lo que no tiene fecha se aparta en la 1ª quincena aunque hoy sea la 2ª', () => {
    const plan = construirPlanQuincena({ ...base, modo: 'q1' })
    expect(plan.quincenaDeDia(null)).toBe(1)
    expect(plan.quincenaDeDia(10)).toBe(1)
    expect(plan.quincenaDeDia(16)).toBe(2)
    // apartados manuales (ahorro/otro) en vista de mes van a la quincena en curso
    expect(construirPlanQuincena({ ...base, modo: 'mes' }).quincenaManual).toBe(2)
  })

  it('reconoce apartados de compromisos sin fecha guardados en cualquier quincena', () => {
    const plan = construirPlanQuincena({
      ...base, modo: 'mes',
      apartados: [{ id: 60, tipo: 'gasto_fijo', origen_id: 3, quincena: 2, monto: 400, apartado: true }],
    })
    expect(plan.compromisos.find(c => c.concepto === 'Gym').apartadoRow?.id).toBe(60)
  })
})

describe('proyectarMeses', () => {
  const resultado = proyectarMeses({
    mes: 11, anio: 2026, horizonte: 3,
    nominas: [nomina],
    fijosRecurrentes: [
      { monto_previsto: 300, dia_cobro: 5 },     // 1ª quincena
      { monto_previsto: 700, dia_cobro: 20 },    // 2ª quincena
      { monto_previsto: 100, dia_cobro: null },  // sin día → 1ª
    ],
    deudas: [
      // mensual el día 20: $2,000 en nov, $1,000 en dic y liquidada
      { pago_mensual: 2000, saldo_actual: 3000, frecuencia_pago: 'mensual', fecha_proximo_pago: '2026-11-20' },
      // quincenal: 500 + 500 en nov, 200 en dic y liquidada
      { pago_mensual: 500, saldo_actual: 1200, frecuencia_pago: 'quincenal' },
    ],
  })
  const [nov, dic, ene] = resultado.meses

  it('cruza el año y separa ordinario de extraordinarios', () => {
    expect(resultado.meses.map(m => m.key)).toEqual(['2026-11', '2026-12', '2027-1'])
    expect(resultado.ordinarioMensual).toBe(20000)
    expect(resultado.fijosMensual).toBe(1100)
    expect(nov.totalExtra).toBe(0)
    expect(dic.extras).toEqual([{ concepto: 'Aguinaldo · Trabajo', monto: 15000 }])
    expect(dic.q2.ingreso).toBe(25000) // el aguinaldo cae en la 2ª quincena
    expect(dic.q1.ingreso).toBe(10000)
  })

  it('va pagando las deudas hasta liquidarlas', () => {
    expect(nov.compromisos).toBe(1100 + 2000 + 1000)
    expect(nov.q1.compromisos).toBe(400 + 500)
    expect(nov.q2.compromisos).toBe(700 + 2000 + 500)
    expect(dic.compromisos).toBe(1100 + 1000 + 200)
    expect(dic.q1.compromisos).toBe(400 + 200)
    expect(ene.compromisos).toBe(1100)
  })

  it('suma los totales del horizonte', () => {
    expect(nov.libre).toBe(20000 - 4100)
    expect(resultado.totalIngreso).toBe(20000 + 35000 + 20000)
    expect(resultado.totalCompromisos).toBe(4100 + 2300 + 1100)
    expect(resultado.totalLibre).toBe(75000 - 7500)
  })
})
