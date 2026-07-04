import { describe, it, expect } from 'vitest'
import {
  sumarTransaccionesSinFijos, calcularTotalGastos, calcularSaldoAnterior,
  calcularSaldoArrastrado, calcularPorAsignar, calcularGastosHormiga,
  calcularIngresoEsperado, calcularProyeccion, diasHastaDiaDelMes,
  cortesRecientes, calcularEstadoTarjeta,
} from './calculos'

describe('sumarTransaccionesSinFijos', () => {
  it('excluye las transacciones con origen gastos_fijos (evita doble conteo)', () => {
    const tx = [
      { monto: 100, origen: 'manual' },
      { monto: 200, origen: 'gastos_fijos' }, // no debe contar
      { monto: 50,  origen: 'whatsapp' },
    ]
    expect(sumarTransaccionesSinFijos(tx)).toBe(150)
  })
  it('incluye deuda y ahorro (no se duplican en el dashboard)', () => {
    const tx = [{ monto: 100, origen: 'deuda' }, { monto: 300, origen: 'ahorro' }]
    expect(sumarTransaccionesSinFijos(tx)).toBe(400)
  })
  it('maneja null/undefined', () => {
    expect(sumarTransaccionesSinFijos(null)).toBe(0)
    expect(sumarTransaccionesSinFijos(undefined)).toBe(0)
    expect(sumarTransaccionesSinFijos([])).toBe(0)
  })
})

describe('calcularTotalGastos', () => {
  it('suma fijos (monto_actual) + transacciones variables', () => {
    const fijos = [{ monto_actual: 1000 }, { monto_actual: 500 }]
    const tx = [{ monto: 200, origen: 'manual' }, { monto: 300, origen: 'gastos_fijos' }]
    const r = calcularTotalGastos(fijos, tx)
    expect(r.totalFijos).toBe(1500)
    expect(r.totalTx).toBe(200) // excluye el origen gastos_fijos
    expect(r.totalGastos).toBe(1700)
  })
  it('arranca en 0 sin datos', () => {
    expect(calcularTotalGastos(null, null)).toEqual({ totalFijos: 0, totalTx: 0, totalGastos: 0 })
  })
})

describe('calcularSaldoAnterior', () => {
  it('devuelve null cuando no hay ningún dato del mes anterior', () => {
    expect(calcularSaldoAnterior(undefined, undefined, undefined)).toBeNull()
  })
  it('positivo cuando sobró dinero', () => {
    const saldo = calcularSaldoAnterior(
      [{ monto_actual: 10000 }], [{ monto_actual: 3000 }], [{ monto: 2000, origen: 'manual' }]
    )
    expect(saldo).toBe(5000) // 10000 - 3000 - 2000
  })
  it('negativo cuando se gastó de más', () => {
    const saldo = calcularSaldoAnterior([{ monto_actual: 1000 }], [], [{ monto: 1500, origen: 'manual' }])
    expect(saldo).toBe(-500)
  })
  it('excluye gastos_fijos del mes anterior para no duplicar', () => {
    const saldo = calcularSaldoAnterior(
      [{ monto_actual: 5000 }], [{ monto_actual: 1000 }],
      [{ monto: 1000, origen: 'gastos_fijos' }, { monto: 500, origen: 'manual' }]
    )
    expect(saldo).toBe(3500) // 5000 - 1000 - 500 (el de gastos_fijos no cuenta)
  })
})

describe('calcularSaldoArrastrado', () => {
  it('solo arrastra saldo positivo', () => {
    expect(calcularSaldoArrastrado(5000)).toBe(5000)
    expect(calcularSaldoArrastrado(-500)).toBe(0) // no se heredan deudas
    expect(calcularSaldoArrastrado(null)).toBe(0)
  })
})

