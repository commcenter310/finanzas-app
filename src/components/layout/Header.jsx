import { ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import { useMes } from '../../context/MesContext'
import { MESES } from '../../utils/constantes'

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
      {/* Left: hamburger (mobile) + title */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuClick}
          className="icon-button lg:hidden -ml-1 flex-shrink-0"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" strokeWidth={2} />
        </button>
        <h1
          className="font-bold truncate text-base lg:text-[21px]"
          style={{ color: 'var(--fg-1)', letterSpacing: 0 }}
        >
          {titulo}
        </h1>
      </div>

      {/* Month switcher */}
      <div className="month-switcher">
        <button
          onClick={irMesAnterior}
          className="icon-button icon-button-sm"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <span
          className="text-sm font-semibold tabular text-center px-1 min-w-[80px] lg:min-w-[132px]"
          style={{ color: 'var(--fg-2)', fontVariantNumeric: 'tabular-nums' }}
        >
          <span className="hidden sm:inline">{MESES[mes - 1]} {anio}</span>
          <span className="sm:hidden">{MESES[mes - 1].slice(0, 3)} {String(anio).slice(2)}</span>
        </span>

        <button
          onClick={irMesSiguiente}
          className="icon-button icon-button-sm"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
        </button>

        {!esActual && (
          <button
            onClick={irHoy}
            className="today-button"
          >
            Hoy
          </button>
        )}
      </div>
    </header>
  )
}
