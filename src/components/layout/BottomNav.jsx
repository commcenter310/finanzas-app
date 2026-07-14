import { CalendarRange, LayoutDashboard, List, Menu, Plus } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio', end: true },
  { to: '/control-gastos', icon: List, label: 'Gastos' },
  { to: '/control-gastos?nuevo=1', icon: Plus, label: 'Nuevo', action: true },
  { to: '/plan-quincena', icon: CalendarRange, label: 'Plan' },
]

export default function BottomNav({ onMore }) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <div className="bottom-nav-inner">
        {ITEMS.map(({ to, icon: Icon, label, end, action }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) => `bottom-nav-item ${isActive && !action ? 'is-active' : ''} ${action ? 'is-action' : ''}`}
            aria-label={action ? 'Registrar un gasto' : label}
            onClick={action ? () => window.dispatchEvent(new Event('finni:new-expense')) : undefined}
          >
            <span className="bottom-nav-icon"><Icon strokeWidth={action ? 2.6 : 2} /></span>
            <span>{label}</span>
          </NavLink>
        ))}
        <button type="button" className="bottom-nav-item" onClick={onMore} aria-label="Abrir mas opciones">
          <span className="bottom-nav-icon"><Menu strokeWidth={2} /></span>
          <span>Más</span>
        </button>
      </div>
    </nav>
  )
}
