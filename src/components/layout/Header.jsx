import { ChevronLeft, ChevronRight, Menu, Plus } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useMes } from '../../context/MesContext'
import { MESES } from '../../utils/constantes'
import ReminderBell from './ReminderBell'
import BrandMark from './BrandMark'
import MenuCuenta from './MenuCuenta'
import { RUTAS_CUENTA, SECCIONES, rutaDeSeccion, seccionDeRuta } from './secciones'

function SelectorMes() {
  const { mes, anio, setMes, setAnio, irMesAnterior, irMesSiguiente } = useMes()
  const hoy = new Date()
  const esActual = mes === hoy.getMonth() + 1 && anio === hoy.getFullYear()
  const irHoy = () => {
    setMes(hoy.getMonth() + 1)
    setAnio(hoy.getFullYear())
  }

  return (
    <div className="month-switcher" role="group" aria-label="Cambiar mes">
      <button onClick={irMesAnterior} className="icon-button icon-button-sm" aria-label="Mes anterior">
        <ChevronLeft className="w-4 h-4" strokeWidth={2} />
      </button>
      <span className="month-switcher-label" aria-live="polite">
        <span className="hidden sm:inline">{MESES[mes - 1]} {anio}</span>
        <span className="sm:hidden">{MESES[mes - 1].slice(0, 3)} {String(anio).slice(2)}</span>
      </span>
      <button onClick={irMesSiguiente} className="icon-button icon-button-sm" aria-label="Mes siguiente">
        <ChevronRight className="w-4 h-4" strokeWidth={2} />
      </button>
      {!esActual && <button onClick={irHoy} className="today-button">Hoy</button>}
    </div>
  )
}

// Barra superior única. Escritorio: logo · secciones · mes · Registrar ·
// campana · cuenta. Móvil: menú · nombre de la sección · mes · campana
// (las secciones van en la barra inferior y en el cajón).
export default function Header({ titulo, onMenuClick }) {
  const { pathname } = useLocation()
  const actual = seccionDeRuta(pathname)
  const nombreMovil = actual?.etiqueta
    ?? RUTAS_CUENTA.find(r => r.to === pathname)?.etiqueta
    ?? titulo

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <button type="button" onClick={onMenuClick} className="icon-button lg:hidden flex-shrink-0" aria-label="Abrir menú">
          <Menu className="w-5 h-5" strokeWidth={2} />
        </button>
        <p className="header-title lg:hidden">{nombreMovil}</p>

        <Link to="/" className="header-brand hidden lg:flex" aria-label="Finni Apoyo, inicio">
          <BrandMark compact className="xl:hidden" />
          <BrandMark className="hidden xl:block header-logo" />
        </Link>

        <nav className="top-nav hidden lg:flex" aria-label="Secciones">
          {SECCIONES.map(s => {
            const activa = actual?.clave === s.clave
            return (
              <NavLink
                key={s.clave}
                to={rutaDeSeccion(s)}
                className={`top-nav-link ${activa ? 'is-active' : ''}`}
                aria-current={activa ? 'page' : undefined}
              >
                {s.etiqueta}
              </NavLink>
            )
          })}
        </nav>

        <div className="header-actions">
          <SelectorMes />
          <Link
            to="/control-gastos?nuevo=1"
            className="header-add-button hidden lg:inline-flex"
            onClick={() => window.dispatchEvent(new Event('finni:new-expense'))}
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            Registrar
          </Link>
          <ReminderBell />
          <div className="hidden lg:block"><MenuCuenta /></div>
        </div>
      </div>
    </header>
  )
}
