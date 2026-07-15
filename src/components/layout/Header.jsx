import { ChevronLeft, ChevronRight, Menu, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMes } from '../../context/MesContext'
import { MESES } from '../../utils/constantes'
import ReminderBell from './ReminderBell'

const PAGE_CONTEXT = {
  Dashboard: 'Tu panorama financiero',
  'Plan de Quincena': 'Decide antes de gastar',
  Ingresos: 'Dinero que entra',
  'Gastos Fijos': 'Compromisos del mes',
  Presupuesto: 'Límites que sí ayudan',
  Movimientos: 'Cada movimiento en su lugar',
  'Créditos': 'Uso y ciclos de tus tarjetas',
  Deudas: 'Avance de tus compromisos',
  Ahorros: 'Metas que toman forma',
  Tendencias: 'Patrones para decidir mejor',
  'Proyección 12 Meses': 'Lo que viene, con perspectiva',
  'Simulador de Crédito': 'Compara antes de comprometerte',
  'WhatsApp Log': 'Actividad de automatizaciones',
  Perfil: 'Tu configuración financiera',
}

export default function Header({ titulo, onMenuClick }) {
  const { mes, anio, setMes, setAnio, irMesAnterior, irMesSiguiente } = useMes()
  const hoy = new Date()
  const esActual = mes === hoy.getMonth() + 1 && anio === hoy.getFullYear()

  const irHoy = () => {
    setMes(hoy.getMonth() + 1)
    setAnio(hoy.getFullYear())
  }

  return (
    <header className="app-header">
      <div className="header-identity">
        <button
          type="button"
          onClick={onMenuClick}
          className="icon-button lg:hidden flex-shrink-0"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" strokeWidth={2} />
        </button>
        <span className="header-title-rule" aria-hidden="true" />
        <div className="min-w-0">
          <p className="header-kicker">Finni / {PAGE_CONTEXT[titulo] ?? 'Control personal'}</p>
          <h1 className="header-title">{titulo}</h1>
        </div>
      </div>

      <div className="header-actions">
        <div className="month-switcher" aria-label="Cambiar mes">
          <button onClick={irMesAnterior} className="icon-button icon-button-sm" aria-label="Mes anterior">
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <span className="month-switcher-label">
            <span className="hidden sm:inline">{MESES[mes - 1]} {anio}</span>
            <span className="sm:hidden">{MESES[mes - 1].slice(0, 3)} {String(anio).slice(2)}</span>
          </span>
          <button onClick={irMesSiguiente} className="icon-button icon-button-sm" aria-label="Mes siguiente">
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
          {!esActual && <button onClick={irHoy} className="today-button">Hoy</button>}
        </div>

        <Link
          to="/control-gastos?nuevo=1"
          className="header-add-button hidden lg:inline-flex"
          onClick={() => window.dispatchEvent(new Event('finni:new-expense'))}
        >
          <Plus className="w-4 h-4" strokeWidth={2.6} />
          Registrar
        </Link>
        <ReminderBell />
      </div>
    </header>
  )
}
