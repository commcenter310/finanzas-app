import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { useIngresos } from '../hooks/useIngresos'
import { useMes } from '../context/MesContext'
import { formatMXN, MESES } from '../utils/constantes'
import { Plus, Trash2, Check, X, Pencil, Wallet } from 'lucide-react'
import ConfirmModal from '../components/ui/ConfirmModal'
import ErrorState   from '../components/ui/ErrorState'
import EmptyState   from '../components/ui/EmptyState'
import IngresoForm  from '../components/ingresos/IngresoForm'
import { useToast } from '../components/ui/Toast'
import { useGuardarConAviso } from '../hooks/useGuardarConAviso'
import { mesDeFechaISO } from '../utils/fecha'
import { formDesdeIngreso, formNuevoIngreso, problemaIngreso } from '../utils/ingresos'

const AVISO_GUARDAR = { error: 'No se pudo guardar el ingreso. Intenta de nuevo.' }

function FilaIngreso({ ingreso, onUpdate, onDelete }) {
  const toast = useToast()
  const guardarConAviso = useGuardarConAviso()
  const [form, setForm] = useState(null)   // null = no se está editando
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    const problema = problemaIngreso(form)
    if (problema) return toast(problema, 'error')
    setGuardando(true)
    const ok = await guardarConAviso(onUpdate(ingreso.id, form), AVISO_GUARDAR)
    setGuardando(false)
    if (!ok) return
    toast('Ingreso actualizado ✓', 'success')
    setForm(null)
  }

  // Edición: el formulario a todo el ancho de la fila, para que en celular
  // también se puedan cambiar fecha, monto esperado y notas.
  if (form) {
    return (
      <tr className="bg-primary-50">
        <td colSpan={7} className="celda">
          {/* w-0 + min-w-full: llena la celda sin ensanchar la tabla (si no,
              en celular la tabla crece y aparece scroll horizontal) */}
          <div className="w-0 min-w-full">
            <IngresoForm form={form} setForm={setForm} />
            <div className="flex gap-2 mt-3">
              <button onClick={guardar} disabled={guardando} className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setForm(null)} className="btn-ghost text-sm flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  const diff = Number(ingreso.monto_actual) - Number(ingreso.monto_presupuesto)
  const mesAplica = MESES[ingreso.mes - 1] ?? ''
  return (
    <tr className="hover:bg-gray-50 group">
      <td className="celda">
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
      <td className="celda font-mono text-gray-500 text-sm hidden sm:table-cell">{formatMXN(ingreso.monto_presupuesto)}</td>
      <td className="celda font-mono font-bold text-positive">{formatMXN(ingreso.monto_actual)}</td>
      <td className="celda hidden sm:table-cell">
        <span className={`text-sm font-mono ${diff >= 0 ? 'text-positive' : 'text-negative'}`}>
          {diff >= 0 ? '+' : ''}{formatMXN(diff)}
        </span>
      </td>
      <td className="celda text-gray-400 text-sm hidden sm:table-cell">{ingreso.fecha_recepcion ?? '—'}</td>
      <td className="celda">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{ background: 'var(--primary-soft-bg)', color: 'var(--primary-soft-fg)' }}
        >
          {/* En celular, mes abreviado: la fila completa cabe sin scroll horizontal */}
          <span className="sm:hidden">{mesAplica.slice(0, 3)} {String(ingreso.anio).slice(2)}</span>
          <span className="hidden sm:inline">{mesAplica} {ingreso.anio}</span>
        </span>
      </td>
      <td className="celda text-right">
        <div className="flex items-center justify-end gap-1 acciones-hover">
          <button onClick={() => setForm(formDesdeIngreso(ingreso))} aria-label={`Editar ${ingreso.concepto}`} title="Editar"
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

export default function Ingresos() {
  const { mes, anio } = useMes()
  const { ingresos, loading, error, refetch, saving, totales, agregar, actualizar, eliminar } = useIngresos()
  const toast = useToast()
  const guardarConAviso = useGuardarConAviso()
  const [form, setForm] = useState(null)   // null = formulario de alta cerrado
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Cada vez que se abre, el formulario arranca con el mes que se está viendo
  const abrirForm = () => setForm(formNuevoIngreso(mes, anio))

  const handleAgregar = async () => {
    const problema = problemaIngreso(form)
    if (problema) return toast(problema, 'error')
    if (!await guardarConAviso(agregar(form), AVISO_GUARDAR)) return
    // La lista muestra los ingresos por la fecha en que llegaron: si la fecha
    // cae en otro mes, avisar dónde quedó para que no parezca que se perdió.
    const recibidoEn = mesDeFechaISO(form.fecha_recepcion)
    toast(recibidoEn.mes === mes && recibidoEn.anio === anio
      ? 'Ingreso guardado ✓'
      : `Ingreso guardado ✓ Lo verás en ${MESES[recibidoEn.mes - 1]} ${recibidoEn.anio}, por su fecha.`, 'success')
    setForm(null)
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
              onClick={() => (form ? setForm(null) : abrirForm())}>
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>

          {/* Formulario de alta */}
          {form && (
            <div className="p-4 bg-primary-50 border-b border-primary-100">
              <IngresoForm form={form} setForm={setForm} />
              <div className="flex gap-2 mt-3">
                <button className="btn-primary text-sm py-1.5 px-4" onClick={handleAgregar} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button className="btn-ghost text-sm" onClick={() => setForm(null)}>Cancelar</button>
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
                  <th key={h} className={`celda text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap ${cls ?? ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="celda"><div className="h-5 bg-gray-50 rounded animate-pulse" /></td></tr>
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
                  <td className="celda font-bold text-gray-700 text-sm">TOTAL</td>
                  <td className="celda font-mono font-bold text-gray-500 hidden sm:table-cell">{formatMXN(totales.presupuesto)}</td>
                  <td className="celda font-mono font-bold text-positive">{formatMXN(totales.actual)}</td>
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
          if (await guardarConAviso(eliminar(id), { error: 'No se pudo eliminar. Intenta de nuevo.' })) toast('Ingreso eliminado', 'info')
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
