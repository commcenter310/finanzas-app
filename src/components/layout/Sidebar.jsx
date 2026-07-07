import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  LayoutDashboard, TrendingUp, Receipt, BarChart3,
  List, CreditCard, AlertCircle, PiggyBank, LineChart,
  Settings, MessageSquare, LogOut, Wallet, Calculator, X, CalendarRange, Telescope,
  Moon, Sun
} from 'lucide-react'

// Navegación agrupada por uso: lo diario arriba, lo de consulta abajo
const NAV_GROUPS = [
  {
    titulo: 'Día a día',
    items: [
      { to: '/',               icon: LayoutDashboard, label: 'Dashboard'         },
      { to: '/control-gastos', icon: List,            label: 'Control de Gastos' },
      { to: '/plan-quincena',  icon: CalendarRange,   label: 'Plan de Quincena'  },
    ],
  },
  {
    titulo: 'Planeación',
    items: [
      { to: '/ingresos',         icon: TrendingUp, label: 'Ingresos'     },
      { to: '/gastos-fijos',     icon: Receipt,    label: 'Gastos Fijos' },
      { to: '/gastos-variables', icon: BarChart3,  label: 'Presupuesto'  },
      { to: '/ahorros',          icon: PiggyBank,  label: 'Ahorros'      },
    ],
  },
  {
    titulo: 'Deuda',
    items: [
      { to: '/creditos',  icon: CreditCard, label: 'Créditos'  },
      { to: '/deudas',    icon: AlertCircle, label: 'Deudas'    },
      { to: '/simulador', icon: Calculator, label: 'Simulador' },
    ],
  },
  {
    titulo: 'Análisis',
    items: [
      { to: '/tendencias', icon: LineChart, label: 'Tendencias' },
      { to: '/proyeccion', icon: Telescope, label: 'Proyección' },
    ],
  },
  {
    titulo: 'Ajustes',
    items: [
      { to: '/whatsapp', icon: MessageSquare, label: 'WhatsApp Log' },
      { to: '/perfil',   icon: Settings,      label: 'Perfil'       },
    ],
  },
]

const GLASS_SIDEBAR = {
  '--sidebar-fg-1': '#F4FBF7',
  '--sidebar-fg-2': 'rgba(244, 251, 247, 0.76)',
  '--sidebar-fg-3': 'rgba(244, 251, 247, 0.52)',
  '--sidebar-line': 'rgba(255, 255, 255, 0.08)',
  '--sidebar-hover-bg': 'rgba(255, 255, 255, 0.08)',
  '--sidebar-active-fg': '#A7F3D0',
}

export default function Sidebar({ open, onClose }) {
  const { signOut } = useAuth()
  const { esOscuro, toggleTema } = useTheme()

  return (
    <aside
      style={GLASS_SIDEBAR}
      className={`
        sidebar-shell w-[248px] h-screen flex flex-col
        fixed left-0 top-0 z-30
        transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:z-10
      `}
    >
      {/* Brand */}
      <div className="sidebar-brand">
        {/* Brand mark — gradient squircle */}
        <div
          className="sidebar-brand-mark"
        >
          <Wallet className="w-5 h-5" strokeWidth={2} />
        </div>

        <div className="min-w-0">
          <p className="font-bold leading-none text-sm truncate" style={{ color: 'var(--sidebar-fg-1)' }}>
            Finni Apoyo
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--sidebar-fg-3)', fontVariantNumeric: 'tabular-nums' }}>
            Control Personal
          </p>
        </div>

        {/* Botón cerrar — solo mobile */}
        <button
          onClick={onClose}
          className="sidebar-icon-button lg:hidden ml-auto"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {NAV_GROUPS.map(({ titulo, items }) => (
          <div key={titulo} className="mb-3 last:mb-0">
            <p className="sidebar-group-title">
              {titulo}
            </p>
            <div className="space-y-0.5">
              {items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? 'is-active' : ''}`
                  }
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Tema + Logout */}
      <div className="px-3 pb-4 pt-2 border-t" style={{ borderColor: 'var(--sidebar-line)' }}>
        <button
          onClick={toggleTema}
          className="sidebar-nav-link"
        >
          {esOscuro
            ? <Sun className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
            : <Moon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />}
          {esOscuro ? 'Tema claro' : 'Tema oscuro'}
        </button>
        <button
          onClick={signOut}
          className="sidebar-nav-link danger"
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}
