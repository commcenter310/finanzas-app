import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { useCreditos } from '../hooks/useCreditos'
import { formatMXN } from '../utils/constantes'
import { Plus, Pencil, Trash2, AlertTriangle, Bell } from 'lucide-react'
import ConfirmModal from '../components/ui/ConfirmModal'

function calcularFechasOptimas(fechaCorte) {
  const buf = 5
  return {
    inicioOptimo: fechaCorte === 31 ? 1 : fechaCorte + 1,
    finOptimo:    fechaCorte - buf > 0 ? fechaCorte - buf : 31 + fechaCorte - buf,
    inicioEvitar: fechaCorte - buf + 1 > 0 ? fechaCorte - buf + 1 : 31 + fechaCorte - buf + 1,
    finEvitar:    fechaCorte,
  }
}

function estaEnRango(hoy, inicio, fin) {
  return inicio <= fin
    ? hoy >= inicio && hoy <= fin
    : hoy >= inicio || hoy <= fin
}

function getAlerta(credito) {
  const hoy = new Date().getDate()
  const diasParaCorte = credito.fecha_corte >= hoy
    ? credito.fecha_corte - hoy : 30 - hoy + credito.fecha_corte
  const diasParaPago = credito.fecha_pago >= hoy
    ? credito.fecha_pago - hoy : 30 - hoy + credito.fecha_pago
  const { inicioOptimo, finOptimo, inicioEvitar, finEvitar } = calcularFechasOptimas(credito.fecha_corte)
  return {
    diasParaCorte, diasParaPago,
    enRangoOptimo: estaEnRango(hoy, inicioOptimo, finOptimo),
    enRangoEvitar: estaEnRango(hoy, inicioEvitar, finEvitar),
    inicioOptimo, finOptimo, inicioEvitar, finEvitar,
  }
}

function TarjetaCredito({ credito, metodos, onEditar, onEliminar }) {
  const { diasParaCorte, diasParaPago, enRangoOptimo, enRangoEvitar, inicioOptimo, finOptimo, inicioEvitar, finEvitar } = getAlerta(credito)
  const pctUso = credito.limite_credito > 0
    ? (credito.saldo_utilizado / credito.limite_credito) * 100 : 0
  const alertaPago   = diasParaPago <= 5
  const alertaCorte  = diasParaCorte <= 5
  const sobreLimite  = pctUso > 30
  const metodoVinculado = metodos?.find(m => m.credito_id === credito.id)
  const colorBarra = pctUso > 80 ? '#EE4D63' : pctUso > 30 ? '#F2913E' : '#0FA978'

  const fmtRango = (inicio, fin) =>
    inicio <= fin ? `días ${inicio} al ${fin}` : `días ${inicio} al ${fin} (mes sig.)`

  return (
    <div className={`card p-5 ${alertaPago ? 'border-red-200 border-2' : alertaCorte ? 'border-amber-200 border-2' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1">
          <h3 className="font-bold text-gray-900">{credito.nombre}</h3>
          <div className="flex flex-wrap gap-1">
            {metodoVinculado && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'var(--primary-50)', color: 'var(--primary-700)', border: '1px solid var(--primary-200)' }}>
                via {metodoVinculado.nombre}
              </span>
            )}
            {enRangoOptimo && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                ✅ Úsala hoy
              </span>
            )}
            {enRangoEvitar && (
              <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200 font-semibold">
                ⚠️ Evita usarla hoy
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
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
            <span className="font-mono font-bold" style={{ color: colorBarra }}>
              {pctUso.toFixed(0)}%
              <span className="text-gray-400 font-normal ml-1">
                ({formatMXN(credito.saldo_utilizado)} / {formatMXN(credito.limite_credito)})
              </span>
            </span>
          </div>
          {/* Barra con marcador del 30% */}
          <div className="relative h-2 bg-gray-100 rounded-full overflow-visible mb-1">
            <div className="h-full rounded-full transition-all overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pctUso, 100)}%`, backgroundColor: colorBarra }} />
            </div>
            {/* Marcador 30% */}
            <div className="absolute top-0 h-full" style={{ left: '30%' }}>
              <div className="w-0.5 h-3 -mt-0.5 bg-amber-400 rounded" />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-amber-500 font-mono">30%</span>
            {sobreLimite
              ? <span className="text-xs text-amber-600 font-semibold">⚠️ Supera el 30% recomendado</span>
              : <span className="text-xs text-emerald-600 font-semibold">✓ Dentro del límite recomendado</span>
            }
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
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

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg px-3 py-2 bg-emerald-50 border border-emerald-100">
          <p className="text-emerald-600 font-semibold mb-0.5">Óptimo</p>
          <p className="text-emerald-700 font-mono">{fmtRango(inicioOptimo, finOptimo)}</p>
        </div>
        <div className="rounded-lg px-3 py-2 bg-red-50 border border-red-100">
          <p className="text-red-500 font-semibold mb-0.5">Evitar</p>
          <p className="text-red-600 font-mono">{fmtRango(inicioEvitar, finEvitar)}</p>
        </div>
      </div>
    </div>
  )
}

