import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, TrendingUp, Receipt, BarChart3,
  List, CreditCard, AlertCircle, PiggyBank, LineChart,
  Settings, MessageSquare, LogOut, Wallet, Landmark
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',                 icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/ingresos',         icon: TrendingUp,      label: 'Ingresos'         },
  { to: '/gastos-fijos',     icon: Receipt,         label: 'Gastos Fijos'     },
  { to: '/gastos-variables', icon: BarChart3,       label: 'Presupuesto'      },
  { to: '/control-gastos',   icon: List,            label: 'Control de Gastos'},
  { to: '/creditos',         icon: CreditCard,      label: 'Créditos'         },
  { to: '/deudas',           icon: AlertCircle,     label: 'Deudas'           },
  { to: '/ahorros',          icon: PiggyBank,       label: 'Ahorros'          },
  { to: '/tendencias',       icon: LineChart,       label: 'Tendencias'       },
  { to: '/patrimonio',       icon: Landmark,        label: 'Patrimonio'       },
  { to: '/whatsapp',         icon: MessageSquare,   label: 'WhatsApp Log'     },
  { to: '/perfil',           icon: Settings,        label: 'Perfil'           },
]

export default function Sidebar() {
  const { signOut } = useAuth()

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0 z-10">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-none text-sm">Mis Finanzas</p>
            <p className="text-xs text-gray-400 font-mono">Control Personal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
               ${isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
            }>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 w-full transition-all">
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}
