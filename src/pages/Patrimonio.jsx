import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { usePatrimonio } from '../hooks/usePatrimonio'
import { formatMXN, MESES } from '../utils/constantes'
import { Plus, Pencil, Trash2, Save, TrendingUp, TrendingDown, Landmark } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, ReferenceLine
} from 'recharts'

const TIPOS = [
  { value: 'inmueble',  label: '🏠 Inmueble'   },
  { value: 'vehiculo',  label: '🚗 Vehículo'   },
  { value: 'inversion', label: '📈 Inversión'  },
  { value: 'cuenta',    label: '🏦 Cuenta/Ahorro' },
  { value: 'otro',      label: '📦 Otro'        },
]

const FORM_VACIO = { nombre: '', tipo: 'cuenta', monto: '' }

export default function Patrimonio() {
  const {
    loading, saving,
    activos, creditos, snapshots,
    totalActivos, totalDeudas, patrimonioNeto,
    agregar, actualizar, eliminar, guardarSnapshot,
  } = usePatrimonio()

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId]   = useState(null)
  const [form, setForm]               = useState(FORM_VACIO)
  const [snapshotMsg, setSnapshotMsg] = useState('')
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const abrirEditar = (activo) => {
    setForm({ nombre: activo.nombre, tipo: activo.tipo, monto: activo.monto })
    setEditandoId(activo.id)
    setMostrarForm(true)
  }

  const cerrar = () => {
    setMostrarForm(false)
    setEditandoId(null)
    setForm(FORM_VACIO)
  }

  const handleGuardar = async () => {
    if (!form.nombre || !form.monto) return
    const datos = { nombre: form.nombre, tipo: form.tipo, monto: Number(form.monto) }
    const { error } = editandoId
      ? await actualizar(editandoId, datos)
      : await agregar(datos)
    if (!error) cerrar()
  }

  const handleSnapshot = async () => {
    const { error } = await guardarSnapshot()
    if (!error) {
      setSnapshotMsg('✓ Snapshot guardado')
      setTimeout(() => setSnapshotMsg(''), 3000)
    }
  }

  const datosHistorial = snapshots.map(s => ({
    label: `${MESES[s.mes - 1].slice(0, 3)} ${String(s.anio).slice(2)}`,
    activos:    s.total_activos,
    deudas:     s.total_deudas,
    patrimonio: s.patrimonio_neto,
  }))

  const colorPN = patrimonioNeto >= 0 ? 'text-emerald-600' : 'text-red-600'
  const colorPNbg = patrimonioNeto >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'

  return (
    <Layout titulo="Patrimonio Neto">
      <div className="space-y-6">

        {/* Resumen + Snapshot */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-5 border border-emerald-100 bg-emerald-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Activos</p>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold font-mono text-emerald-600">{formatMXN(totalActivos)}</p>
          </div>
          <div className="card p-5 border border-red-100 bg-red-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Deudas</p>
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-red-600">{formatMXN(totalDeudas)}</p>
          </div>
          <div className={`card p-5 border col-span-1 ${colorPNbg}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Patrimonio Neto</p>
              <Landmark className={`w-4 h-4 ${colorPN}`} />
            </div>
            <p className={`text-2xl font-bold font-mono ${colorPN}`}>{formatMXN(patrimonioNeto)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Activos − Deudas</p>
          </div>
          <div className="card p-5 flex flex-col items-center justify-center gap-2 border border-dashed border-gray-200">
            <button onClick={handleSnapshot} disabled={saving}
              className="btn-primary flex items-center gap-2 text-sm w-full justify-center">
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar snapshot del mes'}
            </button>
            {snapshotMsg && <p className="text-xs text-emerald-600 font-semibold">{snapshotMsg}</p>}
            <p className="text-xs text-gray-400 text-center">Guarda una foto del patrimonio actual para el historial</p>
          </div>
        </div>

        {/* Activos */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">Activos</h2>
            <button onClick={() => { setForm(FORM_VACIO); setEditandoId(null); setMostrarForm(v => !v) }}
              className="btn-primary flex items-center gap-2 text-sm py-1.5 px-3">
              <Plus className="w-4 h-4" /> Agregar Activo
            </button>
          </div>

          {mostrarForm && (
            <div className="px-5 py-4 border-b border-gray-50 bg-gray-50">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="label">Nombre</label>
                  <input className="input" placeholder="Ej: Casa, CETES, BBVA..."
                    value={form.nombre} onChange={e => setF('nombre', e.target.value)} />
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select className="input" value={form.tipo} onChange={e => setF('tipo', e.target.value)}>
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Valor actual ($)</label>
                  <input type="number" className="input font-mono" placeholder="0.00"
                    value={form.monto} onChange={e => setF('monto', e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn-primary px-6" onClick={handleGuardar} disabled={saving}>
                  {saving ? 'Guardando...' : editandoId ? 'Actualizar' : 'Agregar'}
                </button>
                <button className="btn-ghost" onClick={cerrar}>Cancelar</button>
              </div>
            </div>
          )}

          {loading
            ? <div className="p-5 space-y-2">{Array(3).fill(0).map((_,i) => <div key={i} className="h-12 bg-gray-50 rounded animate-pulse" />)}</div>
            : activos.length === 0
              ? <div className="py-12 text-center text-gray-300 text-sm">No tienes activos registrados · Agrega tu primera propiedad, inversión o cuenta</div>
              : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {['Tipo','Nombre','Valor',''].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {activos.map(a => {
                      const tipo = TIPOS.find(t => t.value === a.tipo)
                      return (
                        <tr key={a.id} className="hover:bg-gray-50 group">
                          <td className="px-5 py-3 text-sm">{tipo?.label ?? a.tipo}</td>
                          <td className="px-5 py-3 font-semibold text-gray-800">{a.nombre}</td>
                          <td className="px-5 py-3 font-mono font-bold text-emerald-600">{formatMXN(a.monto)}</td>
                          <td className="px-5 py-3">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                              <button onClick={() => abrirEditar(a)}
                                className="w-7 h-7 rounded-lg hover:bg-blue-50 hover:text-blue-500 flex items-center justify-center text-gray-300">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => eliminar(a.id)}
                                className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-300">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="border-t border-gray-100 bg-gray-50">
                    <tr>
                      <td colSpan={2} className="px-5 py-3 font-bold text-gray-700 text-sm">Total Activos</td>
                      <td className="px-5 py-3 font-mono font-bold text-emerald-600">{formatMXN(totalActivos)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              )}
        </div>

        {/* Deudas (readonly) */}
        {creditos.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-bold text-gray-900">Deudas Actuales</h2>
              <p className="text-xs text-gray-400 mt-0.5">Saldo utilizado de tus tarjetas de crédito — se gestiona en la sección Créditos</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Tarjeta','Saldo Utilizado','Límite','Uso'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {creditos.map(c => {
                  const pct = c.limite_credito > 0 ? (c.saldo_utilizado / c.limite_credito) * 100 : 0
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-semibold text-gray-800">{c.nombre}</td>
                      <td className="px-5 py-3 font-mono text-red-600">{formatMXN(c.saldo_utilizado ?? 0)}</td>
                      <td className="px-5 py-3 font-mono text-gray-400">{c.limite_credito ? formatMXN(c.limite_credito) : '—'}</td>
                      <td className="px-5 py-3">
                        {c.limite_credito > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 80 ? '#ef4444' : pct > 30 ? '#f59e0b' : '#10b981' }} />
                            </div>
                            <span className="text-xs font-mono text-gray-400">{pct.toFixed(0)}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t border-gray-100 bg-gray-50">
                <tr>
                  <td className="px-5 py-3 font-bold text-gray-700 text-sm">Total Deudas</td>
                  <td className="px-5 py-3 font-mono font-bold text-red-600">{formatMXN(totalDeudas)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Historial */}
        {datosHistorial.length > 0 && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4">Historial de Patrimonio</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={datosHistorial}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => formatMXN(v)} />
                <Legend />
                <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
                <Line type="monotone" dataKey="activos"    name="Activos"    stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="deudas"     name="Deudas"     stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="patrimonio" name="Patrimonio" stroke="#1a3faa" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {datosHistorial.length === 0 && !loading && (
          <div className="card p-8 text-center border border-dashed border-gray-200">
            <p className="text-gray-400 text-sm mb-1">Sin historial de patrimonio aún</p>
            <p className="text-xs text-gray-300">Usa el botón "Guardar snapshot del mes" para empezar a registrar tu evolución</p>
          </div>
        )}

      </div>
    </Layout>
  )
}
