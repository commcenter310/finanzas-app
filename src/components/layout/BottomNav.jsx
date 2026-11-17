import { CalendarRange, LayoutDashboard, Menu, Plus, Receipt } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { seccionDeRuta } from './secciones'

// Barra inferior (móvil). Se marca por sección: /gastos-fijos enciende "Gastos".
const ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio', seccion: 'inicio' },
  { to: '/control-gastos', icon: Receipt, label: 'Gastos', seccion: 'gastos' },
  { to: '/control-gastos?nuevo=1', icon: Plus, label: 'Nuevo', action: true },
  { to: '/plan-quincena', icon: CalendarRange, label: 'Plan', seccion: 'plan' },
]

export default function BottomNav({ onMore }) {
  const { pathname } = useLocation()
  const actual = seccionDeRuta(pathname)?.clave

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <div className="bottom-nav-inner">
        {ITEMS.map(({ to, icon: Icon, label, seccion, action }) => {
          const activo = !action && seccion === actual
          return (
            <Link
              key={label}
              to={to}
              className={`bottom-nav-item ${activo ? 'is-active' : ''} ${action ? 'is-action' : ''}`}
              aria-label={action ? 'Registrar un gasto' : label}
              aria-current={activo ? 'page' : undefined}
              onClick={action ? () => window.dispatchEvent(new Event('finni:new-expense')) : undefined}
            >
              <span className="bottom-nav-icon"><Icon strokeWidth={action ? 2.2 : 1.75} /></span>
              <span>{label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          className={`bottom-nav-item ${actual && !ITEMS.some(i => i.seccion === actual) ? 'is-active' : ''}`}
          onClick={onMore}
          aria-label="Abrir más secciones"
        >
          <span className="bottom-nav-icon"><Menu strokeWidth={1.75} /></span>
          <span>Más</span>
        </button>
      </div>
    </nav>
  )
}
