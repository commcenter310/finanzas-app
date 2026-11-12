import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { useIngresos } from '../hooks/useIngresos'
import { useMes } from '../context/MesContext'
import { formatMXN, MESES } from '../utils/constantes'
import { Plus, Trash2, Check, X, Pencil, Wallet } from 'lucide-react'
import ConfirmModal from '../components/ui/ConfirmModal'
import DatePicker   from '../components/ui/DatePicker'
import ErrorState   from '../components/ui/ErrorState'
import EmptyState   from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { contextoMes, fechaLocalISO, inicioMesISO, mesAnterior, mesAplicacionIngreso, mesSiguiente } from '../utils/fecha'

// Distancia en meses entre dos (mes, año)
const mesesEntre = (a, b) => (a.anio * 12 + a.mes) - (b.anio * 12 + b.mes)

// Mes alrededor del cual se ofrecen opciones: el de la fecha en que llegó el
// dinero (anterior / ese / siguiente). Si el ingreso ya aplica a un mes más
// lejano, se centra en ese para que la opción activa siempre se vea.
const baseMesPicker = (fechaISO, mes, anio) => {
  const [anioFecha, mesFecha] = String(fechaISO || '').split('-').map(Number)
  if (!mesFecha || !anioFecha) return { mes, anio }
  const deFecha = { mes: mesFecha, anio: anioFecha }
  return Math.abs(mesesEntre({ mes, anio }, deFecha)) <= 1 ? deFecha : { mes, anio }
}

