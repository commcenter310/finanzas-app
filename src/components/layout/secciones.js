import {
  CalendarRange,
  LayoutDashboard,
  LineChart,
  PiggyBank,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react'

// Mapa único de navegación: la barra superior (escritorio), la barra inferior
// y el cajón (móvil) y las pestañas de cada sección salen de aquí.
// Las URL no cambian: una sección solo agrupa rutas que ya existen en App.jsx.
export const SECCIONES = [
  { clave: 'inicio', etiqueta: 'Inicio', icono: LayoutDashboard, rutas: [
    { to: '/', etiqueta: 'Inicio' },
  ] },
  { clave: 'gastos', etiqueta: 'Gastos', icono: Receipt, rutas: [
    { to: '/control-gastos', etiqueta: 'Movimientos' },
    { to: '/gastos-fijos', etiqueta: 'Fijos' },
    { to: '/gastos-variables', etiqueta: 'Presupuesto' },
  ] },
  { clave: 'ingresos', etiqueta: 'Ingresos', icono: TrendingUp, rutas: [
    { to: '/ingresos', etiqueta: 'Ingresos' },
  ] },
  { clave: 'plan', etiqueta: 'Plan', icono: CalendarRange, rutas: [
    { to: '/plan-quincena', etiqueta: 'Quincena' },
    { to: '/proyeccion', etiqueta: '12 meses' },
  ] },
  { clave: 'deudas', etiqueta: 'Deudas', icono: Wallet, rutas: [
    { to: '/deudas', etiqueta: 'Deudas' },
    { to: '/creditos', etiqueta: 'Tarjetas' },
    { to: '/simulador', etiqueta: 'Simulador' },
  ] },
  { clave: 'ahorros', etiqueta: 'Ahorros', icono: PiggyBank, rutas: [
    { to: '/ahorros', etiqueta: 'Ahorros' },
  ] },
  { clave: 'tendencias', etiqueta: 'Tendencias', icono: LineChart, rutas: [
    { to: '/tendencias', etiqueta: 'Tendencias' },
  ] },
]

// Fuera de la barra principal (menú de cuenta)
export const RUTAS_CUENTA = [
  { to: '/perfil', etiqueta: 'Configuración' },
  { to: '/whatsapp', etiqueta: 'WhatsApp' },
]

// Normaliza: sin query ni barra final ('/gastos-fijos/' → '/gastos-fijos')
const limpiar = (pathname = '/') => {
  const sinQuery = String(pathname).split(/[?#]/)[0] || '/'
  return sinQuery.length > 1 ? sinQuery.replace(/\/+$/, '') : sinQuery
}

// Sección a la que pertenece una ruta, o null (p. ej. /perfil, /whatsapp).
// '/' solo coincide exacto: si no, todo sería "Inicio".
export function seccionDeRuta(pathname) {
  const ruta = limpiar(pathname)
  return SECCIONES.find(s => s.rutas.some(r =>
    r.to === '/' ? ruta === '/' : ruta === r.to || ruta.startsWith(`${r.to}/`)
  )) ?? null
}

// Primera ruta de una sección: a donde lleva su enlace en la barra
export const rutaDeSeccion = (seccion) => seccion.rutas[0].to
