import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { useAhorros } from '../hooks/useAhorros'
import { formatMXN } from '../utils/constantes'
import { Plus, Trash2, Pencil, Check, PiggyBank } from 'lucide-react'
import ConfirmModal from '../components/ui/ConfirmModal'
import DatePicker   from '../components/ui/DatePicker'
import ErrorState   from '../components/ui/ErrorState'
import EmptyState   from '../components/ui/EmptyState'
import { fechaCorta, fechaLocalISO } from '../utils/fecha'
import { esMontoPositivo, textoLimpio } from '../utils/validaciones'
import { useToast } from '../components/ui/Toast'
import { mensajeErrorOperacion } from '../utils/operaciones'

const CLASIF_OPTS = ['necesidad','deseo','ahorro']
const FORM_VACIO = { concepto:'', monto_meta:'', monto_actual:'', clasificacion:'ahorro' }


const FORM_DEP_VACIO = { monto: '', metodo_pago_id: '', fecha: fechaLocalISO() }

function TarjetaAhorro({ ahorro, metodos, ultimoDeposito, onActualizar, onEliminar, onDepositar, onDeshacerDeposito, saving }) {
  const toast = useToast()
  const [editando, setEditando] = useState(false)
  const [depositando, setDepositando] = useState(false)
  const [formDep, setFormDep] = useState(FORM_DEP_VACIO)
  const [form, setForm] = useState({ concepto: ahorro.concepto, monto_meta: ahorro.monto_meta, monto_actual: ahorro.monto_actual, clasificacion: ahorro.clasificacion })

  const pct = ahorro.monto_meta > 0 ? Math.min((ahorro.monto_actual / ahorro.monto_meta) * 100, 100) : 0
  const completado = ahorro.monto_actual >= ahorro.monto_meta && ahorro.monto_meta > 0

  const guardar = async () => {
    if (!textoLimpio(form.concepto)) return toast('La meta necesita un nombre.', 'error')
    if (!esMontoPositivo(form.monto_meta)) return toast('La meta debe ser un monto mayor a cero.', 'error')
    if (Number(form.monto_actual) < 0) return toast('Lo ahorrado no puede ser negativo.', 'error')
    const { error } = await onActualizar(ahorro.id, { ...form, concepto: textoLimpio(form.concepto), monto_meta: Number(form.monto_meta), monto_actual: Number(form.monto_actual) })
    if (error) {
      toast('No se pudo guardar la meta. Intenta de nuevo.', 'error')
      return
    }
    setEditando(false)
  }

  const [confirmDeshacer, setConfirmDeshacer] = useState(false)

  const deshacer = async (transaccionId) => {
    const { error } = await onDeshacerDeposito(transaccionId)
    toast(error ? mensajeErrorOperacion(error) : 'Depósito deshecho', error ? 'error' : 'info')
  }

  const handleDepositar = async () => {
    if (!formDep.monto) return
    const { error, transaccionId } = await onDepositar(ahorro, formDep)
    if (error) {
      toast(mensajeErrorOperacion(error), 'error')
      return
    }
    toast('Depósito registrado', 'success', transaccionId
      ? { accion: { etiqueta: 'Deshacer', onClick: () => deshacer(transaccionId) } }
      : {})
    setFormDep(FORM_DEP_VACIO)
    setDepositando(false)
  }

  if (editando) {
    return (
      <div className="card p-4">
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
          <button onClick={guardar} className="btn-primary py-2"><Check className="w-3.5 h-3.5" /> Guardar</button>
          <button onClick={() => setEditando(false)} className="btn-ghost py-2">Cancelar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5 self-start">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{ahorro.concepto}</p>
          {completado && <span className="text-[13px] font-medium" style={{ color: 'var(--positive-fg)' }}>Meta alcanzada</span>}
        </div>
        <div className="flex gap-1">
          <button onClick={() => { setDepositando(v => !v); setEditando(false) }}
            className="icon-button icon-button-sm"
            style={depositando ? { background: 'var(--ahorro-bg)', color: 'var(--ahorro-fg)' } : {}}
            aria-label={`Depositar a ${ahorro.concepto}`} title="Depositar">
            <PiggyBank className="w-3.5 h-3.5" />
          </button>
          <button aria-label={`Editar ${ahorro.concepto}`} title="Editar" onClick={() => { setEditando(true); setDepositando(false) }} className="icon-button icon-button-sm">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button aria-label={`Eliminar ${ahorro.concepto}`} title="Eliminar" onClick={() => onEliminar(ahorro.id)} className="icon-button icon-button-sm">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="stat-value">{formatMXN(ahorro.monto_actual)}</p>
      <p className="text-[13px] text-gray-500 mb-3">de {formatMXN(ahorro.monto_meta)} · {pct.toFixed(0)}%</p>

      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bar-fill"
          style={{ width: `${pct}%`, backgroundColor: 'var(--ahorro)' }} />
      </div>

      {ultimoDeposito && (
        <p className="text-[13px] mt-3" style={{ color: 'var(--fg-3)' }}>
          Último depósito: <span className="font-mono">{formatMXN(ultimoDeposito.monto)}</span> · {fechaCorta(ultimoDeposito.fecha)}
          {' · '}
          <button type="button" className="font-semibold underline underline-offset-2" style={{ color: 'var(--primary-700)' }}
            onClick={() => setConfirmDeshacer(true)} disabled={saving}>
            Deshacer
          </button>
        </p>
      )}
      <ConfirmModal
        open={confirmDeshacer}
        titulo={`¿Deshacer el depósito de ${formatMXN(ultimoDeposito?.monto)}?`}
        descripcion={`Se restará de "${ahorro.concepto}" y se borrará su movimiento. Si lo pagaste con tarjeta, también se devuelve a su saldo.`}
        onConfirm={async () => { setConfirmDeshacer(false); await deshacer(ultimoDeposito.id) }}
        onCancel={() => setConfirmDeshacer(false)}
      />

      {depositando && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2">Depositar a esta meta</p>
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
  const { ahorros, metodos, ultimoDeposito, deshacerDeposito, loading, error, refetch, saving, totales, agregar, actualizar, eliminar, depositar } = useAhorros()
  const toast = useToast()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleAgregar = async () => {
    if (!textoLimpio(form.concepto)) return toast('Escribe para qué es la meta de ahorro.', 'error')
    if (!esMontoPositivo(form.monto_meta)) return toast('La meta debe ser un monto mayor a cero.', 'error')
    const { error } = await agregar({ ...form, concepto: textoLimpio(form.concepto), monto_meta: Number(form.monto_meta), monto_actual: Number(form.monto_actual) || 0 })
    if (error) {
      toast('No se pudo crear la meta. Intenta de nuevo.', 'error')
      return
    }
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

        <div className="stat-strip grid grid-cols-2 lg:grid-cols-3">
          <div className="card p-4">
            <p className="stat-label">Meta total</p>
            <p className="stat-value break-all">{formatMXN(totales.meta)}</p>
          </div>
          <div className="card p-4">
            <p className="stat-label">Ahorrado</p>
            <p className="stat-value break-all">{formatMXN(totales.actual)}</p>
          </div>
          <div className="card p-4">
            <p className="stat-label">Avance</p>
            <p className="stat-value">{pctTotal.toFixed(0)}%</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={() => setMostrarForm(v => !v)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva meta
          </button>
        </div>

        {mostrarForm && (
          <div className="card p-5 border-2" style={{ borderColor: 'var(--ahorro-bg)' }}>
            <h3 className="titulo-seccion mb-3">Nueva meta de ahorro</h3>
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
          ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array(3).fill(0).map((_,i) => <div key={i} className="card h-36 animate-pulse" />)}</div>
          : ahorros.length === 0
            ? (
              <EmptyState
                icon={PiggyBank}
                title="Aun no tienes metas de ahorro"
                description="Crea una meta para apartar dinero y ver el avance contra tu objetivo."
                action={
                  <button onClick={() => setMostrarForm(true)} className="btn-primary text-sm">
                    <Plus className="w-4 h-4" /> Nueva meta
                  </button>
                }
              />
            )
            : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                {ahorros.map(a => <TarjetaAhorro key={a.id} ahorro={a} metodos={metodos} ultimoDeposito={ultimoDeposito[a.id]} saving={saving} onActualizar={actualizar} onEliminar={(id) => setConfirmDelete(id)} onDepositar={depositar} onDeshacerDeposito={deshacerDeposito} />)}
              </div>}

      </div>
      <ConfirmModal
        open={!!confirmDelete}
        titulo="¿Eliminar meta de ahorro?"
        descripcion="Esta acción no se puede deshacer."
        onConfirm={async () => {
          const id = confirmDelete
          setConfirmDelete(null)
          const { error } = await eliminar(id)
          if (error) toast('No se pudo eliminar. Intenta de nuevo.', 'error')
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
