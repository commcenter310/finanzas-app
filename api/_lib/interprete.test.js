import { describe, it, expect } from 'vitest'
import { intencionDesdeIA, interpretarLocal } from './interprete.js'

const metodos = [
  { id: 1, nombre: 'BBVA', credito_id: null },
  { id: 2, nombre: 'NU', credito_id: 7 },
  { id: 3, nombre: 'Efectivo', credito_id: null },
  { id: 4, nombre: 'Tarjeta Liverpool', credito_id: 8 },
]
const categorias = [
  { id: 10, nombre: 'Gasolina', clasificacion: 'necesidad' },
  { id: 11, nombre: 'Café', clasificacion: 'deseo' },
  { id: 12, nombre: 'Restaurante', clasificacion: 'deseo' },
]
const ctx = { hoy: '2026-11-14', metodos, categorias }
const i = (texto) => interpretarLocal(texto, ctx)

describe('comandos sin IA', () => {
  it.each([
    ['resumen', 'resumen'], ['¿Cómo voy?', 'resumen'], ['como voy este mes', 'resumen'],
    ['mis deudas', 'deudas'], ['cuánto debo', 'deudas'],
    ['tarjetas', 'creditos'], ['fecha de corte', 'creditos'],
    ['últimos gastos', 'ultimos'], ['deshacer', 'deshacer'], ['borra el último gasto', 'deshacer'],
    ['pendientes', 'pendientes'], ['qué me falta pagar', 'pendientes'],
    ['ayuda', 'ayuda'], ['Hola', 'ayuda'],
  ])('%s → %s', (texto, comando) => expect(i(texto)).toEqual({ tipo: 'comando', comando }))

  it('presupuesto con categoría', () => {
    expect(i('cuánto me queda en café')).toEqual({ tipo: 'comando', comando: 'presupuesto', categoria: 'cafe' })
  })
  it('sí / no', () => {
    expect(i('Sí')).toEqual({ tipo: 'si' })
    expect(i('cancelar')).toEqual({ tipo: 'no' })
  })
})

describe('gastos', () => {
  it('monto + concepto + método', () => {
    expect(i('89 starbucks bbva')).toEqual({
      tipo: 'gasto', monto: 89, descripcion: 'Starbucks', fecha: null,
      metodo: metodos[0], categoria: null, clasificacion: null, msi: null,
    })
  })
  it('el orden no importa y conserva acentos en la descripción', () => {
    expect(i('Tacos de asada 120 con nu')).toMatchObject({ monto: 120, descripcion: 'Tacos de asada', metodo: metodos[1] })
    expect(i('gasté $1,250.50 en súper')).toMatchObject({ monto: 1250.5, descripcion: 'Súper', metodo: null })
  })
  it('reconoce la categoría si el mensaje la nombra', () => {
    expect(i('350 gasolina costco')).toMatchObject({ descripcion: 'Gasolina costco', categoria: categorias[0], clasificacion: 'necesidad' })
    expect(i('45 café')).toMatchObject({ descripcion: 'Café', categoria: categorias[1] })
  })
  it('fecha dicha con palabras', () => {
    expect(i('ayer 200 gasolina')).toMatchObject({ monto: 200, fecha: '2026-11-13', descripcion: 'Gasolina' })
    expect(i('el lunes 120 tacos nu')).toMatchObject({ fecha: '2026-11-09', metodo: metodos[1], descripcion: 'Tacos' })
    expect(i('hace 3 días 89 café')).toMatchObject({ monto: 89, fecha: '2026-11-11' })
  })
  it('método por una palabra que lo identifica', () => {
    expect(i('900 zapatos liverpool')).toMatchObject({ metodo: metodos[3], descripcion: 'Zapatos' })
  })
  it('compras a meses', () => {
    expect(i('3000 tele nu a 12 meses')).toMatchObject({ monto: 3000, msi: 12, metodo: metodos[1], descripcion: 'Tele' })
    expect(i('6000 lavadora liverpool 6msi')).toMatchObject({ monto: 6000, msi: 6, descripcion: 'Lavadora' })
    expect(i('1200 curso a 3 meses sin intereses bbva')).toMatchObject({ monto: 1200, msi: 3, descripcion: 'Curso' })
  })
  it('solo monto y método: sin descripción', () => {
    expect(i('200 efectivo')).toMatchObject({ monto: 200, metodo: metodos[2], descripcion: null })
  })
  it('lo ambiguo o largo se deja a la IA (null)', () => {
    expect(i('2 cafés 90')).toBeNull()                       // dos números
    expect(i('le di dinero a mi hermano para la comida de su perro 300')).toBeNull()
    expect(i('cuánto gasté en comida esta semana')).toBeNull()
  })
})

