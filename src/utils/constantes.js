export const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

export const CLASIFICACIONES = [
  { value: 'necesidad', label: 'Necesidad', color: 'necesidad', emoji: '🔵' },
  { value: 'deseo',     label: 'Deseo',     color: 'deseo',     emoji: '🟡' },
  { value: 'ahorro',    label: 'Ahorro',    color: 'ahorro',    emoji: '🟢' },
]

export const CATEGORIAS_DEFAULT = [
  // Variables - Necesidad
  { nombre: 'Mercado',          tipo_gasto: 'variable', clasificacion: 'necesidad', icono: '🛒' },
  { nombre: 'Transporte',       tipo_gasto: 'variable', clasificacion: 'necesidad', icono: '🚗' },
  { nombre: 'Salud',            tipo_gasto: 'variable', clasificacion: 'necesidad', icono: '🏥' },
  { nombre: 'Cuidado Personal', tipo_gasto: 'variable', clasificacion: 'necesidad', icono: '💇' },
  { nombre: 'Hogar',            tipo_gasto: 'variable', clasificacion: 'necesidad', icono: '🏠' },
  { nombre: 'Educación',        tipo_gasto: 'variable', clasificacion: 'necesidad', icono: '📚' },
  { nombre: 'Créditos',         tipo_gasto: 'variable', clasificacion: 'necesidad', icono: '💳' },
  // Variables - Deseo
  { nombre: 'Restaurante',      tipo_gasto: 'variable', clasificacion: 'deseo', icono: '🍽️' },
  { nombre: 'Entretenimiento',  tipo_gasto: 'variable', clasificacion: 'deseo', icono: '🎬' },
  { nombre: 'Ropa',             tipo_gasto: 'variable', clasificacion: 'deseo', icono: '👕' },
  { nombre: 'Mascotas',         tipo_gasto: 'variable', clasificacion: 'deseo', icono: '🐾' },
  { nombre: 'Regalos',          tipo_gasto: 'variable', clasificacion: 'deseo', icono: '🎁' },
  { nombre: 'Miscelánea',       tipo_gasto: 'variable', clasificacion: 'deseo', icono: '📦' },
  { nombre: 'Gimnasio',         tipo_gasto: 'variable', clasificacion: 'deseo', icono: '💪' },
  { nombre: 'Café',             tipo_gasto: 'variable', clasificacion: 'deseo', icono: '☕' },
  // Variables - Ahorro
  { nombre: 'Vacaciones',       tipo_gasto: 'variable', clasificacion: 'ahorro', icono: '✈️' },
]

export const METODOS_PAGO_DEFAULT = [
  { nombre: 'Efectivo',   tipo: 'efectivo' },
  { nombre: 'Santander',  tipo: 'debito'   },
  { nombre: 'BBVA',       tipo: 'debito'   },
  { nombre: 'Liverpool',  tipo: 'credito'  },
  { nombre: 'NU',         tipo: 'credito'  },
  { nombre: 'Stori',      tipo: 'credito'  },
  { nombre: 'Simplicity', tipo: 'credito'  },
]

export const formatMXN = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)

export const getMesAnioActual = () => {
  const d = new Date()
  return { mes: d.getMonth() + 1, anio: d.getFullYear() }
}

// ── Quincenas ──────────────────────────────────────────────────────────────
// Q1 = días 1–15 · Q2 = días 16–último día del mes
export const rangoQuincena = (mes, anio, q) => {
  const ultimoDia = new Date(anio, mes, 0).getDate()
  const diaInicio = q === 1 ? 1 : 16
  const diaFin    = q === 1 ? 15 : ultimoDia
  const mm = String(mes).padStart(2, '0')
  return {
    diaInicio,
    diaFin,
    fechaInicio: `${anio}-${mm}-${String(diaInicio).padStart(2, '0')}`,
    fechaFin:    `${anio}-${mm}-${String(diaFin).padStart(2, '0')}`,
  }
}

// Devuelve 1 o 2 según el día del mes de la fecha dada (hoy por defecto)
export const quincenaActual = (fecha = new Date()) =>
  fecha.getDate() <= 15 ? 1 : 2

// ── Nóminas y prestaciones ───────────────────────────────────────────────────
export const PERIODOS_ANIO = { quincenal: 24, mensual: 12, semanal: 52 }
export const FRECUENCIA_LABEL = { quincenal: 'Quincenal', mensual: 'Mensual', semanal: 'Semanal' }

// "7,12" → [7, 12]   ·   [7,12] → "7,12"
export const parseMesesPrima = (s) =>
  (typeof s === 'string' ? s : '').split(',').map(x => Number(x.trim())).filter(n => n >= 1 && n <= 12)
export const serializeMesesPrima = (arr) =>
  (arr ?? []).filter(n => n >= 1 && n <= 12).join(',')

// Calcula prestaciones e ingreso proyectado de una nómina.
// Prima vacacional y aguinaldo se calculan como "días de sueldo base".
// sueldo diario = sueldo base mensual / 30 (convención común en México).
export const calcNomina = (n) => {
  const base = Number(n.sueldo_base_mensual || 0)
  const sueldoDiario = base / 30
  const periodos = PERIODOS_ANIO[n.frecuencia] ?? 12

  const ingresoOrdinarioAnual = Number(n.monto_neto || 0) * periodos
  const aguinaldo     = n.tiene_aguinaldo        ? sueldoDiario * Number(n.dias_aguinaldo || 0)        : 0
  const primaPorEvento = n.tiene_prima_vacacional ? sueldoDiario * Number(n.dias_prima_vacacional || 0) : 0
  const primaAnual    = primaPorEvento * Number(n.veces_prima_al_anio || 0)
  const utilidades    = n.tiene_utilidades       ? Number(n.monto_utilidades || 0)                     : 0

  const extraordinarioAnual = aguinaldo + primaAnual + utilidades
  const ingresoAnualTotal   = ingresoOrdinarioAnual + extraordinarioAnual
  const promedioMensual     = ingresoAnualTotal / 12

  return {
    sueldoDiario, periodos,
    ingresoOrdinarioAnual,
    aguinaldo, primaPorEvento, primaAnual, utilidades,
    extraordinarioAnual, ingresoAnualTotal, promedioMensual,
  }
}
