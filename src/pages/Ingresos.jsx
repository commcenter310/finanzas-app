import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { useIngresos } from '../hooks/useIngresos'
import { useMes } from '../context/MesContext'
import { formatMXN, MESES } from '../utils/constantes'
import { Plus, Trash2, Check, X, Pencil } from 'lucide-react'
import ConfirmModal from '../components/ui/ConfirmModal'
import DatePicker   from '../components/ui/DatePicker'
import ErrorState   from '../components/ui/ErrorState'
import { useToast } from '../components/ui/Toast'
import { fechaLocalISO } from '../utils/fecha'

// ── Selector de mes al que aplica el ingreso ─────────────────────────────────
// Muestra 3 opciones: mes anterior / mes actual / mes siguiente
function MesPicker({ mesVal, anioVal, onChange, mesBase, anioBase }) {
  const prevMes  = mesBase === 1  ? 12 : mesBase - 1
  const prevAnio = mesBase === 1  ? anioBase - 1 : anioBase
  const nextMes  = mesBase === 12 ? 1  : mesBase + 1
  const nextAnio = mesBase === 12 ? anioBase + 1 : anioBase

  const opciones = [
    { mes: prevMes,  anio: prevAnio,  short: MESES[prevMes - 1].slice(0, 3) },
    { mes: mesBase,  anio: anioBase,  short: MESES[mesBase - 1].slice(0, 3)  },
    { mes: nextMes,  anio: nextAnio,  short: MESES[nextMes - 1].slice(0, 3) },
  ]

  return (
    <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      {opciones.map(op => {
        const active = mesVal === op.mes && anioVal === op.anio
        return (
          <button
            key={`${op.mes}-${op.anio}`}
            type="button"
            className="flex-1 py-2 transition-colors leading-tight"
            style={{
              background: active ? 'var(--primary)' : 'var(--surface-2)',
              color:      active ? 'var(--fg-on-primary)' : 'var(--fg-3)',
            }}
            onClick={() => onChange(op.mes, op.anio)}
          >
            <div className="text-[11px] font-bold">{op.short}</div>
            <div style={{ fontSize: 10, fontWeight: 400, opacity: active ? 0.85 : 0.7 }}>{op.anio}</div>
          </button>
        )
      })}
    </div>
  )
}

