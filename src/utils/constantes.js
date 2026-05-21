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
