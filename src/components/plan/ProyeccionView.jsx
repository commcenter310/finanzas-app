import { useState } from 'react'
import { useProyeccion } from '../../hooks/useProyeccion'
import { formatMXN } from '../../utils/constantes'
import { ChevronDown, ChevronUp, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ProyeccionView() {
  const { loading, meses, sinDatos, totalIngreso, totalCompromisos, totalLibre } = useProyeccion(12)
  const [expandido, setExpandido] = useState(null)

  if (loading) {
    return <div className="space-y-2">{Array(6).fill(0).map((_, i) => <div key={i} className="card h-14 animate-pulse bg-gray-50" />)}</div>
  }

  if (sinDatos) {
    return (
      <div className="card p-10 text-center">
        <TrendingUp className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--fg-4)' }} />
        <p className="text-sm font-semibold text-gray-700 mb-1">Aún no puedo proyectar tu futuro</p>
        <p className="text-sm text-gray-400 mb-4">
          Configura al menos una nómina para estimar tus ingresos de los próximos meses.
        </p>
        <Link to="/perfil" className="btn-primary inline-flex items-center gap-2 text-sm">
          Configurar nómina
        </Link>
      </div>
    )
  }

  const maxAbs = Math.max(...meses.map(m => Math.abs(m.libre)), 1)

  return (
    <div className="space-y-4">
      {/* Resumen del horizonte */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Ingreso 12 meses</p>
          <p className="text-lg font-bold font-mono" style={{ color: 'var(--positive-fg)' }}>{formatMXN(totalIngreso)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Compromisos 12 meses</p>
          <p className="text-lg font-bold font-mono" style={{ color: 'var(--negative-fg)' }}>{formatMXN(totalCompromisos)}</p>
        </div>
        <div className="card p-4" style={{ borderWidth: 2, borderColor: totalLibre >= 0 ? 'var(--ahorro-bg)' : 'var(--negative-bg)' }}>
          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Libre proyectado</p>
          <p className="text-lg font-bold font-mono" style={{ color: totalLibre >= 0 ? 'var(--ahorro-fg)' : 'var(--negative-fg)' }}>{formatMXN(totalLibre)}</p>
        </div>
      </div>

      {/* Lista de meses */}
      <div className="card overflow-hidden">
        {meses.map(m => {
          const abierto = expandido === m.key
          const negativo = m.libre < 0
          const barPct = (Math.abs(m.libre) / maxAbs) * 100
          return (
            <div key={m.key} className="border-b last:border-0" style={{ borderColor: 'var(--divider)' }}>
              <button
                onClick={() => setExpandido(abierto ? null : m.key)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                {/* Mes */}
                <div className="w-20 flex-shrink-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--fg-1)' }}>
                    {m.labelCorto} <span className="text-gray-400 font-normal">{String(m.anioM).slice(2)}</span>
                  </p>
                  {m.esActual && <span className="text-[10px] font-bold" style={{ color: 'var(--primary-600)' }}>actual</span>}
                </div>

                {/* Barra libre */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${barPct}%`, background: negativo ? 'var(--negative)' : 'var(--ahorro)' }} />
                    </div>
                    {m.totalExtra > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--warning-bg)', color: 'var(--warning-fg)' }}>
                        <Sparkles className="w-2.5 h-2.5" /> +{formatMXN(m.totalExtra)}
                      </span>
                    )}
                    {negativo && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--negative-fg)' }} />}
                  </div>
                </div>

                {/* Libre */}
                <div className="text-right flex-shrink-0 w-28">
                  <p className="font-mono font-bold text-sm" style={{ color: negativo ? 'var(--negative-fg)' : 'var(--ahorro-fg)' }}>
                    {formatMXN(m.libre)}
                  </p>
                  <p className="text-[10px] text-gray-400">libre</p>
                </div>
                {abierto ? <ChevronUp className="w-4 h-4 text-gray-300 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0" />}
              </button>

              {/* Detalle expandido */}
              {abierto && (
                <div className="px-4 pb-4 pt-1 bg-gray-50">
                  {/* Desglose ingreso/compromisos */}
                  <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Ingreso</p>
                      <p className="font-mono font-semibold" style={{ color: 'var(--positive-fg)' }}>{formatMXN(m.ingresoTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">A apartar</p>
                      <p className="font-mono font-semibold" style={{ color: 'var(--negative-fg)' }}>{formatMXN(m.compromisos)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Libre</p>
                      <p className="font-mono font-semibold" style={{ color: m.libre >= 0 ? 'var(--ahorro-fg)' : 'var(--negative-fg)' }}>{formatMXN(m.libre)}</p>
                    </div>
                  </div>

                  {/* Extraordinarios del mes */}
                  {m.extras.length > 0 && (
                    <div className="mb-3">
                      {m.extras.map((e, i) => (
                        <div key={i} className="flex justify-between text-xs py-0.5">
                          <span className="text-gray-500">✨ {e.concepto}</span>
                          <span className="font-mono font-semibold" style={{ color: 'var(--warning-fg)' }}>+{formatMXN(e.monto)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quincenas */}
                  <div className="grid grid-cols-2 gap-2">
                    {[['1ª quincena', m.q1], ['2ª quincena', m.q2]].map(([label, q]) => (
                      <div key={label} className="rounded-lg p-2.5" style={{ background: 'var(--surface)' }}>
                        <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Ingreso</span>
                          <span className="font-mono">{formatMXN(q.ingreso)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Apartar</span>
                          <span className="font-mono">{formatMXN(q.compromisos)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold border-t mt-1 pt-1" style={{ borderColor: 'var(--divider)' }}>
                          <span className="text-gray-500">Libre</span>
                          <span className="font-mono" style={{ color: q.libre >= 0 ? 'var(--ahorro-fg)' : 'var(--negative-fg)' }}>{formatMXN(q.libre)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Proyección basada en tus nóminas y gastos fijos recurrentes. El aguinaldo, prima y utilidades
        aparecen en el mes que configuraste. Los pagos de deuda se proyectan hasta liquidarlas.
      </p>
    </div>
  )
}
