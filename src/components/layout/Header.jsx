import { ChevronLeft, ChevronRight, Menu, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMes } from '../../context/MesContext'
import { MESES } from '../../utils/constantes'
import ReminderBell from './ReminderBell'
import BrandMark from './BrandMark'

// En teléfonos el encabezado tiene ~100 px para el título (menú, selector de
// mes y campana ocupan el resto): los títulos largos usan su nombre corto,
// el mismo de la barra inferior.
const TITULO_CORTO = {
  'Plan de quincena': 'Plan',
  'Proyección a 12 meses': 'Proyección',
  'Simulador de crédito': 'Simulador',
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
        {/* En teléfonos no cabe junto al título; se muestra en tablets */}
        <BrandMark compact className="hidden sm:block lg:hidden" />
        <div className="min-w-0">
          <h1 className="header-title">
            {TITULO_CORTO[titulo] ? (
              <>
                <span className="header-title-largo">{titulo}</span>
                <span className="header-title-corto">{TITULO_CORTO[titulo]}</span>
              </>
            ) : titulo}
          </h1>
        </div>
      </div>

      <div className="header-actions">
        <div className="month-switcher" aria-label="Cambiar mes">
          <button onClick={irMesAnterior} className="icon-button icon-button-sm" aria-label="Mes anterior">
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          </button>
          <span className="month-switcher-label">
            <span className="hidden sm:inline">{MESES[mes - 1]} {anio}</span>
            <span className="sm:hidden">{MESES[mes - 1].slice(0, 3)} {String(anio).slice(2)}</span>
          </span>
          <button onClick={irMesSiguiente} className="icon-button icon-button-sm" aria-label="Mes siguiente">
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          </button>
          {!esActual && <button onClick={irHoy} className="today-button">Hoy</button>}
        </div>

        <Link
          to="/control-gastos?nuevo=1"
          className="header-add-button hidden lg:inline-flex"
          onClick={() => window.dispatchEvent(new Event('finni:new-expense'))}
        >
          <Plus className="w-4 h-4" strokeWidth={2.2} />
          Registrar
        </Link>
        <ReminderBell />
      </div>
    </header>
  )
}
