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
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">

      {/* Izquierda: hamburger (solo mobile) + título */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 -ml-1 flex-shrink-0"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-gray-900 text-base lg:text-lg truncate">{titulo}</h1>
      </div>

      {/* Selector de mes */}
      <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100 flex-shrink-0">
        <button onClick={irMesAnterior}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all">
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>

        <span className="px-2 text-sm font-semibold text-gray-700 font-mono min-w-[80px] lg:min-w-[130px] text-center">
          {/* Versión completa en sm+ */}
          <span className="hidden sm:inline">{MESES[mes - 1]} {anio}</span>
          {/* Versión corta en mobile */}
          <span className="sm:hidden">{MESES[mes - 1].slice(0, 3)} {String(anio).slice(2)}</span>
        </span>

        <button onClick={irMesSiguiente}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all">
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>

        {!esActual && (
          <button onClick={irHoy}
            className="text-xs text-primary-700 px-2 font-semibold border-l border-gray-200 ml-1">
            Hoy
          </button>
        )}
      </div>
    </header>
  )
}
