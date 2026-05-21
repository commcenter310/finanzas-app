import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { useAhorros } from '../hooks/useAhorros'
import { formatMXN } from '../utils/constantes'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'

const CLASIF_OPTS = ['necesidad','deseo','ahorro']
const FORM_VACIO = { concepto:'', monto_meta:'', monto_actual:'', clasificacion:'ahorro' }

const barColors = { necesidad: '#2563eb', deseo: '#f59e0b', ahorro: '#10b981' }

function TarjetaAhorro({ ahorro, onActualizar, onEliminar }) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({ concepto: ahorro.concepto, monto_meta: ahorro.monto_meta, monto_actual: ahorro.monto_actual, clasificacion: ahorro.clasificacion })

  const pct = ahorro.monto_meta > 0 ? Math.min((ahorro.monto_actual / ahorro.monto_meta) * 100, 100) : 0
  const completado = ahorro.monto_actual >= ahorro.monto_meta && ahorro.monto_meta > 0

  const guardar = async () => {
    await onActualizar(ahorro.id, { ...form, monto_meta: Number(form.monto_meta), monto_actual: Number(form.monto_actual) })
    setEditando(false)
  }

  if (editando) {
    return (
      <div className="card p-4 border-2 border-primary-200">
        <div className="space-y-2 mb-3">
          <input className="input text-sm" value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" className="input text-sm font-mono" placeholder="Meta" value={form.monto_meta} onChange={e => setForm(f => ({ ...f, monto_meta: e.target.value }))} />
            <input type="number" className="input text-sm font-mono" placeholder="Actual" value={form.monto_actual} onChange={e => setForm(f => ({ ...f, monto_actual: e.target.value }))} />
          </div>
          <select className="input text-sm" value={form.clasificacion} onChange={e => setForm(f => ({ ...f, clasificacion: e.target.value }))}>
            {CLASIF_OPTS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={guardar} className="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEditando(false)} className="w-7 h-7 bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-300"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    )
  }

  return (
    <div className={`card p-4 ${completado ? 'border-emerald-200 border-2' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-gray-900 text-sm">{ahorro.concepto}</p>
          <span className={`badge-${ahorro.clasificacion} text-xs`}>{ahorro.clasificacion}</span>
          {completado && <span className="ml-1 text-xs text-emerald-600 font-semibold">✅ Meta alcanzada</span>}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setEditando(true)} className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-700 flex items-center justify-center text-gray-400">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEliminar(ahorro.id)} className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex justify-between mb-2">
        <div>
          <p className="text-xs text-gray-400">Ahorrado</p>
          <p className="text-lg font-bold font-mono text-emerald-600">{formatMXN(ahorro.monto_actual)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Meta</p>
          <p className="text-lg font-bold font-mono text-gray-600">{formatMXN(ahorro.monto_meta)}</p>
        </div>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: completado ? '#10b981' : (barColors[ahorro.clasificacion] ?? '#1a3faa') }} />
      </div>
      <p className="text-xs text-right text-gray-400 mt-1 font-mono">{pct.toFixed(0)}%</p>
    </div>
  )
}

export default function Ahorros() {
  const { ahorros, loading, saving, totales, agregar, actualizar, eliminar } = useAhorros()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAgregar = async () => {
    if (!form.concepto || !form.monto_meta) return
    await agregar({ ...form, monto_meta: Number(form.monto_meta), monto_actual: Number(form.monto_actual) || 0 })
    setForm(FORM_VACIO); setMostrarForm(false)
  }

  const pctTotal = totales.meta > 0 ? Math.min((totales.actual / totales.meta) * 100, 100) : 0

  return (
    <Layout titulo="Ahorros">
      <div className="space-y-5">

        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Meta Total</p>
            <p className="text-xl font-bold font-mono text-gray-600">{formatMXN(totales.meta)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Total Ahorrado</p>
            <p className="text-xl font-bold font-mono text-emerald-600">{formatMXN(totales.actual)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Progreso General</p>
            <p className="text-xl font-bold font-mono text-primary-700">{pctTotal.toFixed(0)}%</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={() => setMostrarForm(v => !v)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva Meta
          </button>
        </div>

        {mostrarForm && (
          <div className="card p-5 border-2 border-emerald-200">
            <h3 className="font-bold text-gray-900 mb-3">Nueva Meta de Ahorro</h3>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div className="col-span-2">
                <label className="label">Concepto</label>
                <input className="input" placeholder="Ej: Fondo emergencia, Viaje..."
                  value={form.concepto} onChange={e => setF('concepto', e.target.value)} />
              </div>
              <div>
                <label className="label">Meta ($)</label>
                <input type="number" className="input font-mono"
                  value={form.monto_meta} onChange={e => setF('monto_meta', e.target.value)} />
              </div>
              <div>
                <label className="label">Ya ahorrado ($)</label>
                <input type="number" className="input font-mono"
                  value={form.monto_actual} onChange={e => setF('monto_actual', e.target.value)} />
              </div>
              <div>
                <label className="label">Clasificación</label>
                <select className="input" value={form.clasificacion} onChange={e => setF('clasificacion', e.target.value)}>
                  {CLASIF_OPTS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary px-6" onClick={handleAgregar} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button className="btn-ghost" onClick={() => setMostrarForm(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {loading
          ? <div className="grid grid-cols-3 gap-4">{Array(3).fill(0).map((_,i) => <div key={i} className="card h-36 animate-pulse bg-gray-50" />)}</div>
          : ahorros.length === 0
            ? <div className="card p-16 text-center text-gray-300 text-sm">Sin metas de ahorro este mes. ¡Crea la primera!</div>
            : <div className="grid grid-cols-3 gap-4">
                {ahorros.map(a => <TarjetaAhorro key={a.id} ahorro={a} onActualizar={actualizar} onEliminar={eliminar} />)}
              </div>}

      </div>
    </Layout>
  )
}
