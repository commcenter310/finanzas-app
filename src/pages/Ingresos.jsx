import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { useIngresos } from '../hooks/useIngresos'
import { formatMXN } from '../utils/constantes'
import { Plus, Trash2, Check, X, Pencil } from 'lucide-react'

function FilaIngreso({ ingreso, onUpdate, onDelete }) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({
    concepto:          ingreso.concepto,
    monto_presupuesto: ingreso.monto_presupuesto,
    monto_actual:      ingreso.monto_actual,
    fecha_recepcion:   ingreso.fecha_recepcion ?? '',
    notas:             ingreso.notas ?? '',
  })

  const guardar = async () => {
    await onUpdate(ingreso.id, form)
    setEditando(false)
  }

  const cancelar = () => {
    setForm({
      concepto:          ingreso.concepto,
      monto_presupuesto: ingreso.monto_presupuesto,
      monto_actual:      ingreso.monto_actual,
      fecha_recepcion:   ingreso.fecha_recepcion ?? '',
      notas:             ingreso.notas ?? '',
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
        <td className="px-4 py-2">
          <input type="number" className="input text-sm py-1.5 font-mono" value={form.monto_presupuesto}
            onChange={e => setForm(f => ({ ...f, monto_presupuesto: e.target.value }))} />
        </td>
        <td className="px-4 py-2">
          <input type="number" className="input text-sm py-1.5 font-mono" value={form.monto_actual}
            onChange={e => setForm(f => ({ ...f, monto_actual: e.target.value }))} />
        </td>
        <td className="px-4 py-2" />
        <td className="px-4 py-2">
          <input type="date" className="input text-sm py-1.5" value={form.fecha_recepcion}
            onChange={e => setForm(f => ({ ...f, fecha_recepcion: e.target.value }))} />
        </td>
        <td className="px-4 py-2 text-right">
          <div className="flex items-center justify-end gap-1">
            <button onClick={guardar}
              className="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600">
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
      <td className="px-4 py-3 font-medium text-gray-800">{ingreso.concepto}</td>
      <td className="px-4 py-3 font-mono text-gray-500 text-sm">{formatMXN(ingreso.monto_presupuesto)}</td>
      <td className="px-4 py-3 font-mono font-bold text-emerald-600">{formatMXN(ingreso.monto_actual)}</td>
      <td className="px-4 py-3">
        <span className={`text-sm font-mono ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {diff >= 0 ? '+' : ''}{formatMXN(diff)}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-400 text-sm">{ingreso.fecha_recepcion ?? '—'}</td>
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
  const { ingresos, loading, saving, totales, agregar, actualizar, eliminar } = useIngresos()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ concepto: '', monto_presupuesto: '', monto_actual: '', fecha_recepcion: '', notas: '' })

  const handleAgregar = async () => {
    if (!form.concepto || !form.monto_presupuesto) return
    const { error } = await agregar(form)
    if (!error) {
      setForm({ concepto: '', monto_presupuesto: '', monto_actual: '', fecha_recepcion: '', notas: '' })
      setMostrarForm(false)
    }
  }

  return (
    <Layout titulo="Ingresos">
      <div className="space-y-4">

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Presupuestado', value: totales.presupuesto, color: 'text-gray-600' },
            { label: 'Recibido',      value: totales.actual,      color: 'text-emerald-600' },
            { label: 'Diferencia',    value: totales.actual - totales.presupuesto,
              color: (totales.actual - totales.presupuesto) >= 0 ? 'text-emerald-600' : 'text-red-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-xl font-bold font-mono ${color}`}>{formatMXN(value)}</p>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div className="card overflow-hidden">
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
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="label">Concepto</label>
                  <input className="input text-sm" placeholder="Ej: Nómina 15"
                    value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Presupuesto ($)</label>
                  <input type="number" className="input text-sm font-mono" placeholder="0"
                    value={form.monto_presupuesto} onChange={e => setForm(f => ({ ...f, monto_presupuesto: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Recibido ($)</label>
                  <input type="number" className="input text-sm font-mono" placeholder="0"
                    value={form.monto_actual} onChange={e => setForm(f => ({ ...f, monto_actual: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Fecha</label>
                  <input type="date" className="input text-sm"
                    value={form.fecha_recepcion} onChange={e => setForm(f => ({ ...f, fecha_recepcion: e.target.value }))} />
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

          {/* Tabla */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {['Concepto','Presupuestado','Recibido','Diferencia','Fecha',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 bg-gray-50 rounded animate-pulse" /></td></tr>
                ))
                : ingresos.length === 0
                  ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-300 text-sm">Sin ingresos este mes. Agrega el primero.</td></tr>
                  : ingresos.map(i => (
                    <FilaIngreso key={i.id} ingreso={i} onUpdate={actualizar} onDelete={eliminar} />
                  ))}
            </tbody>
            {ingresos.length > 0 && (
              <tfoot className="border-t border-gray-100 bg-gray-50">
                <tr>
                  <td className="px-4 py-3 font-bold text-gray-700 text-sm">TOTAL</td>
                  <td className="px-4 py-3 font-mono font-bold text-gray-500">{formatMXN(totales.presupuesto)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-600">{formatMXN(totales.actual)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

      </div>
    </Layout>
  )
}
