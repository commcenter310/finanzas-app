import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { useGastosFijos } from '../hooks/useGastosFijos'
import { formatMXN } from '../utils/constantes'
import { Plus, Trash2, Repeat, CheckCircle2, Circle, Copy } from 'lucide-react'

const CLASIFICACIONES = ['necesidad','deseo','ahorro']

export default function GastosFijos() {
  const { gastos, loading, saving, totales, agregar, togglePagado, eliminar, copiarRecurrentes } = useGastosFijos()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ concepto:'', monto_previsto:'', monto_actual:'', clasificacion:'necesidad', es_recurrente: false })
  const [copiando, setCopiando] = useState(false)
  const [msgCopia, setMsgCopia] = useState('')

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleAgregar = async () => {
    if (!form.concepto || !form.monto_previsto) return
    await agregar(form)
    setForm({ concepto:'', monto_previsto:'', monto_actual:'', clasificacion:'necesidad', es_recurrente: false })
    setMostrarForm(false)
  }

  const handleCopiar = async () => {
    setCopiando(true)
    const { copiados } = await copiarRecurrentes()
    setMsgCopia(copiados > 0 ? `✅ ${copiados} gastos recurrentes copiados` : 'ℹ️ No hay recurrentes en el mes anterior')
    setCopiando(false)
    setTimeout(() => setMsgCopia(''), 3000)
  }

  const pagados = gastos.filter(g => g.pagado).length
  const total   = gastos.length

  return (
    <Layout titulo="Gastos Fijos">
      <div className="space-y-4">

        {/* Tarjetas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[
            { label: 'Total Previsto', value: formatMXN(totales.previsto) },
            { label: 'Total Pagado',   value: formatMXN(totales.actual)   },
            { label: 'Diferencia',     value: formatMXN(totales.previsto - totales.actual) },
            { label: 'Progreso',       value: `${pagados} / ${total}`, sub: 'Facturas pagadas' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="card p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
              <p className="text-xl font-bold font-mono text-primary-700">{value}</p>
              {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>

        {/* Barra de progreso de pagos */}
        {total > 0 && (
          <div className="card p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-700">Facturas pagadas</span>
              <span className="font-mono text-gray-500">{pagados}/{total}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary-700 rounded-full transition-all duration-500"
                style={{ width: `${total > 0 ? (pagados / total) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="card">
          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">Facturas del Mes</h2>
            <div className="flex items-center gap-2">
              {msgCopia && <span className="text-xs text-gray-500">{msgCopia}</span>}
              <button onClick={handleCopiar} disabled={copiando}
                className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3">
                <Copy className="w-3.5 h-3.5" />
                {copiando ? 'Copiando...' : 'Copiar recurrentes'}
              </button>
              <button onClick={() => setMostrarForm(v => !v)}
                className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3">
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>
          </div>

          {/* Formulario */}
          {mostrarForm && (
            <div className="p-4 bg-primary-50 border-b border-primary-100">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
                <div className="col-span-2">
                  <label className="label">Concepto</label>
                  <input className="input text-sm" placeholder="Ej: Gimnasio, Spotify..."
                    value={form.concepto} onChange={e => setF('concepto', e.target.value)} />
                </div>
                <div>
                  <label className="label">Previsto ($)</label>
                  <input type="number" className="input text-sm font-mono"
                    value={form.monto_previsto} onChange={e => setF('monto_previsto', e.target.value)} />
                </div>
                <div>
                  <label className="label">Actual ($)</label>
                  <input type="number" className="input text-sm font-mono"
                    value={form.monto_actual} onChange={e => setF('monto_actual', e.target.value)} />
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select className="input text-sm" value={form.clasificacion}
                    onChange={e => setF('clasificacion', e.target.value)}>
                    {CLASIFICACIONES.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" className="accent-primary-700 w-4 h-4"
                    checked={form.es_recurrente} onChange={e => setF('es_recurrente', e.target.checked)} />
                  <Repeat className="w-3.5 h-3.5 text-gray-400" />
                  Gasto recurrente (se copiará cada mes)
                </label>
                <div className="flex gap-2">
                  <button className="btn-primary text-sm py-1.5 px-4" onClick={handleAgregar} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button className="btn-ghost text-sm" onClick={() => setMostrarForm(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* Lista */}
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-8">✓</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Concepto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Previsto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Actual</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(4).fill(0).map((_,i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-5 bg-gray-50 rounded animate-pulse" /></td></tr>
                ))
                : gastos.length === 0
                  ? <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-300 text-sm">Sin facturas este mes</td></tr>
                  : gastos.map(g => (
                    <tr key={g.id} className={`hover:bg-gray-50 group ${g.pagado ? 'opacity-70' : ''}`}>
                      <td className="px-4 py-3">
                        <button onClick={() => togglePagado(g.id, g.pagado, g.monto_previsto)}>
                          {g.pagado
                            ? <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--ahorro)' }} />
                            : <Circle className="w-5 h-5 text-gray-300 hover:text-primary-400" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{g.concepto}</span>
                          {g.es_recurrente && <Repeat className="w-3 h-3 text-gray-300" title="Recurrente" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-500 text-sm">{formatMXN(g.monto_previsto)}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-sm">
                        {Number(g.monto_actual) > Number(g.monto_previsto)
                          ? <span style={{ color: 'var(--negative-fg)' }}>{formatMXN(g.monto_actual)}</span>
                          : <span className="text-gray-700">{formatMXN(g.monto_actual)}</span>}
                      </td>
                      <td className="px-4 py-3"><span className={`badge-${g.clasificacion}`}>{g.clasificacion}</span></td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{g.fecha_pago ?? '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => eliminar(g.id)}
                          className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all text-gray-300">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
            {gastos.length > 0 && (
              <tfoot className="border-t border-gray-100 bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-4 py-3 font-bold text-gray-700 text-sm">TOTAL</td>
                  <td className="px-4 py-3 font-mono font-bold text-gray-500">{formatMXN(totales.previsto)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-primary-700">{formatMXN(totales.actual)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
          </div>
        </div>

      </div>
    </Layout>
  )
}
