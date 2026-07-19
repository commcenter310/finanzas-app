import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { useAhorros } from '../hooks/useAhorros'
import { formatMXN } from '../utils/constantes'
import { Plus, Trash2, Pencil, Check, X, PiggyBank } from 'lucide-react'
import ConfirmModal from '../components/ui/ConfirmModal'
import DatePicker   from '../components/ui/DatePicker'
import ErrorState   from '../components/ui/ErrorState'
import EmptyState   from '../components/ui/EmptyState'
import { fechaLocalISO } from '../utils/fecha'
import { useToast } from '../components/ui/Toast'
import { mensajeErrorOperacion } from '../utils/operaciones'

const CLASIF_OPTS = ['necesidad','deseo','ahorro']
const FORM_VACIO = { concepto:'', monto_meta:'', monto_actual:'', clasificacion:'ahorro' }

const barColors = { necesidad: 'var(--necesidad)', deseo: 'var(--deseo)', ahorro: 'var(--ahorro)' }

const FORM_DEP_VACIO = { monto: '', metodo_pago_id: '', fecha: fechaLocalISO() }

function TarjetaAhorro({ ahorro, metodos, onActualizar, onEliminar, onDepositar, saving }) {
  const toast = useToast()
  const [editando, setEditando] = useState(false)
  const [depositando, setDepositando] = useState(false)
  const [formDep, setFormDep] = useState(FORM_DEP_VACIO)
  const [form, setForm] = useState({ concepto: ahorro.concepto, monto_meta: ahorro.monto_meta, monto_actual: ahorro.monto_actual, clasificacion: ahorro.clasificacion })

  const pct = ahorro.monto_meta > 0 ? Math.min((ahorro.monto_actual / ahorro.monto_meta) * 100, 100) : 0
  const completado = ahorro.monto_actual >= ahorro.monto_meta && ahorro.monto_meta > 0

  const guardar = async () => {
    await onActualizar(ahorro.id, { ...form, monto_meta: Number(form.monto_meta), monto_actual: Number(form.monto_actual) })
    setEditando(false)
  }

  const handleDepositar = async () => {
    if (!formDep.monto) return
    const { error } = await onDepositar(ahorro, formDep)
    if (error) {
      toast(mensajeErrorOperacion(error), 'error')
      return
    }
    toast('Depósito registrado', 'success')
    setFormDep(FORM_DEP_VACIO)
    setDepositando(false)
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
          <button onClick={guardar} className="w-7 h-7 text-white rounded-lg flex items-center justify-center" style={{ background: 'var(--ahorro)' }}><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEditando(false)} className="w-7 h-7 bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-300"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4 self-start" style={completado ? { borderWidth: 2, borderColor: 'var(--ahorro-bg)' } : {}}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-gray-900 text-sm">{ahorro.concepto}</p>
          <span className={`badge-${ahorro.clasificacion} text-xs`}>{ahorro.clasificacion}</span>
          {completado && <span className="ml-1 text-xs font-semibold" style={{ color: 'var(--ahorro-fg)' }}>✅ Meta alcanzada</span>}
        </div>
        <div className="flex gap-1">
          <button onClick={() => { setDepositando(v => !v); setEditando(false) }}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors bg-gray-50 text-gray-400"
            style={depositando ? { background: 'var(--ahorro-bg)', color: 'var(--ahorro-fg)' } : {}}>
            <PiggyBank className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setEditando(true); setDepositando(false) }} className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-700 flex items-center justify-center text-gray-400">
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
          <p className="text-lg font-bold font-mono" style={{ color: 'var(--ahorro-fg)' }}>{formatMXN(ahorro.monto_actual)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Meta</p>
          <p className="text-lg font-bold font-mono text-gray-600">{formatMXN(ahorro.monto_meta)}</p>
        </div>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bar-fill"
          style={{ width: `${pct}%`, backgroundColor: completado ? 'var(--ahorro)' : (barColors[ahorro.clasificacion] ?? 'var(--primary-600)') }} />
      </div>
      <p className="text-xs text-right text-gray-400 mt-1 font-mono">{pct.toFixed(0)}%</p>

      {depositando && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Depositar a esta meta</p>
          <div className="flex gap-2 mb-2">
            <input type="number" className="input text-sm font-mono flex-1" placeholder="Monto ($)"
              value={formDep.monto} onChange={e => setFormDep(f => ({ ...f, monto: e.target.value }))} />
            <DatePicker
              className="w-36"
              value={formDep.fecha}
              onChange={v => setFormDep(f => ({ ...f, fecha: v }))}
            />
          </div>
          <select className="input text-sm mb-2 w-full" value={formDep.metodo_pago_id}
            onChange={e => setFormDep(f => ({ ...f, metodo_pago_id: e.target.value }))}>
            <option value="">Método de pago (opcional)</option>
            {metodos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={handleDepositar} disabled={saving || !formDep.monto}
              className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5">
              <PiggyBank className="w-3.5 h-3.5" />
              {saving ? 'Guardando...' : 'Confirmar depósito'}
            </button>
            <button onClick={() => { setDepositando(false); setFormDep(FORM_DEP_VACIO) }}
              className="btn-ghost text-xs">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Ahorros() {
  const { ahorros, metodos, loading, error, refetch, saving, totales, agregar, actualizar, eliminar, depositar } = useAhorros()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleAgregar = async () => {
    if (!form.concepto) return
    if (!form.monto_meta || Number(form.monto_meta) <= 0) return
    await agregar({ ...form, monto_meta: Number(form.monto_meta), monto_actual: Number(form.monto_actual) || 0 })
    setForm(FORM_VACIO); setMostrarForm(false)
  }

  const pctTotal = totales.meta > 0 ? Math.min((totales.actual / totales.meta) * 100, 100) : 0

  if (error && !loading && ahorros.length === 0) {
    return (
      <Layout titulo="Ahorros">
        <ErrorState onRetry={refetch} mensaje={error} />
      </Layout>
    )
  }

  return (
    <Layout titulo="Ahorros">
      <div className="space-y-5">

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Meta Total</p>
            <p className="text-lg lg:text-xl font-bold font-mono text-gray-600 break-all">{formatMXN(totales.meta)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Total Ahorrado</p>
            <p className="text-lg lg:text-xl font-bold font-mono break-all" style={{ color: 'var(--ahorro-fg)' }}>{formatMXN(totales.actual)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Progreso General</p>
            <p className="text-lg lg:text-xl font-bold font-mono text-primary-700">{pctTotal.toFixed(0)}%</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={() => setMostrarForm(v => !v)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva Meta
          </button>
        </div>

        {mostrarForm && (
          <div className="card p-5 border-2" style={{ borderColor: 'var(--ahorro-bg)' }}>
            <h3 className="font-bold text-gray-900 mb-3">Nueva Meta de Ahorro</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div className="sm:col-span-2">
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
          ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array(3).fill(0).map((_,i) => <div key={i} className="card h-36 animate-pulse bg-gray-50" />)}</div>
          : ahorros.length === 0
            ? (
              <EmptyState
                icon={PiggyBank}
                title="Aun no tienes metas de ahorro"
                description="Crea una meta para apartar dinero y ver el avance contra tu objetivo."
                action={
                  <button onClick={() => setMostrarForm(true)} className="btn-primary text-sm">
                    <Plus className="w-4 h-4" /> Nueva Meta
                  </button>
                }
              />
            )
            : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                {ahorros.map(a => <TarjetaAhorro key={a.id} ahorro={a} metodos={metodos} saving={saving} onActualizar={actualizar} onEliminar={(id) => setConfirmDelete(id)} onDepositar={depositar} />)}
              </div>}

      </div>
      <ConfirmModal
        open={!!confirmDelete}
        titulo="¿Eliminar meta de ahorro?"
        descripcion="Esta acción no se puede deshacer."
        onConfirm={() => { eliminar(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