const FORM_VACIO = { nombre:'', fecha_corte:'', fecha_pago:'', limite_credito:'', saldo_utilizado:'', metodo_vinculado_id:'' }

export default function Creditos() {
  const { creditos, metodos, loading, saving, agregar, actualizar, eliminar, vincularMetodo } = useCreditos()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleEditar = (credito) => {
    const metodoVinculado = metodos.find(m => m.credito_id === credito.id)
    setForm({
      nombre:             credito.nombre,
      fecha_corte:        credito.fecha_corte ?? '',
      fecha_pago:         credito.fecha_pago  ?? '',
      limite_credito:     credito.limite_credito  ?? '',
      saldo_utilizado:    credito.saldo_utilizado ?? '',
      metodo_vinculado_id: metodoVinculado?.id ?? '',
    })
    setEditando(credito.id)
    setMostrarForm(true)
  }

  const handleGuardar = async () => {
    if (!form.nombre) return
    const datos = {
      nombre:             form.nombre,
      fecha_corte:        Number(form.fecha_corte),
      fecha_pago:         Number(form.fecha_pago),
      mejor_fecha_inicio: null,
      mejor_fecha_fin:    null,
      limite_credito:     form.limite_credito  ? Number(form.limite_credito)  : null,
      saldo_utilizado:    form.saldo_utilizado ? Number(form.saldo_utilizado) : 0,
    }
    let creditoId = editando
    if (editando) {
      await actualizar(editando, datos)
    } else {
      const { data } = await agregar(datos)
      creditoId = data?.id
    }
    if (creditoId) await vincularMetodo(creditoId, form.metodo_vinculado_id ? Number(form.metodo_vinculado_id) : null)
    setForm(FORM_VACIO); setEditando(null); setMostrarForm(false)
  }

  const totalSaldo = creditos.reduce((s, c) => s + Number(c.saldo_utilizado ?? 0), 0)

  return (
    <Layout titulo="Créditos">
      <div className="space-y-5">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Tarjetas Activas</p>
            <p className="text-xl font-bold font-mono text-primary-700">{creditos.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Saldo Total Utilizado</p>
            <p className="text-xl font-bold font-mono" style={{ color: 'var(--warning-fg)' }}>{formatMXN(totalSaldo)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Pagos Próximos</p>
            <p className="text-xl font-bold font-mono" style={{ color: 'var(--negative-fg)' }}>
              {creditos.filter(c => getAlerta(c).diasParaPago <= 5).length} alertas
            </p>
          </div>
        </div>

        <div className="card p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
          <span className="text-lg mt-0.5">💡</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Recomendación de uso de crédito</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Para mantener un buen historial crediticio, se recomienda no utilizar más del <strong>30%</strong> del límite de cada tarjeta.
              Usar más del 30% puede afectar negativamente tu score de crédito aunque pagues a tiempo.
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
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
              <div className="col-span-2">
                <label className="label">Método de pago en Control de Gastos</label>
                <select className="input" value={form.metodo_vinculado_id}
                  onChange={e => setF('metodo_vinculado_id', e.target.value)}>
                  <option value="">Sin vincular</option>
                  {metodos.filter(m => m.tipo === 'credito').map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Los gastos con este método actualizarán el saldo automáticamente.</p>
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
          ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array(3).fill(0).map((_,i) => <div key={i} className="card h-48 animate-pulse bg-gray-50" />)}</div>
          : creditos.length === 0
            ? <div className="card p-16 text-center text-gray-300 text-sm">No tienes tarjetas de crédito registradas</div>
            : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {creditos.map(c => <TarjetaCredito key={c.id} credito={c} metodos={metodos} onEditar={handleEditar} onEliminar={(id) => setConfirmDelete(id)} />)}
              </div>}

      </div>
      <ConfirmModal
        open={!!confirmDelete}
        titulo="¿Eliminar tarjeta?"
        descripcion="Esta acción no se puede deshacer."
        onConfirm={() => { eliminar(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