// ── Selector de mes al que aplica el ingreso ─────────────────────────────────
// Muestra 3 opciones: mes anterior / mes base / mes siguiente
function MesPicker({ mesVal, anioVal, onChange, mesBase, anioBase }) {
  const opciones = [
    mesAnterior(mesBase, anioBase),
    { mes: mesBase, anio: anioBase },
    mesSiguiente(mesBase, anioBase),
  ].map(op => ({ ...op, short: MESES[op.mes - 1].slice(0, 3) }))

  return (
    <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      {opciones.map(op => {
        const active = mesVal === op.mes && anioVal === op.anio
        return (
          <button
            key={`${op.mes}-${op.anio}`}
            type="button"
            aria-pressed={active}
            className="flex-1 py-2 px-2 transition-colors leading-tight"
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

// Qué le falta al formulario para poder guardarse ('' si está completo)
const problemaIngreso = (form) => {
  if (!String(form.concepto ?? '').trim()) return 'Escribe el concepto del ingreso.'
  if (!(Number(form.monto_actual) > 0)) return 'Escribe cuánto recibiste (mayor a cero).'
  if (form.monto_presupuesto !== '' && form.monto_presupuesto != null && Number(form.monto_presupuesto) < 0) {
    return 'El monto esperado no puede ser negativo.'
  }
  if (!form.fecha_recepcion) return 'Elige la fecha en que llegó el dinero.'
  return ''
}

const formDesdeIngreso = (ingreso) => ({
  concepto:          ingreso.concepto,
  monto_presupuesto: ingreso.monto_presupuesto,
  monto_actual:      ingreso.monto_actual,
  fecha_recepcion:   ingreso.fecha_recepcion ?? '',
  notas:             ingreso.notas ?? '',
  mes:               ingreso.mes,
  anio:              ingreso.anio,
})

function FilaIngreso({ ingreso, onUpdate, onDelete }) {
  const { mes: mesCtx, anio: anioCtx } = useMes()
  const toast = useToast()
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState(() => formDesdeIngreso(ingreso))
  const setF = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const abrirEdicion = () => {
    setForm(formDesdeIngreso(ingreso))   // siempre desde el dato más reciente
    setEditando(true)
  }

  const guardar = async () => {
    const problema = problemaIngreso(form)
    if (problema) return toast(problema, 'error')
    setGuardando(true)
    const { error } = await onUpdate(ingreso.id, { ...form })
    setGuardando(false)
    if (error) {
      toast('No se pudo guardar el ingreso. Intenta de nuevo.', 'error')
    } else {
      toast('Ingreso actualizado ✓', 'success')
      setEditando(false)
    }
  }

  const diff = Number(ingreso.monto_actual) - Number(ingreso.monto_presupuesto)

  // Edición: un formulario a todo el ancho de la fila, para que en celular
  // también se puedan cambiar fecha, monto esperado y notas.
  if (editando) {
    const base = baseMesPicker(form.fecha_recepcion, form.mes, form.anio)
    return (
      <tr className="bg-primary-50">
        <td colSpan={7} className="px-2.5 sm:px-4 py-3">
          {/* w-0 + min-w-full: el formulario llena la celda sin ensanchar la tabla
              (si no, en celular la tabla crece y aparece scroll horizontal) */}
          <div className="w-0 min-w-full">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="col-span-2 lg:col-span-1">
              <label className="label">Concepto</label>
              <input className="input text-sm py-1.5" value={form.concepto}
                onChange={e => setF('concepto', e.target.value)} />
            </div>
            <div>
              <label className="label">Recibido ($)</label>
              <input type="number" min="0" inputMode="decimal" className="input text-sm py-1.5 font-mono" value={form.monto_actual}
                onChange={e => setF('monto_actual', e.target.value)} />
            </div>
            <div>
              <label className="label">Esperado ($)</label>
              <input type="number" min="0" inputMode="decimal" className="input text-sm py-1.5 font-mono" value={form.monto_presupuesto}
                onChange={e => setF('monto_presupuesto', e.target.value)} />
            </div>
            <div className="col-span-2 lg:col-span-1">
              <label className="label">Fecha en que llegó</label>
              <DatePicker className="w-full" value={form.fecha_recepcion} onChange={v => setF('fecha_recepcion', v)} />
            </div>
            <div className="col-span-2">
              <label className="label">Aplica en</label>
              <MesPicker
                mesVal={form.mes} anioVal={form.anio}
                onChange={(m, a) => setForm(f => ({ ...f, mes: m, anio: a }))}
                mesBase={base.mes} anioBase={base.anio}
              />
              {(form.mes !== ingreso.mes || form.anio !== ingreso.anio) && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--primary)' }}>
                  ↪ Contará en el balance de {MESES[form.mes - 1]} {form.anio}
                </p>
              )}
            </div>
            <div className="col-span-2">
              <label className="label">Notas <span className="text-fg-4 font-normal">(opcional)</span></label>
              <input className="input text-sm py-1.5" value={form.notas} maxLength={200}
                onChange={e => setF('notas', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={guardar} disabled={guardando} className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setEditando(false)} className="btn-ghost text-sm flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" /> Cancelar
            </button>
          </div>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-gray-50 group">
      <td className="px-2.5 sm:px-4 py-3">
        <p className="font-medium text-gray-800">{ingreso.concepto}</p>
        {/* En celular la fecha no tiene columna propia: va bajo el concepto */}
        {ingreso.fecha_recepcion && (
          <p className="text-xs mt-0.5 font-mono sm:hidden" style={{ color: 'var(--fg-4)' }}>{ingreso.fecha_recepcion}</p>
        )}
        {ingreso.notas && (
          <p className="text-xs mt-0.5 truncate max-w-[220px]" style={{ color: 'var(--fg-4)' }} title={ingreso.notas}>
            📝 {ingreso.notas}
          </p>
        )}
      </td>
      <td className="px-2.5 sm:px-4 py-3 font-mono text-gray-500 text-sm hidden sm:table-cell">{formatMXN(ingreso.monto_presupuesto)}</td>
      <td className="px-2.5 sm:px-4 py-3 font-mono font-bold text-positive">{formatMXN(ingreso.monto_actual)}</td>
      <td className="px-2.5 sm:px-4 py-3 hidden sm:table-cell">
        <span className={`text-sm font-mono ${diff >= 0 ? 'text-positive' : 'text-negative'}`}>
          {diff >= 0 ? '+' : ''}{formatMXN(diff)}
        </span>
      </td>
      <td className="px-2.5 sm:px-4 py-3 text-gray-400 text-sm hidden sm:table-cell">{ingreso.fecha_recepcion ?? '—'}</td>
      <td className="px-2.5 sm:px-4 py-3">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{ background: 'var(--primary-soft-bg)', color: 'var(--primary-soft-fg)' }}
        >
          {/* En celular, mes abreviado: la fila completa cabe sin scroll horizontal */}
          <span className="sm:hidden">{MESES[(ingreso.mes ?? mesCtx) - 1].slice(0, 3)} {String(ingreso.anio ?? anioCtx).slice(2)}</span>
          <span className="hidden sm:inline">{MESES[(ingreso.mes ?? mesCtx) - 1]} {ingreso.anio ?? anioCtx}</span>
        </span>
      </td>
      <td className="px-2.5 sm:px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 acciones-hover">
          <button onClick={abrirEdicion} aria-label={`Editar ${ingreso.concepto}`} title="Editar"
            className="w-7 h-7 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center hover:bg-primary-50 hover:text-primary-700">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(ingreso.id)} aria-label={`Eliminar ${ingreso.concepto}`} title="Eliminar"
            className="w-7 h-7 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// Formulario nuevo para el mes que se está viendo: la fecha sugerida es hoy si
// se ve el mes en curso, o el día 1 del mes visto (así el ingreso aparece en
// la lista que el usuario tiene enfrente). El mes de aplicación sale de la
// fecha (día ≥ 25 → mes siguiente).
const formNuevo = (mes, anio) => {
  const fecha = contextoMes(mes, anio).esMesActual ? fechaLocalISO() : inicioMesISO(mes, anio)
  return { concepto: '', monto_presupuesto: '', monto_actual: '', fecha_recepcion: fecha, notas: '', ...mesAplicacionIngreso(fecha) }
}

export default function Ingresos() {
  const { mes, anio } = useMes()
  const { ingresos, loading, error, refetch, saving, totales, agregar, actualizar, eliminar } = useIngresos()
  const toast = useToast()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(() => formNuevo(mes, anio))
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Cada vez que se abre, el formulario arranca con el mes que se está viendo
  const abrirForm = () => {
    setForm(formNuevo(mes, anio))
    setMostrarForm(true)
  }

  // Al cambiar la fecha, auto-sugerir mes siguiente si el día es ≥ 25
  // (nómina del día 30 cubre gastos del 30 al 15 del mes siguiente)
  const handleFechaChange = (v) => {
    if (!v) return setForm(f => ({ ...f, fecha_recepcion: '' }))
    setForm(f => ({ ...f, fecha_recepcion: v, ...mesAplicacionIngreso(v) }))
  }

  const handleAgregar = async () => {
    const problema = problemaIngreso(form)
    if (problema) return toast(problema, 'error')
    const { error } = await agregar(form)
    if (error) {
      toast('No se pudo guardar el ingreso. Intenta de nuevo.', 'error')
      return
    }
    // La lista muestra los ingresos por la fecha en que llegaron: si la fecha
    // cae en otro mes, avisar dónde quedó para que no parezca que se perdió.
    const [anioFecha, mesFecha] = form.fecha_recepcion.split('-').map(Number)
    toast(mesFecha === mes && anioFecha === anio
      ? 'Ingreso guardado ✓'
      : `Ingreso guardado ✓ Lo verás en ${MESES[mesFecha - 1]} ${anioFecha}, por su fecha.`, 'success')
    setMostrarForm(false)
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
              onClick={() => (mostrarForm ? setMostrarForm(false) : abrirForm())}>
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>

          {/* Formulario inline */}
          {mostrarForm && (
            <div className="p-4 bg-primary-50 border-b border-primary-100">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="label">Concepto <span className="text-negative">*</span></label>
                  <input className="input text-sm" placeholder="Ej: Quincena 15"
                    value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Monto recibido ($) <span className="text-negative">*</span></label>
                  <input type="number" min="0" inputMode="decimal" className="input text-sm font-mono" placeholder="0"
                    value={form.monto_actual} onChange={e => setForm(f => ({ ...f, monto_actual: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Monto esperado ($) <span className="text-fg-4 font-normal">(opcional)</span></label>
                  <input type="number" min="0" inputMode="decimal" className="input text-sm font-mono" placeholder="= recibido si vacío"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="label">¿A qué mes aplica este ingreso?</label>
                  {(() => {
                    const base = baseMesPicker(form.fecha_recepcion, form.mes, form.anio)
                    const mesRec = Number(form.fecha_recepcion.split('-')[1])
                    return (
                      <>
                        <MesPicker
                          mesVal={form.mes} anioVal={form.anio}
                          onChange={(m, a) => setForm(f => ({ ...f, mes: m, anio: a }))}
                          mesBase={base.mes} anioBase={base.anio}
                        />
                        {mesRec > 0 && mesRec !== form.mes && (
                          <p className="text-xs mt-1.5" style={{ color: 'var(--primary)' }}>
                            💡 Recibido en {MESES[mesRec - 1]}, contará en el balance de {MESES[form.mes - 1]}
                          </p>
                        )}
                      </>
                    )
                  })()}
                </div>
                <div>
                  <label className="label">Notas <span className="text-fg-4 font-normal">(opcional)</span></label>
                  <input className="input text-sm" placeholder="Ej: incluye bono" maxLength={200}
                    value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
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
                  <th key={h} className={`px-2.5 sm:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap ${cls ?? ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-2.5 sm:px-4 py-3"><div className="h-5 bg-gray-50 rounded animate-pulse" /></td></tr>
                ))
                : ingresos.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6">
                        <EmptyState
                          icon={Wallet}
                          title="Sin ingresos este mes"
                          description="Registra tu quincena o cualquier ingreso para calcular presupuesto, ahorro y proyecciones."
                          className="min-h-[210px]"
                          action={
                            <button onClick={abrirForm} className="btn-primary text-sm">
                              <Plus className="w-4 h-4" /> Agregar ingreso
                            </button>
                          }
                        />
                      </td>
                    </tr>
                  )
                  : ingresos.map(i => (
                    <FilaIngreso key={i.id} ingreso={i} onUpdate={actualizar} onDelete={(id) => setConfirmDelete(id)} />
                  ))}
            </tbody>
            {ingresos.length > 0 && (
              <tfoot className="border-t border-gray-100 bg-gray-50">
                <tr>
                  <td className="px-2.5 sm:px-4 py-3 font-bold text-gray-700 text-sm">TOTAL</td>
                  <td className="px-2.5 sm:px-4 py-3 font-mono font-bold text-gray-500 hidden sm:table-cell">{formatMXN(totales.presupuesto)}</td>
                  <td className="px-2.5 sm:px-4 py-3 font-mono font-bold text-positive">{formatMXN(totales.actual)}</td>
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
        onConfirm={async () => {
          const id = confirmDelete
          setConfirmDelete(null)
          const { error } = await eliminar(id)
          if (error) toast('No se pudo eliminar. Intenta de nuevo.', 'error')
          else toast('Ingreso eliminado', 'info')
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