describe('calcularPorAsignar', () => {
  it('null cuando no hay ingresos ni saldo anterior (evita negativo engañoso)', () => {
    expect(calcularPorAsignar({ totalIngresos: 0, totalGastos: 0, saldoAnterior: null })).toBeNull()
  })
  it('ingresos − gastos + saldo positivo arrastrado', () => {
    expect(calcularPorAsignar({ totalIngresos: 10000, totalGastos: 4000, saldoAnterior: 2000 })).toBe(8000)
  })
  it('no arrastra el déficit del mes anterior', () => {
    // saldoAnterior negativo no resta; solo cuentan ingresos − gastos
    expect(calcularPorAsignar({ totalIngresos: 10000, totalGastos: 4000, saldoAnterior: -3000 })).toBe(6000)
  })
  it('puede ser negativo si gastas más de lo que entró este mes', () => {
    expect(calcularPorAsignar({ totalIngresos: 5000, totalGastos: 8000, saldoAnterior: 0 })).toBe(-3000)
  })
})

describe('calcularGastosHormiga', () => {
  const tx = [
    { monto: 50,  clasificacion: 'deseo' },      // hormiga
    { monto: 50,  clasificacion: 'necesidad' },  // NO (medicina barata)
    { monto: 200, clasificacion: 'deseo' },      // NO (sobre el umbral)
    { monto: 30,  clasificacion: 'deseo' },      // hormiga
  ]
  it('solo cuenta deseos bajo el umbral', () => {
    const r = calcularGastosHormiga(tx, 100)
    expect(r.count).toBe(2)
    expect(r.total).toBe(80)
    expect(r.umbral).toBe(100)
  })
  it('una necesidad barata no es hormiga', () => {
    const r = calcularGastosHormiga([{ monto: 50, clasificacion: 'necesidad' }], 100)
    expect(r.count).toBe(0)
  })
})

describe('calcularIngresoEsperado', () => {
  it('null sin nóminas configuradas', () => {
    expect(calcularIngresoEsperado([], 6)).toBeNull()
    expect(calcularIngresoEsperado(null, 6)).toBeNull()
  })
  it('ordinario: neto quincenal × 24 / 12', () => {
    const nominas = [{ monto_neto: 10000, frecuencia: 'quincenal', tipo: 'sueldo' }]
    // 10000 * 24 / 12 = 20000 mensual
    expect(calcularIngresoEsperado(nominas, 6)).toBe(20000)
  })
  it('suma aguinaldo solo en su mes', () => {
    const nominas = [{
      monto_neto: 10000, frecuencia: 'quincenal', tipo: 'sueldo',
      sueldo_base_mensual: 12000, tiene_aguinaldo: true, dias_aguinaldo: 15, mes_aguinaldo: 12,
    }]
    const sinAguinaldo = calcularIngresoEsperado(nominas, 6)  // junio: sin aguinaldo
    const conAguinaldo = calcularIngresoEsperado(nominas, 12) // diciembre: con aguinaldo
    expect(conAguinaldo).toBeGreaterThan(sinAguinaldo)
    // aguinaldo = (12000/30) * 15 = 6000
    expect(conAguinaldo - sinAguinaldo).toBe(6000)
  })
})

describe('diasHastaDiaDelMes', () => {
  it('mismo mes: del 15 al 20 son 5 días', () => {
    expect(diasHastaDiaDelMes(20, new Date(2026, 5, 15))).toBe(5) // jun 2026
  })
  it('cruce de mes con calendario real: 31 ene → día 1 es 1 día (no 0 ni negativo)', () => {
    expect(diasHastaDiaDelMes(1, new Date(2026, 0, 31))).toBe(1) // ene 31 → feb 1
  })
  it('febrero: pago día 30 y hoy es 28 feb → el pago cae hoy (último día del mes)', () => {
    // Convención bancaria: si el día no existe en el mes, se recorre al último día
    expect(diasHastaDiaDelMes(30, new Date(2026, 1, 28))).toBe(0) // feb 2026 tiene 28
  })
  it('día 31 en mes de 30 días → clampa al último día del mes', () => {
    expect(diasHastaDiaDelMes(31, new Date(2026, 5, 15))).toBe(15) // jun 15 → jun 30
  })
  it('el bug viejo: hoy 31, pago día 1 → con fórmula "30-hoy+dia" daba 0; real es 1', () => {
    // Fórmula vieja: 30 - 31 + 1 = 0 ❌ · Real: mañana = 1 ✓
    expect(diasHastaDiaDelMes(1, new Date(2026, 6, 31))).toBe(1) // jul 31 → ago 1
  })
  it('null → null (sin fecha configurada, no NaN)', () => {
    expect(diasHastaDiaDelMes(null)).toBeNull()
  })
})