describe('ingresos', () => {
  it('con verbo', () => {
    expect(i('ingresé 5000 nómina')).toEqual({ tipo: 'ingreso', monto: 5000, descripcion: 'Nómina', fecha: null })
    expect(i('me pagaron 3000 freelance ayer')).toEqual({ tipo: 'ingreso', monto: 3000, descripcion: 'Freelance', fecha: '2026-11-13' })
    expect(i('deposito 8000')).toEqual({ tipo: 'ingreso', monto: 8000, descripcion: 'Ingreso', fecha: null })
  })
})

describe('pagos de algo ya registrado', () => {
  it('gasto fijo, con o sin monto', () => {
    expect(i('pagué la luz')).toEqual({ tipo: 'pago', objetivo: 'Luz', monto: null, fecha: null, metodo: null, msi: null })
    expect(i('ya pagué la luz 470 con bbva')).toMatchObject({ objetivo: 'Luz', monto: 470, metodo: metodos[0] })
  })
  it('abono a deuda', () => {
    expect(i('aboné 1600 al celular')).toMatchObject({ tipo: 'pago', objetivo: 'Celular', monto: 1600 })
  })
})

describe('correcciones del último gasto', () => {
  it('monto', () => {
    expect(i('era 95')).toEqual({ tipo: 'corregir', campo: 'monto', valor: 95 })
    expect(i('corrige a $1,200')).toEqual({ tipo: 'corregir', campo: 'monto', valor: 1200 })
  })
  it('categoría y método', () => {
    expect(i('cambia la categoría a restaurante')).toEqual({ tipo: 'corregir', campo: 'categoria', valor: 'restaurante' })
    expect(i('fue con nu')).toEqual({ tipo: 'corregir', campo: 'metodo', valor: 'nu' })
  })
})

describe('intencionDesdeIA: no se fía del modelo', () => {
  it('gasto válido, resuelve catálogos por nombre', () => {
    expect(intencionDesdeIA({ tipo: 'gasto', monto: 300, descripcion: 'Comida del perro', categoria: 'restaurante', clasificacion: 'deseo', metodo_pago: 'bbva', fecha: '2026-11-13' }, ctx))
      .toEqual({ tipo: 'gasto', monto: 300, descripcion: 'Comida del perro', fecha: '2026-11-13', metodo: metodos[0], categoria: categorias[2], clasificacion: 'deseo', msi: null })
  })
  it('descarta montos absurdos, fechas futuras y catálogos inventados', () => {
    expect(intencionDesdeIA({ tipo: 'gasto', monto: -5, descripcion: 'x' }, ctx)).toBeNull()
    expect(intencionDesdeIA({ tipo: 'gasto', monto: 'NaN' }, ctx)).toBeNull()
    expect(intencionDesdeIA({ tipo: 'gasto', monto: 50, descripcion: 'x', categoria: 'Inventada', metodo_pago: 'Paypal', fecha: '2030-01-01', clasificacion: 'lujo', msi_meses: 500 }, ctx))
      .toEqual({ tipo: 'gasto', monto: 50, descripcion: 'x', fecha: null, metodo: null, categoria: null, clasificacion: null, msi: null })
  })
  it('comandos solo de la lista', () => {
    expect(intencionDesdeIA({ tipo: 'comando', comando: 'resumen' }, ctx)).toEqual({ tipo: 'comando', comando: 'resumen' })
    expect(intencionDesdeIA({ tipo: 'comando', comando: 'borrar_todo' }, ctx)).toBeNull()
    expect(intencionDesdeIA({ tipo: 'desconocido' }, ctx)).toBeNull()
    expect(intencionDesdeIA(null, ctx)).toBeNull()
  })
})
