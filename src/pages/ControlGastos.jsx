import { useState, useMemo } from 'react'
import Layout from '../components/layout/Layout'
import { useTransacciones } from '../hooks/useTransacciones'
import { formatMXN } from '../utils/constantes'
import { Plus, Trash2, Search, X, MessageSquare } from 'lucide-react'

const CLASIF_OPTS = [
  { value: 'necesidad', label: '🔵 Necesidad' },
  { value: 'deseo',     label: '🟡 Deseo' },
  { value: 'ahorro',    label: '🟢 Ahorro' },
]

const FORM_VACIO = {
  descripcion: '', monto: '', categoria_id: '', clasificacion: 'deseo',
  metodo_pago_id: '', fecha: new Date().toISOString().split('T')[0]
}

export default function ControlGastos() {
  const { transacciones, categorias, metodos, loading, saving, totales, agregar, eliminar } = useTransacciones()

  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const [busqueda, setBusqueda] = useState('')
  const [filtroClasif, setFiltroClasif] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')

  const onCategoriaChange = (catId) => {
    setF('categoria_id', catId)
    const cat = categorias.find(c => c.id === Number(catId))
    if (cat) setF('clasificacion', cat.clasificacion)
  }

  const handleAgregar = async () => {
    if (!form.descripcion || !form.monto) return
    const { error } = await agregar({
      ...form,
      monto:          Number(form.monto),
      categoria_id:   form.categoria_id   ? Number(form.categoria_id)   : null,
      metodo_pago_id: form.metodo_pago_id ? Number(form.metodo_pago_id) : null,
    })
    if (!error) {
      setForm(FORM_VACIO)
      setMostrarForm(false)
    }
  }

  const filtradas = useMemo(() => transacciones.filter(t => {
    const matchBusqueda = !busqueda       || t.descripcion.toLowerCase().includes(busqueda.toLowerCase())
    const matchClasif   = !filtroClasif   || t.clasificacion === filtroClasif
    const matchCat      = !filtroCategoria || t.categoria_id === Number(filtroCategoria)
    return matchBusqueda && matchClasif && matchCat
  }), [transacciones, busqueda, filtroClasif, filtroCategoria])

  const hayFiltros = busqueda || filtroClasif || filtroCategoria

  return (
    <Layout titulo="Control de Gastos">
      <div className="space-y-4">

        {/* Tarjetas */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Gastos',  value: totales.total,     color: 'text-primary-700' },
            { label: '🔵 Necesidad', value: totales.necesidad, color: 'text-blue-600'    },
            { label: '🟡 Deseo',     value: totales.deseo,     color: 'text-amber-600'   },
            { label: '🟢 Ahorro',    value: totales.ahorro,    color: 'text-emerald-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-xl font-bold font-mono ${color}`}>{formatMXN(value)}</p>
            </div>
          ))}
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="input pl-9 text-sm" placeholder="Buscar por descripción..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <select className="input text-sm w-44" value={filtroClasif}
            onChange={e => setFiltroClasif(e.target.value)}>
            <option value="">Todas las clases</option>
            {CLASIF_OPTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select className="input text-sm w-44" value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
          </select>
          {hayFiltros && (
            <button onClick={() => { setBusqueda(''); setFiltroClasif(''); setFiltroCategoria('') }}
              className="btn-ghost flex items-center gap-1 text-sm">
              <X className="w-4 h-4" /> Limpiar
            </button>
          )}
          <button onClick={() => setMostrarForm(v => !v)}
            className="btn-primary flex items-center gap-2 text-sm py-2 px-4 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Registrar Gasto
          </button>
        </div>

        {/* Formulario */}
        {mostrarForm && (
          <div className="card p-5 border-2 border-primary-200">
            <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Nuevo Gasto</h3>
            <div className="grid grid-cols-6 gap-3 mb-4">
              <div className="col-span-2">
                <label className="label">Descripción</label>
                <input className="input" placeholder="Ej: Starbucks, Gasolina..."
                  value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} />
              </div>
              <div>
                <label className="label">Monto ($)</label>
                <input type="number" className="input font-mono" placeholder="0.00"
                  value={form.monto} onChange={e => setF('monto', e.target.value)} />
              </div>
              <div>
                <label className="label">Categoría</label>
                <select className="input" value={form.categoria_id} onChange={e => onCategoriaChange(e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.clasificacion} onChange={e => setF('clasificacion', e.target.value)}>
                  {CLASIF_OPTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Método de Pago</label>
                <select className="input" value={form.metodo_pago_id} onChange={e => setF('metodo_pago_id', e.target.value)}>
                  <option value="">No especificado</option>
                  {metodos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="label">Fecha</label>
                <input type="date" className="input text-sm w-40"
                  value={form.fecha} onChange={e => setF('fecha', e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button className="btn-primary px-6" onClick={handleAgregar} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Gasto'}
                </button>
                <button className="btn-ghost" onClick={() => { setMostrarForm(false); setForm(FORM_VACIO) }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
            <p className="text-sm text-gray-500">
              {filtradas.length} movimiento{filtradas.length !== 1 ? 's' : ''}
              {hayFiltros && ` (filtrado de ${transacciones.length})`}
            </p>
          </div>

          {loading
            ? <div className="p-5 space-y-2">{Array(6).fill(0).map((_,i) => <div key={i} className="h-12 bg-gray-50 rounded animate-pulse" />)}</div>
            : filtradas.length === 0
              ? (
                <div className="py-16 text-center">
                  <p className="text-gray-300 text-4xl mb-3">📋</p>
                  <p className="text-gray-400 text-sm">
                    {hayFiltros ? 'Ningún gasto coincide con los filtros' : 'Sin gastos este mes'}
                  </p>
                </div>
              )
              : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {['Fecha','Descripción','Categoría','Tipo','Método','Monto',''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtradas.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{t.fecha}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800 text-sm">{t.descripcion}</p>
                            {t.origen === 'whatsapp' && <MessageSquare className="w-3 h-3 text-gray-300" title="Via WhatsApp" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {t.categorias ? `${t.categorias.icono} ${t.categorias.nombre}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge-${t.clasificacion}`}>{t.clasificacion}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{t.metodos_pago?.nombre ?? '—'}</td>
                        <td className="px-4 py-3 font-mono font-bold text-primary-700 whitespace-nowrap">-{formatMXN(t.monto)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => eliminar(t.id)}
                            className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-300 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-100 bg-gray-50">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 font-bold text-gray-700 text-sm">
                        {hayFiltros ? 'Subtotal filtrado' : 'TOTAL'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-primary-700">
                        -{formatMXN(filtradas.reduce((s, t) => s + Number(t.monto), 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              )}
        </div>

      </div>
    </Layout>
  )
}
