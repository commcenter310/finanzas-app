import { useState } from 'react'
import Layout from '../components/layout/Layout'
import Resumen from '../components/ui/Resumen'
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
      <li className="meta-edicion">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="col-span-2">
            <label className="label" htmlFor={`meta-nombre-${ahorro.id}`}>Nombre</label>
            <input id={`meta-nombre-${ahorro.id}`} className="input" value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} />
          </div>
          <div>
            <label className="label" htmlFor={`meta-meta-${ahorro.id}`}>Meta</label>
            <input id={`meta-meta-${ahorro.id}`} type="number" className="input" value={form.monto_meta} onChange={e => setForm(f => ({ ...f, monto_meta: e.target.value }))} />
          </div>
          <div>
            <label className="label" htmlFor={`meta-actual-${ahorro.id}`}>Ahorrado</label>
            <input id={`meta-actual-${ahorro.id}`} type="number" className="input" value={form.monto_actual} onChange={e => setForm(f => ({ ...f, monto_actual: e.target.value }))} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <select className="input w-auto" aria-label="Clasificación" value={form.clasificacion} onChange={e => setForm(f => ({ ...f, clasificacion: e.target.value }))}>
            {CLASIF_OPTS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" className="btn-ghost ml-auto" style={{ color: 'var(--negative-fg)' }}
            onClick={() => { setEditando(false); onEliminar(ahorro.id) }}>
            <Trash2 className="w-4 h-4" aria-hidden="true" /> Eliminar
          </button>
          <button type="button" onClick={() => setEditando(false)} className="btn-ghost">Cancelar</button>
          <button type="button" onClick={guardar} className="btn-primary"><Check className="w-3.5 h-3.5" aria-hidden="true" /> Guardar</button>
        </div>
      </li>
    )
  }

  return (
    <li className="meta-fila group">
      <div className="meta-principal">
        <span className="meta-nombre">
          <button type="button" className="meta-abrir" onClick={() => { setEditando(true); setDepositando(false) }} title="Editar">
            {ahorro.concepto}
          </button>
          {completado && <small style={{ color: 'var(--positive-fg)' }}>meta alcanzada</small>}
        </span>
        <span className="meta-uso">
          <span className="presu-barra" aria-hidden="true">
            <span style={{ width: `${pct}%`, background: 'var(--ahorro)' }} />
          </span>
          <span className="presu-pct">{pct.toFixed(0)}%</span>
        </span>
        <span className="meta-monto">
          {formatMXN(ahorro.monto_actual)} <small>de {formatMXN(ahorro.monto_meta)}</small>
        </span>
        <span className="meta-ultimo">
          {ultimoDeposito && (
            <>
              último {formatMXN(ultimoDeposito.monto)} · {fechaCorta(ultimoDeposito.fecha)} ·{' '}
              <button type="button" className="underline underline-offset-2" style={{ color: 'var(--primary-700)' }}
                onClick={() => setConfirmDeshacer(true)} disabled={saving}>
                deshacer
              </button>
            </>
          )}
        </span>
        <button type="button" onClick={() => { setDepositando(v => !v); setEditando(false) }}
          className={`btn-check meta-depositar ${depositando ? 'is-on' : ''}`} aria-expanded={depositando}>
          <PiggyBank className="w-4 h-4" aria-hidden="true" /> Depositar
        </button>
        <span className="acciones-hover meta-herramientas">
          <button aria-label={`Editar ${ahorro.concepto}`} title="Editar" onClick={() => { setEditando(true); setDepositando(false) }} className="icon-button icon-button-sm">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button aria-label={`Eliminar ${ahorro.concepto}`} title="Eliminar" onClick={() => onEliminar(ahorro.id)} className="icon-button icon-button-sm">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </span>
      </div>

      <ConfirmModal
        open={confirmDeshacer}
        titulo={`¿Deshacer el depósito de ${formatMXN(ultimoDeposito?.monto)}?`}
        descripcion={`Se restará de "${ahorro.concepto}" y se borrará su movimiento. Si lo pagaste con tarjeta, también se devuelve a su saldo.`}
        onConfirm={async () => { setConfirmDeshacer(false); await deshacer(ultimoDeposito.id) }}
        onCancel={() => setConfirmDeshacer(false)}
      />

      {depositando && (
        <div className="meta-deposito">
          <input type="number" className="input" placeholder="Monto" aria-label={`Monto a depositar en ${ahorro.concepto}`}
            value={formDep.monto} onChange={e => setFormDep(f => ({ ...f, monto: e.target.value }))} />
          <DatePicker
            value={formDep.fecha}
            onChange={v => setFormDep(f => ({ ...f, fecha: v }))}
          />
          <select className="input" aria-label="Método de pago" value={formDep.metodo_pago_id}
            onChange={e => setFormDep(f => ({ ...f, metodo_pago_id: e.target.value }))}>
            <option value="">Sin método</option>
            {metodos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          <span className="flex gap-2">
            <button type="button" onClick={() => { setDepositando(false); setFormDep(FORM_DEP_VACIO) }} className="btn-ghost">
              Cancelar
            </button>
            <button type="button" onClick={handleDepositar} disabled={saving || !formDep.monto} className="btn-primary">
              {saving ? 'Guardando...' : 'Depositar'}
            </button>
          </span>
        </div>
      )}
    </li>
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
    <Layout titulo="Ahorros" acciones={(
      <button type="button" onClick={() => setMostrarForm(v => !v)} className="btn-primary">
        <Plus className="w-4 h-4" aria-hidden="true" /> <span>Nueva meta</span>
      </button>
    )}>
      <div className="space-y-3">

        <Resumen
          titulo="Llevas ahorrado"
          cifra={formatMXN(totales.actual)}
          nota={ahorros.length > 0 ? `${pctTotal.toFixed(0)}% de ${formatMXN(totales.meta)} entre ${ahorros.length === 1 ? 'una meta' : `${ahorros.length} metas`}` : null}
          progreso={ahorros.length > 0 ? pctTotal : null}
          cargando={loading}
        />

        {mostrarForm && (
          <div className="card p-4">
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
          ? <div className="space-y-2">{Array(3).fill(0).map((_,i) => <div key={i} className="card h-12 animate-pulse" />)}</div>
          : ahorros.length === 0
            ? (
              <EmptyState
                icon={PiggyBank}
                title="Aún no tienes metas de ahorro"
                description="Crea una meta para apartar dinero y ver el avance contra tu objetivo."
                action={
                  <button onClick={() => setMostrarForm(true)} className="btn-primary text-sm">
                    <Plus className="w-4 h-4" /> Nueva meta
                  </button>
                }
              />
            )
            : <ul className="card">
                {ahorros.map(a => <TarjetaAhorro key={a.id} ahorro={a} metodos={metodos} ultimoDeposito={ultimoDeposito[a.id]} saving={saving} onActualizar={actualizar} onEliminar={(id) => setConfirmDelete(id)} onDepositar={depositar} onDeshacerDeposito={deshacerDeposito} />)}
              </ul>}

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
