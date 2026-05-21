import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMes } from '../../context/MesContext'
import { MESES } from '../../utils/constantes'

export default function Header({ titulo }) {
  const { mes, anio, setMes, setAnio, irMesAnterior, irMesSiguiente } = useMes()
  const hoy = new Date()
  const esActual = mes === hoy.getMonth() + 1 && anio === hoy.getFullYear()

  const irHoy = () => {
    setMes(hoy.getMonth() + 1)
    setAnio(hoy.getFullYear())
  }

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="font-bold text-gray-900 text-lg">{titulo}</h1>

      {/* Selector de mes */}
      <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100">
        <button onClick={irMesAnterior}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all">
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>

        <span className="px-3 text-sm font-semibold text-gray-700 font-mono min-w-[130px] text-center">
          {MESES[mes - 1]} {anio}
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
