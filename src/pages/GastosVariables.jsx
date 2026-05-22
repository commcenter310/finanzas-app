import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { useGastosVariables } from '../hooks/useGastosVariables'
import { formatMXN } from '../utils/constantes'
import { Pencil, Check, AlertTriangle, Copy } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

const clasifColors = { necesidad: 'bg-blue-50 border-blue-100', deseo: 'bg-amber-50 border-amber-100', ahorro: 'bg-emerald-50 border-emerald-100' }
const barColors    = { necesidad: '#2563eb', deseo: '#f59e0b', ahorro: '#10b981' }

function TarjetaCategoria({ cat, onActualizar }) {
  const [editandoLimite, setEditandoLimite] = useState(false)
  const [nuevoLimite, setNuevoLimite] = useState(cat.limite)

  const guardarLimite = async () => {
    await onActualizar(cat.id, Number(nuevoLimite))
    setEditandoLimite(false)
  }

  const sinLimite = cat.limite === 0

  return (
    <div className={`card p-4 border ${cat.sobre ? 'border-red-200' : sinLimite ? 'border-dashed border-gray-200' : (clasifColors[cat.clasificacion] ?? 'border-gray-100')}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cat.icono}</span>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{cat.nombre}</p>
            <span className={`badge-${cat.clasificacion} text-xs`}>{cat.clasificacion}</span>
          </div>
        </div>
        {cat.sobre   && <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />}
        {sinLimite && !cat.sobre && <span className="text-xs text-amber-500 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">Sin límite</span>}
      </div>

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
                {cat.limite > 0 ? formatMXN(cat.limite) : 'Sin límite'}
                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100" />
              </button>
            )}
        </div>
      </div>

      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${cat.pct}%`,
            backgroundColor: cat.sobre ? '#ef4444' : (barColors[cat.clasificacion] ?? '#1a3faa')
          }} />
      </div>

      {cat.limite > 0 && (
        <div className="flex justify-between items-center mt-1.5">
          <p className={`text-xs font-mono ${cat.sobre ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
            {cat.pct.toFixed(0)}%{cat.sobre && ' ⚠️ Excedido'}
          </p>
          {!cat.sobre && (
            <p className="text-xs text-emerald-600 font-mono">
              Disponible: {formatMXN(cat.limite - cat.gastado)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function GastosVariables() {
  const {
    loading, categorias, actualizarPresupuesto,
    copiarDelMesAnterior, proyeccionTotal, diasTranscurridos, diasDelMes
  } = useGastosVariables()
  const [filtro, setFiltro] = useState('todas')
  const [mensajeCopia, setMensajeCopia] = useState('')

  const catsConLimite = categorias.filter(c => c.limite > 0)
  const filtradas     = filtro === 'todas' ? categorias : categorias.filter(c => c.clasificacion === filtro)

  const totalGastado = catsConLimite.reduce((s, c) => s + c.gastado, 0)
  const totalLimite  = catsConLimite.reduce((s, c) => s + c.limite, 0)
  const excedidas    = catsConLimite.filter(c => c.sobre).length
  const sinLimite    = categorias.filter(c => c.limite === 0).length
  const pctTotal     = totalLimite > 0 ? (totalGastado / totalLimite) * 100 : 0
  const colorTotal   = pctTotal >= 100 ? '#ef4444' : pctTotal >= 80 ? '#f59e0b' : '#10b981'

  const handleCopiar = async () => {
    const { copiados } = await copiarDelMesAnterior()
    setMensajeCopia(copiados > 0 ? `✓ ${copiados} límites copiados` : 'Sin límites en el mes anterior')
    setTimeout(() => setMensajeCopia(''), 3000)
  }

  const datosGrafico = catsConLimite.map(c => ({
    name: `${c.icono} ${c.nombre}`,
    limite: c.limite,
    gastado: c.gastado,
    sobre: c.sobre,
    clasificacion: c.clasificacion,
  }))

  return (
    <Layout titulo="Presupuesto">
      <div className="space-y-5">

        {/* Salud global */}
        {totalLimite > 0 && (
          <div className="card p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="font-bold text-gray-900">Salud del Presupuesto</h2>
                <p className="text-xs text-gray-400 mt-0.5">Día {diasTranscurridos} de {diasDelMes} del mes</p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-sm" style={{ color: colorTotal }}>
                  {formatMXN(totalGastado)} / {formatMXN(totalLimite)}
                </p>
                <p className="text-xs font-mono" style={{ color: colorTotal }}>{pctTotal.toFixed(0)}% usado</p>
              </div>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(pctTotal, 100)}%`, backgroundColor: colorTotal }} />
            </div>
            <p className={`text-xs font-mono mb-4 ${proyeccionTotal > totalLimite ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
              Proyección fin de mes: {formatMXN(proyeccionTotal)}
              {proyeccionTotal > totalLimite && ` · ⚠️ ${formatMXN(proyeccionTotal - totalLimite)} sobre el límite`}
            </p>
            <div className="grid grid-cols-3 gap-3 border-t border-gray-50 pt-3">
              {[
                { key: 'necesidad', label: 'Necesidad', color: '#2563eb' },
                { key: 'deseo',     label: 'Deseo',     color: '#f59e0b' },
                { key: 'ahorro',    label: 'Ahorro',    color: '#10b981' },
              ].map(({ key, label, color }) => {
                const g = catsConLimite.filter(c => c.clasificacion === key).reduce((s,c) => s + c.gastado, 0)
                const l = catsConLimite.filter(c => c.clasificacion === key).reduce((s,c) => s + c.limite, 0)
                const p = l > 0 ? (g / l) * 100 : 0
                return (
                  <div key={key} className="text-center">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <p className="font-mono font-bold text-sm" style={{ color }}>{formatMXN(g)}</p>
                    {l > 0 && (
                      <>
                        <p className="text-xs text-gray-400">de {formatMXN(l)}</p>
                        <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${Math.min(p, 100)}%`, backgroundColor: p >= 100 ? '#ef4444' : color }} />
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Resumen + Copiar */}
        <div className="flex items-start gap-4">
          <div className="grid grid-cols-3 gap-4 flex-1">
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
              {sinLimite > 0 && (
                <p className="text-xs text-amber-500 mt-0.5">{sinLimite} sin límite</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 pt-1">
            <button onClick={handleCopiar}
              className="btn-ghost text-sm flex items-center gap-1.5 whitespace-nowrap">
              <Copy className="w-3.5 h-3.5" /> Copiar del mes anterior
            </button>
            {mensajeCopia && (
              <p className="text-xs text-emerald-600 font-semibold">{mensajeCopia}</p>
            )}
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

        {/* Grid de categorías */}
        {loading
          ? <div className="grid grid-cols-4 gap-4">{Array(8).fill(0).map((_,i) => <div key={i} className="card p-4 h-32 animate-pulse bg-gray-50" />)}</div>
          : filtradas.length === 0
            ? <div className="card p-12 text-center text-gray-300 text-sm">No hay categorías activas</div>
            : (
              <div className="grid grid-cols-4 gap-4">
                {filtradas.map(cat => (
                  <TarjetaCategoria key={cat.id} cat={cat} onActualizar={actualizarPresupuesto} />
                ))}
              </div>
            )}

        {/* Gráfico comparativo */}
        {!loading && datosGrafico.length > 0 && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4">Presupuestado vs Real por Categoría</h2>
            <ResponsiveContainer width="100%" height={Math.max(180, datosGrafico.length * 34)}>
              <BarChart data={datosGrafico} layout="vertical" barSize={9} barGap={2}
                margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
                <XAxis type="number" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, name) => [formatMXN(v), name === 'limite' ? 'Límite' : 'Gastado']} />
                <Bar dataKey="limite"  name="limite"  fill="#e8edf8" radius={[0,4,4,0]} />
                <Bar dataKey="gastado" name="gastado" radius={[0,4,4,0]}>
                  {datosGrafico.map((entry, i) => (
                    <Cell key={i} fill={entry.sobre ? '#ef4444' : (barColors[entry.clasificacion] ?? '#1a3faa')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Haz click en el monto de límite para editarlo · Los presupuestos se guardan por mes
        </p>
      </div>
    </Layout>
  )
}
