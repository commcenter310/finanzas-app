import { ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import { useMes } from '../../context/MesContext'
import { MESES } from '../../utils/constantes'

const GLASS_HEADER = {
  background: 'linear-gradient(180deg, var(--surface-glass-strong), var(--surface-glass))',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: '0 1px 0 rgba(21, 32, 28, 0.04)',
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
    <header
      style={GLASS_HEADER}
      className="h-[64px] flex items-center justify-between px-4 lg:px-7 sticky top-0 z-10 border-b border-[var(--border)]"
    >
      {/* Left: hamburger (mobile) + title */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-[var(--r-sm)] -ml-1 flex-shrink-0 transition-colors"
          style={{ color: 'var(--fg-3)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--fg-1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--fg-3)' }}
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
      <div
        className="flex items-center gap-1 p-1 rounded-[var(--r-lg)] border border-[var(--border)] flex-shrink-0"
        style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-xs)' }}
      >
        <button
          onClick={irMesAnterior}
          className="w-[30px] h-[30px] flex items-center justify-center rounded-[var(--r-sm)] transition-all"
          style={{ color: 'var(--fg-3)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--fg-1)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--fg-3)'; e.currentTarget.style.boxShadow = '' }}
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
          className="w-[30px] h-[30px] flex items-center justify-center rounded-[var(--r-sm)] transition-all"
          style={{ color: 'var(--fg-3)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--fg-1)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--fg-3)'; e.currentTarget.style.boxShadow = '' }}
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
        </button>

        {!esActual && (
          <button
            onClick={irHoy}
            className="text-xs font-semibold px-2 border-l border-[var(--border)] ml-0.5 transition-colors"
            style={{ color: 'var(--primary-600)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary-700)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--primary-600)' }}
          >
            Hoy
          </button>
        )}
      </div>
    </header>
  )
}