describe('cortesRecientes', () => {
  it('hoy después del corte del mes → último corte es este mes', () => {
    // corte día 15, hoy 20 jun 2026
    const { cortePrevio, ultimoCorte, proximoCorte } = cortesRecientes(15, new Date(2026, 5, 20))
    expect(ultimoCorte.getDate()).toBe(15)
    expect(ultimoCorte.getMonth()).toBe(5)  // junio
    expect(cortePrevio.getMonth()).toBe(4)  // mayo
    expect(proximoCorte.getMonth()).toBe(6) // julio
  })
  it('hoy antes del corte del mes → último corte fue el mes pasado', () => {
    const { ultimoCorte, proximoCorte } = cortesRecientes(15, new Date(2026, 5, 10))
    expect(ultimoCorte.getMonth()).toBe(4)  // mayo
    expect(proximoCorte.getMonth()).toBe(5) // junio
  })
  it('corte día 31 en meses cortos → clampa al último día (feb 28)', () => {
    const { ultimoCorte } = cortesRecientes(31, new Date(2026, 2, 5)) // 5 mar 2026
    expect(ultimoCorte.getMonth()).toBe(1)   // febrero
    expect(ultimoCorte.getDate()).toBe(28)   // feb 2026 tiene 28
  })
})

describe('calcularEstadoTarjeta', () => {
  // Escenario base: corte día 15, hoy 20 jun 2026
  // → cortePrevio 15 may · ultimoCorte 15 jun · proximoCorte 15 jul
  const hoy = new Date(2026, 5, 20)

  it('compra normal del periodo cerrado → va al pago próximo', () => {
    const r = calcularEstadoTarjeta({
      transaccionesTarjeta: [{ monto: 1000, fecha: '2026-06-01' }],
      diaCorte: 15, hoy,
    })
    expect(r.pagoProximo).toBe(1000)
    expect(r.gastoPeriodoActual).toBe(0)
  })

  it('compra después del último corte → va al periodo actual, no al pago', () => {
    const r = calcularEstadoTarjeta({
      transaccionesTarjeta: [{ monto: 800, fecha: '2026-06-18' }],
      diaCorte: 15, hoy,
    })
    expect(r.pagoProximo).toBe(0)
    expect(r.gastoPeriodoActual).toBe(800)
  })

  it('la compra DEL día del corte entra al periodo que cierra', () => {
    const r = calcularEstadoTarjeta({
      transaccionesTarjeta: [{ monto: 500, fecha: '2026-06-15' }],
      diaCorte: 15, hoy,
    })
    expect(r.pagoProximo).toBe(500)
  })

  it('MSI: solo la mensualidad va al pago, el resto queda pendiente', () => {
    // 6000 a 6 MSI comprado el 1 jun → 1ª mensualidad facturada al corte del 15 jun
    const r = calcularEstadoTarjeta({
      transaccionesTarjeta: [{ monto: 6000, fecha: '2026-06-01', msi_meses: 6 }],
      diaCorte: 15, hoy,
    })
    expect(r.pagoProximo).toBe(1000)          // 6000/6
    expect(r.gastoPeriodoActual).toBe(1000)   // 2ª mensualidad al corte de julio
    expect(r.msiPendiente).toBe(5000)         // faltan 5 mensualidades
    expect(r.msiActivos).toBe(1)
  })

  it('MSI comprado en el periodo abierto → primera mensualidad hasta el próximo corte', () => {
    const r = calcularEstadoTarjeta({
      transaccionesTarjeta: [{ monto: 3000, fecha: '2026-06-18', msi_meses: 3 }],
      diaCorte: 15, hoy,
    })
    expect(r.pagoProximo).toBe(0)
    expect(r.gastoPeriodoActual).toBe(1000)
    expect(r.msiPendiente).toBe(3000)         // aún no se factura ninguna
  })

  it('MSI ya terminado no suma nada', () => {
    // 3 MSI comprado en enero → facturado en cortes de ene/feb/mar; en junio ya no vive
    const r = calcularEstadoTarjeta({
      transaccionesTarjeta: [{ monto: 3000, fecha: '2026-01-02', msi_meses: 3 }],
      diaCorte: 15, hoy,
    })
    expect(r.pagoProximo).toBe(0)
    expect(r.gastoPeriodoActual).toBe(0)
    expect(r.msiPendiente).toBe(0)
    expect(r.msiActivos).toBe(0)
  })

  it('mezcla: normal + MSI se suman al pago del corte', () => {
    const r = calcularEstadoTarjeta({
      transaccionesTarjeta: [
        { monto: 1200, fecha: '2026-06-05' },                 // normal, periodo cerrado
        { monto: 6000, fecha: '2026-05-20', msi_meses: 6 },   // MSI: 1ª mensualidad al corte del 15 jun
        { monto: 400,  fecha: '2026-06-17' },                 // normal, periodo abierto
      ],
      diaCorte: 15, hoy,
    })
    expect(r.pagoProximo).toBe(1200 + 1000)
    expect(r.gastoPeriodoActual).toBe(400 + 1000)
    expect(r.msiPendiente).toBe(5000) // facturada 1 de 6 al último corte
  })

  it('sin día de corte configurado → null', () => {
    expect(calcularEstadoTarjeta({ transaccionesTarjeta: [], diaCorte: null })).toBeNull()
  })
})