function FilaIngreso({ ingreso, onUpdate, onDelete }) {
  const { mes: mesCtx, anio: anioCtx } = useMes()
  const toast = useToast()
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    concepto:          ingreso.concepto,
    monto_presupuesto: ingreso.monto_presupuesto,
    monto_actual:      ingreso.monto_actual,
    fecha_recepcion:   ingreso.fecha_recepcion ?? '',
    notas:             ingreso.notas ?? '',
    mes:               ingreso.mes,
    anio:              ingreso.anio,
  })

  const guardar = async () => {
    setGuardando(true)
    const { error } = await onUpdate(ingreso.id, { ...form })
    setGuardando(false)
    if (error) {
      toast('Error al guardar: ' + (error.message ?? 'intenta de nuevo'), 'error')
    } else {
      setEditando(false)
    }
  }

  const cancelar = () => {
    setForm({
      concepto:          ingreso.concepto,
      monto_presupuesto: ingreso.monto_presupuesto,
      monto_actual:      ingreso.monto_actual,
      fecha_recepcion:   ingreso.fecha_recepcion ?? '',
      notas:             ingreso.notas ?? '',
      mes:               ingreso.mes,
      anio:              ingreso.anio,
    })
    setEditando(false)
  }

  const diff = Number(form.monto_actual) - Number(form.monto_presupuesto)

  if (editando) {
    return (
      <tr className="bg-primary-50">
        <td className="px-4 py-2">
          <input className="input text-sm py-1.5" value={form.concepto}
            onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} />
        </td>
        <td className="px-4 py-2 hidden sm:table-cell">
          <input type="number" className="input text-sm py-1.5 font-mono" value={form.monto_presupuesto}
            onChange={e => setForm(f => ({ ...f, monto_presupuesto: e.target.value }))} />
        </td>
        <td className="px-4 py-2">
          <input type="number" className="input text-sm py-1.5 font-mono" value={form.monto_actual}
            onChange={e => setForm(f => ({ ...f, monto_actual: e.target.value }))} />
        </td>
        <td className="px-4 py-2 hidden sm:table-cell" />
        <td className="px-4 py-2 hidden sm:table-cell">
          <DatePicker
            className="w-full"
            value={form.fecha_recepcion}
            onChange={v => setForm(f => ({ ...f, fecha_recepcion: v }))}
          />
        </td>
        <td className="px-4 py-2">
          <MesPicker
            mesVal={form.mes}
            anioVal={form.anio}
            onChange={(m, a) => setForm(f => ({ ...f, mes: m, anio: a }))}
            mesBase={form.mes}
            anioBase={form.anio}
          />
          {form.mes !== ingreso.mes && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--primary)' }}>
              ↪ Se moverá a {MESES[form.mes - 1]}
            </p>
          )}
        </td>
        <td className="px-4 py-2 text-right">
          <div className="flex items-center justify-end gap-1">
            <button onClick={guardar} disabled={guardando}
              className="w-7 h-7 text-white rounded-lg flex items-center justify-center" style={{ background: 'var(--ahorro)', opacity: guardando ? 0.6 : 1 }}>
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={cancelar}
              className="w-7 h-7 bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-gray-50 group">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-800">{ingreso.concepto}</p>
        {ingreso.notas && (
          <p className="text-xs mt-0.5 truncate max-w-[220px]" style={{ color: 'var(--fg-4)' }} title={ingreso.notas}>
            📝 {ingreso.notas}
          </p>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-gray-500 text-sm hidden sm:table-cell">{formatMXN(ingreso.monto_presupuesto)}</td>
      <td className="px-4 py-3 font-mono font-bold text-positive">{formatMXN(ingreso.monto_actual)}</td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className={`text-sm font-mono ${diff >= 0 ? 'text-positive' : 'text-negative'}`}>
          {diff >= 0 ? '+' : ''}{formatMXN(diff)}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-400 text-sm hidden sm:table-cell">{ingreso.fecha_recepcion ?? '—'}</td>
      <td className="px-4 py-3">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{ background: 'var(--primary-soft-bg)', color: 'var(--primary-soft-fg)' }}
        >
          {MESES[(ingreso.mes ?? mesCtx) - 1]} {ingreso.anio ?? anioCtx}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditando(true)}
            className="w-7 h-7 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center hover:bg-primary-50 hover:text-primary-700">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(ingreso.id)}
            className="w-7 h-7 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function Ingresos() {
  const { mes, anio } = useMes()
  const { ingresos, loading, error, refetch, saving, totales, agregar, actualizar, eliminar } = useIngresos()
  const [mostrarForm, setMostrarForm] = useState(false)
  const hoy = fechaLocalISO()
  const [form, setForm] = useState({ concepto: '', monto_presupuesto: '', monto_actual: '', fecha_recepcion: hoy, notas: '', mes, anio })
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Al cambiar la fecha, auto-sugerir mes siguiente si el día es ≥ 25
  // (nómina del día 30 cubre gastos del 30 al 15 del mes siguiente)
  const handleFechaChange = (v) => {
    const [anioF, mesF, diaStr] = v.split('-').map(Number)
    const mesAplica  = diaStr >= 25 ? (mesF === 12 ? 1  : mesF + 1)  : mesF
    const anioAplica = diaStr >= 25 ? (mesF === 12 ? anioF + 1 : anioF) : anioF
    setForm(f => ({ ...f, fecha_recepcion: v, mes: mesAplica, anio: anioAplica }))
  }

  const handleAgregar = async () => {
    // Requerido: concepto, monto_actual (dinero recibido) y fecha
    if (!form.concepto || !form.monto_actual || !form.fecha_recepcion) return
    // Si no pusieron monto esperado, usar el monto real
    const datos = {
      ...form,
      monto_presupuesto: form.monto_presupuesto || form.monto_actual,
    }
    const { error } = await agregar(datos)
    if (!error) {
      setForm({ concepto: '', monto_presupuesto: '', monto_actual: '', fecha_recepcion: hoy, notas: '', mes, anio })
      setMostrarForm(false)
    }
  }

  if (error && !loading && ingresos.length === 0) {
    return (
      <Layout titulo="Ingresos">
        <ErrorState onRetry={refetch} mensaje={error} />
      </Layout>
    )
  }

  return (
    <Layout titulo="Ingresos">
      <div className="space-y-4">

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          {[
            { label: 'Presupuestado', value: totales.presupuesto, color: 'text-fg-2' },
            { label: 'Recibido',      value: totales.actual,      color: 'text-positive' },
            { label: 'Diferencia',    value: totales.actual - totales.presupuesto,
              color: (totales.actual - totales.presupuesto) >= 0 ? 'text-positive' : 'text-negative' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-xl font-bold font-mono ${color}`}>{formatMXN(value)}</p>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div className="card">
          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">Fuentes de Ingreso</h2>
            <button className="btn-primary flex items-center gap-2 text-sm py-1.5 px-3"
              onClick={() => setMostrarForm(v => !v)}>
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>

          {/* Formulario inline */}
          {mostrarForm && (
            <div className="p-4 bg-primary-50 border-b border-primary-100">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="label">Concepto</label>
                  <input className="input text-sm" placeholder="Ej: Quincena 15"
                    value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Monto recibido ($) <span className="text-negative">*</span></label>
                  <input type="number" className="input text-sm font-mono" placeholder="0"
                    value={form.monto_actual} onChange={e => setForm(f => ({ ...f, monto_actual: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Monto esperado ($) <span className="text-fg-4 font-normal">(opcional)</span></label>
                  <input type="number" className="input text-sm font-mono" placeholder="= recibido si vacío"
                    value={form.monto_presupuesto} onChange={e => setForm(f => ({ ...f, monto_presupuesto: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Fecha en que llegó <span className="text-negative">*</span></label>
                  <DatePicker
                    value={form.fecha_recepcion}
                    onChange={handleFechaChange}
                  />
                </div>
              </div>
              {/* Segunda fila: mes de aplicación */}
              <div className="flex items-end gap-4 mb-3">
                <div>
                  <label className="label">¿A qué mes aplica este ingreso?</label>
                  <MesPicker
                    mesVal={form.mes}   anioVal={form.anio}
                    onChange={(m, a) => setForm(f => ({ ...f, mes: m, anio: a }))}
                    mesBase={form.mes}  anioBase={form.anio}
                  />
                  {(() => {
                    const mesRec = parseInt(form.fecha_recepcion.split('-')[1])
                    return mesRec !== form.mes && (
                      <p className="text-xs mt-1.5" style={{ color: 'var(--primary)' }}>
                        💡 Recibido en {MESES[mesRec - 1]}, aplicará en {MESES[form.mes - 1]}
                      </p>
                    )
                  })()}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary text-sm py-1.5 px-4" onClick={handleAgregar} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button className="btn-ghost text-sm" onClick={() => setMostrarForm(false)}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Tabla (en móvil se ocultan columnas secundarias) */}
          <div className="overflow-x-auto">
          <table className="w-full sm:min-w-[500px]">
            <thead>
              <tr className="border-b border-gray-50">
                {[
                  { h: 'Concepto' },
                  { h: 'Presupuestado', cls: 'hidden sm:table-cell' },
                  { h: 'Recibido' },
                  { h: 'Diferencia', cls: 'hidden sm:table-cell' },
                  { h: 'Fecha recibido', cls: 'hidden sm:table-cell' },
                  { h: 'Aplica en' },
                  { h: '' },
                ].map(({ h, cls }) => (
                  <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide ${cls ?? ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-5 bg-gray-50 rounded animate-pulse" /></td></tr>
                ))
                : ingresos.length === 0
                  ? <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-300 text-sm">Sin ingresos este mes. Agrega el primero.</td></tr>
                  : ingresos.map(i => (
                    <FilaIngreso key={i.id} ingreso={i} onUpdate={actualizar} onDelete={(id) => setConfirmDelete(id)} />
                  ))}
            </tbody>
            {ingresos.length > 0 && (
              <tfoot className="border-t border-gray-100 bg-gray-50">
                <tr>
                  <td className="px-4 py-3 font-bold text-gray-700 text-sm">TOTAL</td>
                  <td className="px-4 py-3 font-mono font-bold text-gray-500 hidden sm:table-cell">{formatMXN(totales.presupuesto)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-positive">{formatMXN(totales.actual)}</td>
                  <td className="hidden sm:table-cell" colSpan={3} />
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
          </div>
        </div>

      </div>
      <ConfirmModal
        open={!!confirmDelete}
        titulo="¿Eliminar ingreso?"
        descripcion="Esta acción no se puede deshacer."
        onConfirm={() => { eliminar(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
