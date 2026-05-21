import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { useCreditos } from '../hooks/useCreditos'
import { formatMXN } from '../utils/constantes'
import { Plus, Pencil, Trash2, AlertTriangle, Bell } from 'lucide-react'

function getAlerta(credito) {
  const hoy = new Date().getDate()
  const diasParaCorte = credito.fecha_corte >= hoy
    ? credito.fecha_corte - hoy
    : 30 - hoy + credito.fecha_corte
  const diasParaPago = credito.fecha_pago >= hoy
    ? credito.fecha_pago - hoy
    : 30 - hoy + credito.fecha_pago
  const enRangoOptimo = credito.mejor_fecha_inicio && credito.mejor_fecha_fin
    ? hoy >= credito.mejor_fecha_inicio && hoy <= credito.mejor_fecha_fin
    : false
  return { diasParaCorte, diasParaPago, enRangoOptimo }
}

function TarjetaCredito({ credito, onEditar, onEliminar }) {
  const { diasParaCorte, diasParaPago, enRangoOptimo } = getAlerta(credito)
  const pctUso = credito.limite_credito > 0
    ? (credito.saldo_utilizado / credito.limite_credito) * 100 : 0
  const alertaPago  = diasParaPago <= 5
  const alertaCorte = diasParaCorte <= 5

  return (
    <div className={`card p-5 ${alertaPago ? 'border-red-200 border-2' : alertaCorte ? 'border-amber-200 border-2' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900">{credito.nombre}</h3>
          {enRangoOptimo && (
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
              ✅ Excelente fecha de uso
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEditar(credito)}
            className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-700 flex items-center justify-center text-gray-400">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEliminar(credito.id)}
            className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {credito.limite_credito > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-gray-500">Saldo utilizado</span>
            <span className="font-mono font-bold text-gray-800">
              {formatMXN(credito.saldo_utilizado)}
              <span className="text-gray-400 font-normal"> / {formatMXN(credito.limite_credito)}</span>
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(pctUso, 100)}%`, backgroundColor: pctUso > 80 ? '#ef4444' : pctUso > 50 ? '#f59e0b' : '#10b981' }} />
          </div>
          <p className="text-xs text-right text-gray-400 mt-1">{pctUso.toFixed(0)}% utilizado</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className={`rounded-lg p-3 ${alertaCorte ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
          <p className="text-xs text-gray-400 mb-0.5">Fecha de Corte</p>
          <p className="font-bold text-gray-800 font-mono">Día {credito.fecha_corte}</p>
          <p className={`text-xs mt-0.5 ${alertaCorte ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
            {alertaCorte
              ? <span className="flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />Faltan {diasParaCorte} días</span>
              : `En ${diasParaCorte} días`}
          </p>
        </div>
        <div className={`rounded-lg p-3 ${alertaPago ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
          <p className="text-xs text-gray-400 mb-0.5">Fecha de Pago</p>
          <p className="font-bold text-gray-800 font-mono">Día {credito.fecha_pago}</p>
          <p className={`text-xs mt-0.5 ${alertaPago ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
            {alertaPago
              ? <span className="flex items-center gap-0.5"><Bell className="w-3 h-3" />¡{diasParaPago} días!</span>
              : `En ${diasParaPago} días`}
          </p>
        </div>
      </div>

      {credito.mejor_fecha_inicio && (
        <div className="mt-3 p-2.5 bg-primary-50 rounded-lg border border-primary-100">
          <p className="text-xs text-primary-700 font-semibold">
            Mejor fecha de uso: días {credito.mejor_fecha_inicio} al {credito.mejor_fecha_fin}
          </p>
        </div>
      )}
    </div>
  )
}

const FORM_VACIO = { nombre:'', fecha_corte:'', fecha_pago:'', mejor_fecha_inicio:'', mejor_fecha_fin:'', limite_credito:'', saldo_utilizado:'' }

export default function Creditos() {
  const { creditos, loading, saving, agregar, actualizar, eliminar } = useCreditos()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleEditar = (credito) => {
    setForm({ ...credito, limite_credito: credito.limite_credito ?? '', saldo_utilizado: credito.saldo_utilizado ?? '' })
    setEditando(credito.id)
    setMostrarForm(true)
  }

  const handleGuardar = async () => {
    if (!form.nombre) return
    const datos = {
      ...form,
      fecha_corte:        Number(form.fecha_corte),
      fecha_pago:         Number(form.fecha_pago),
      mejor_fecha_inicio: form.mejor_fecha_inicio ? Number(form.mejor_fecha_inicio) : null,
      mejor_fecha_fin:    form.mejor_fecha_fin    ? Number(form.mejor_fecha_fin)    : null,
      limite_credito:     form.limite_credito      ? Number(form.limite_credito)     : null,
      saldo_utilizado:    form.saldo_utilizado     ? Number(form.saldo_utilizado)    : 0,
    }
    if (editando) await actualizar(editando, datos)
    else await agregar(datos)
    setForm(FORM_VACIO); setEditando(null); setMostrarForm(false)
  }

  const totalSaldo = creditos.reduce((s, c) => s + Number(c.saldo_utilizado ?? 0), 0)

  return (
    <Layout titulo="Créditos">
      <div className="space-y-5">

        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Tarjetas Activas</p>
            <p className="text-xl font-bold font-mono text-primary-700">{creditos.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Saldo Total Utilizado</p>
            <p className="text-xl font-bold font-mono text-amber-600">{formatMXN(totalSaldo)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Pagos Próximos</p>
            <p className="text-xl font-bold font-mono text-red-600">
              {creditos.filter(c => getAlerta(c).diasParaPago <= 5).length} alertas
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={() => { setForm(FORM_VACIO); setEditando(null); setMostrarForm(v => !v) }}
            className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Agregar Tarjeta
          </button>
        </div>

        {mostrarForm && (
          <div className="card p-5 border-2 border-primary-200">
            <h3 className="font-bold text-gray-900 mb-4">{editando ? 'Editar Tarjeta' : 'Nueva Tarjeta'}</h3>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div className="col-span-2">
                <label className="label">Nombre</label>
                <input className="input" placeholder="NU, Simplicity, Liverpool..."
                  value={form.nombre} onChange={e => setF('nombre', e.target.value)} />
              </div>
              <div>
                <label className="label">Límite de Crédito</label>
                <input type="number" className="input font-mono"
                  value={form.limite_credito} onChange={e => setF('limite_credito', e.target.value)} />
              </div>
              <div>
                <label className="label">Saldo Utilizado</label>
                <input type="number" className="input font-mono"
                  value={form.saldo_utilizado} onChange={e => setF('saldo_utilizado', e.target.value)} />
              </div>
              <div>
                <label className="label">Fecha de Corte (día)</label>
                <input type="number" min="1" max="31" className="input font-mono" placeholder="18"
                  value={form.fecha_corte} onChange={e => setF('fecha_corte', e.target.value)} />
              </div>
              <div>
                <label className="label">Fecha de Pago (día)</label>
                <input type="number" min="1" max="31" className="input font-mono" placeholder="30"
                  value={form.fecha_pago} onChange={e => setF('fecha_pago', e.target.value)} />
              </div>
              <div>
                <label className="label">Mejor Fecha Inicio</label>
                <input type="number" min="1" max="31" className="input font-mono" placeholder="19"
                  value={form.mejor_fecha_inicio} onChange={e => setF('mejor_fecha_inicio', e.target.value)} />
              </div>
              <div>
                <label className="label">Mejor Fecha Fin</label>
                <input type="number" min="1" max="31" className="input font-mono" placeholder="29"
                  value={form.mejor_fecha_fin} onChange={e => setF('mejor_fecha_fin', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary px-6" onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button className="btn-ghost" onClick={() => setMostrarForm(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {loading
          ? <div className="grid grid-cols-3 gap-4">{Array(3).fill(0).map((_,i) => <div key={i} className="card h-48 animate-pulse bg-gray-50" />)}</div>
          : creditos.length === 0
            ? <div className="card p-16 text-center text-gray-300 text-sm">No tienes tarjetas de crédito registradas</div>
            : <div className="grid grid-cols-3 gap-4">
                {creditos.map(c => <TarjetaCredito key={c.id} credito={c} onEditar={handleEditar} onEliminar={eliminar} />)}
              </div>}

      </div>
    </Layout>
  )
}