describe('calcularProyeccion', () => {
  it('en mes pasado no proyecta, usa el gasto real', () => {
    // hoy fijo en julio; proyectamos junio (mes pasado)
    const hoy = new Date(2026, 6, 10) // 10 jul 2026
    const r = calcularProyeccion({
      totalTx: 3000, totalFijos: 2000, totalIngresos: 10000,
      ingresoEsperado: null, saldoArrastrado: 0, mes: 6, anio: 2026, hoy,
    })
    expect(r.esMesActual).toBe(false)
    expect(r.gastoProyectado).toBe(5000) // 2000 fijos + 3000 tx reales (sin extrapolar)
    expect(r.saldoProyectado).toBe(5000) // 10000 - 5000
  })
  it('en mes actual extrapola el gasto variable al ritmo del día', () => {
    const hoy = new Date(2026, 5, 15) // 15 jun, mes de 30 días
    const r = calcularProyeccion({
      totalTx: 1500, totalFijos: 2000, totalIngresos: 20000,
      ingresoEsperado: null, saldoArrastrado: 0, mes: 6, anio: 2026, hoy,
    })
    expect(r.esMesActual).toBe(true)
    expect(r.diaActual).toBe(15)
    expect(r.diasMes).toBe(30)
    // gasto variable proyectado = 1500 / 15 * 30 = 3000; + 2000 fijos = 5000
    expect(r.gastoProyectado).toBe(5000)
    expect(r.saldoProyectado).toBe(15000) // 20000 - 5000
  })
  it('usa ingresoEsperado si es mayor que lo registrado', () => {
    const hoy = new Date(2026, 5, 30)
    const r = calcularProyeccion({
      totalTx: 0, totalFijos: 0, totalIngresos: 10000,
      ingresoEsperado: 20000, saldoArrastrado: 0, mes: 6, anio: 2026, hoy,
    })
    expect(r.saldoProyectado).toBe(20000) // usa esperado (20000), no registrado (10000)
  })
  it('saldoProyectado null si no hay base de ingreso', () => {
    const hoy = new Date(2026, 5, 15)
    const r = calcularProyeccion({
      totalTx: 100, totalFijos: 0, totalIngresos: 0,
      ingresoEsperado: null, saldoArrastrado: 0, mes: 6, anio: 2026, hoy,
    })
    expect(r.saldoProyectado).toBeNull()
  })
})
