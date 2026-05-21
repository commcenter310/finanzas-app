import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { useGastosVariables } from '../hooks/useGastosVariables'
import { formatMXN } from '../utils/constantes'
import { Pencil, Check, AlertTriangle } from 'lucide-react'

const clasifColors = { necesidad: 'bg-blue-50 border-blue-100', deseo: 'bg-amber-50 border-amber-100', ahorro: 'bg-emerald-50 border-emerald-100' }
const barColors    = { necesidad: '#2563eb', deseo: '#f59e0b', ahorro: '#10b981' }

function TarjetaCategoria({ cat, onActualizar }) {
  const [editandoLimite, setEditandoLimite] = useState(false)
  const [nuevoLimite, setNuevoLimite] = useState(cat.limite)

  const guardarLimite = async () => {
    await onActualizar(cat.id, Number(nuevoLimite))
    setEditandoLimite(false)
  }

  return (
    <div className={`card p-4 border ${cat.sobre ? 'border-red-200' : (clasifColors[cat.clasificacion] ?? 'border-gray-100')}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cat.icono}</span>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{cat.nombre}</p>
            <span className={`badge-${cat.clasificacion} text-xs`}>{cat.clasificacion}</span>
          </div>
        </div>
        {cat.sobre && <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />}
      </div>

      {/* Montos */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Gastado</p>
          <p className={`text-lg font-bold font-mono ${cat.sobre ? 'text-red-600' : 'text-gray-800'}`}>
            {formatMXN(cat.gastado)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-0.5">Límite</p>
          {editandoLimite
            ? (
              <div className="flex items-center gap-1">
                <input type="number" className="input text-sm py-1 px-2 w-24 font-mono text-right"
                  value={nuevoLimite} onChange={e => setNuevoLimite(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && guardarLimite()} autoFocus />
                <button onClick={guardarLimite}
                  className="w-6 h-6 bg-emerald-500 text-white rounded flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </button>
              </div>
            )
            : (
              <button onClick={() => { setNuevoLimite(cat.limite); setEditandoLimite(true) }}
                className="flex items-center gap-1 text-sm font-mono text-gray-500 hover:text-primary-700 group">
                {formatMXN(cat.limite)}
                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100" />
              </button>
            )}
        </div>
      </div>

      {/* Barra */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${cat.pct}%`,
            backgroundColor: cat.sobre ? '#ef4444' : (barColors[cat.clasificacion] ?? '#1a3faa')
          }} />
      </div>

      {cat.limite > 0 && (
        <p className={`text-xs mt-1.5 text-right font-mono ${cat.sobre ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
          {cat.pct.toFixed(0)}%{cat.sobre && ' ⚠️ Excedido'}
        </p>
      )}
    </div>
  )
}

export default function GastosVariables() {
  const { loading, categorias, actualizarPresupuesto } = useGastosVariables()
  const [filtro, setFiltro] = useState('todas')

  const filtradas    = filtro === 'todas' ? categorias : categorias.filter(c => c.clasificacion === filtro)
  const totalGastado = categorias.reduce((s, c) => s + c.gastado, 0)
  const totalLimite  = categorias.reduce((s, c) => s + c.limite, 0)
  const excedidas    = categorias.filter(c => c.sobre).length

  return (
    <Layout titulo="Gastos Variables">
      <div className="space-y-5">

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Total Gastado</p>
            <p className="text-xl font-bold font-mono text-primary-700">{formatMXN(totalGastado)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Presupuesto Total</p>
            <p className="text-xl font-bold font-mono text-gray-600">{formatMXN(totalLimite)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Categorías Excedidas</p>
            <p className={`text-xl font-bold font-mono ${excedidas > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {excedidas} {excedidas > 0 ? '⚠️' : '✅'}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {[
            { key: 'todas',     label: 'Todas' },
            { key: 'necesidad', label: '🔵 Necesidad' },
            { key: 'deseo',     label: '🟡 Deseo' },
            { key: 'ahorro',    label: '🟢 Ahorro' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltro(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all
                ${filtro === key ? 'bg-primary-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading
          ? <div className="grid grid-cols-4 gap-4">{Array(8).fill(0).map((_,i) => <div key={i} className="card p-4 h-32 animate-pulse bg-gray-50" />)}</div>
          : (
            <div className="grid grid-cols-4 gap-4">
              {filtradas.map(cat => (
                <TarjetaCategoria key={cat.id} cat={cat} onActualizar={actualizarPresupuesto} />
              ))}
            </div>
          )}

        <p className="text-xs text-gray-400 text-center">
          Haz click en el monto de límite para editarlo · Los presupuestos se guardan por mes
        </p>
      </div>
    </Layout>
  )
}
