export const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

export const CLASIF_OPTS = [
  { value: 'necesidad', label: 'Necesidad', dotColor: 'var(--necesidad)' },
  { value: 'deseo',     label: 'Deseo',     dotColor: 'var(--deseo)'     },
  { value: 'ahorro',    label: 'Ahorro',    dotColor: 'var(--ahorro)'    },
]

// Las categorías y métodos de pago por defecto de un usuario nuevo se siembran
// con el trigger SQL `handle_new_user` (ver supabase-schema.sql). No se duplican
// aquí para evitar que las dos listas se desincronicen.

export const formatMXN = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)


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
