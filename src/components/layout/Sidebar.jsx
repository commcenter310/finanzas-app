import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, TrendingUp, Receipt, BarChart3,
  List, CreditCard, AlertCircle, PiggyBank, LineChart,
  Settings, MessageSquare, LogOut, Wallet, Landmark, Calculator, X
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',                 icon: LayoutDashboard, label: 'Dashboard'         },
  { to: '/ingresos',         icon: TrendingUp,      label: 'Ingresos'          },
  { to: '/gastos-fijos',     icon: Receipt,         label: 'Gastos Fijos'      },
  { to: '/gastos-variables', icon: BarChart3,        label: 'Presupuesto'       },
  { to: '/control-gastos',   icon: List,            label: 'Control de Gastos' },
  { to: '/creditos',         icon: CreditCard,      label: 'Créditos'          },
  { to: '/deudas',           icon: AlertCircle,     label: 'Deudas'            },
  { to: '/ahorros',          icon: PiggyBank,       label: 'Ahorros'           },
  { to: '/tendencias',       icon: LineChart,       label: 'Tendencias'        },
  { to: '/patrimonio',       icon: Landmark,        label: 'Patrimonio'        },
  { to: '/simulador',        icon: Calculator,      label: 'Simulador'         },
  { to: '/whatsapp',         icon: MessageSquare,   label: 'WhatsApp Log'      },
  { to: '/perfil',           icon: Settings,        label: 'Perfil'            },
]

const GLASS_SIDEBAR = {
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
}

export default function Sidebar({ open, onClose }) {
  const { signOut } = useAuth()

  return (
    <aside
      style={GLASS_SIDEBAR}
      className={`
        w-[248px] h-screen flex flex-col
        fixed left-0 top-0 z-30
        border-r border-[var(--border)]
        transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:z-10
      `}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-5 border-b border-[var(--divider)]">
        {/* Brand mark — gradient squircle */}
        <div
          className="w-10 h-10 rounded-[13px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--grad-primary)', boxShadow: 'var(--shadow-primary)' }}
        >
          <Wallet className="w-5 h-5 text-white" strokeWidth={2} />
        </div>

        <div className="min-w-0">
          <p className="font-bold leading-none text-sm truncate" style={{ color: 'var(--fg-1)' }}>
            Finni Apoyo
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums' }}>
            Control Personal
          </p>
        </div>

        {/* Botón cerrar — solo mobile */}
        <button
          onClick={onClose}
          className="lg:hidden ml-auto p-1.5 rounded-[var(--r-sm)] flex items-center justify-center"
          style={{ color: 'var(--fg-3)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--fg-1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--fg-3)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] text-sm transition-all w-full
               ${isActive
                ? 'font-bold'
                : 'font-medium'}`
            }
            style={({ isActive }) => isActive
              ? { background: 'var(--primary-50)', color: 'var(--primary-700)' }
              : { color: 'var(--fg-2)' }
            }
            onMouseEnter={e => {
              if (!e.currentTarget.classList.contains('font-bold')) {
                e.currentTarget.style.background = 'var(--surface-3)'
                e.currentTarget.style.color = 'var(--fg-1)'
              }
            }}
            onMouseLeave={e => {
              if (!e.currentTarget.classList.contains('font-bold')) {
                e.currentTarget.style.background = ''
                e.currentTarget.style.color = 'var(--fg-2)'
              }
            }}
          >
            <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 pt-2 border-t border-[var(--divider)]">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] text-sm font-medium w-full transition-all"
          style={{ color: 'var(--fg-3)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--negative-bg)'; e.currentTarget.style.color = 'var(--negative-fg)' }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--fg-3)' }}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}
