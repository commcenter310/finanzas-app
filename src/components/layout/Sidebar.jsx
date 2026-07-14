import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  BadgeDollarSign,
  BarChart3,
  CalendarRange,
  Calculator,
  CreditCard,
  LayoutDashboard,
  LineChart,
  List,
  LogOut,
  MessageSquare,
  Moon,
  PiggyBank,
  Receipt,
  Settings,
  Sun,
  Telescope,
  TrendingUp,
  X,
} from 'lucide-react'
import BrandMark from './BrandMark'

const NAV_GROUPS = [
  {
    titulo: 'Hoy',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Inicio' },
      { to: '/control-gastos', icon: List, label: 'Movimientos' },
      { to: '/plan-quincena', icon: CalendarRange, label: 'Plan de quincena' },
    ],
  },
  {
    titulo: 'Organiza',
    items: [
      { to: '/ingresos', icon: TrendingUp, label: 'Ingresos' },
      { to: '/gastos-fijos', icon: Receipt, label: 'Gastos fijos' },
      { to: '/gastos-variables', icon: BarChart3, label: 'Presupuesto' },
      { to: '/ahorros', icon: PiggyBank, label: 'Ahorros' },
      { to: '/creditos', icon: CreditCard, label: 'Créditos' },
      { to: '/deudas', icon: BadgeDollarSign, label: 'Deudas' },
    ],
  },
  {
    titulo: 'Explora',
    items: [
      { to: '/tendencias', icon: LineChart, label: 'Tendencias' },
      { to: '/proyeccion', icon: Telescope, label: 'Proyección' },
      { to: '/simulador', icon: Calculator, label: 'Simulador' },
    ],
  },
]

const SIDEBAR_TOKENS = {
  '--sidebar-fg-1': '#F8FAFF',
  '--sidebar-fg-2': 'rgba(230, 237, 255, 0.72)',
  '--sidebar-fg-3': 'rgba(205, 216, 244, 0.42)',
  '--sidebar-line': 'rgba(255, 255, 255, 0.08)',
  '--sidebar-hover-bg': 'rgba(255, 255, 255, 0.07)',
  '--sidebar-active-fg': '#FFFFFF',
}

export default function Sidebar({ open, onClose }) {
  const { signOut } = useAuth()
  const { esOscuro, toggleTema } = useTheme()

  return (
    <aside
      style={SIDEBAR_TOKENS}
      className={`sidebar-shell w-[248px] h-screen flex flex-col fixed left-0 top-0 z-30 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:z-10`}
    >
      <div className="sidebar-brand">
        <BrandMark inverse />
        <button type="button" onClick={onClose} className="sidebar-icon-button lg:hidden ml-auto" aria-label="Cerrar menú">
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Secciones de Finni">
        {NAV_GROUPS.map(({ titulo, items }) => (
          <section key={titulo} className="sidebar-group">
            <p className="sidebar-group-title">{titulo}</p>
            <div className="space-y-0.5">
              {items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={onClose}
                  className={({ isActive }) => `sidebar-nav-link ${isActive ? 'is-active' : ''}`}
                >
                  <span className="sidebar-nav-icon"><Icon strokeWidth={1.9} /></span>
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/whatsapp" onClick={onClose} className={({ isActive }) => `sidebar-nav-link ${isActive ? 'is-active' : ''}`}>
          <span className="sidebar-nav-icon"><MessageSquare strokeWidth={1.9} /></span>
          <span>WhatsApp</span>
        </NavLink>
        <NavLink to="/perfil" onClick={onClose} className={({ isActive }) => `sidebar-nav-link ${isActive ? 'is-active' : ''}`}>
          <span className="sidebar-nav-icon"><Settings strokeWidth={1.9} /></span>
          <span>Configuración</span>
        </NavLink>
        <div className="sidebar-footer-actions">
          <button type="button" onClick={toggleTema} className="sidebar-utility-button">
            {esOscuro ? <Sun /> : <Moon />}
            <span>{esOscuro ? 'Tema claro' : 'Tema oscuro'}</span>
          </button>
          <button type="button" onClick={signOut} className="sidebar-utility-icon danger" aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut />
          </button>
        </div>
      </div>
    </aside>
  )
}
