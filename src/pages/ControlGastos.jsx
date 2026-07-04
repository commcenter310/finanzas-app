import { useState, useMemo } from 'react'
import Layout from '../components/layout/Layout'
import { useTransacciones } from '../hooks/useTransacciones'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { formatMXN } from '../utils/constantes'
import { Plus, Trash2, Search, X, MessageSquare, Pencil, Lock, Download } from 'lucide-react'
import ConfirmModal from '../components/ui/ConfirmModal'
import FilterSelect from '../components/ui/FilterSelect'
import DatePicker   from '../components/ui/DatePicker'
import ErrorState   from '../components/ui/ErrorState'
import { useToast } from '../components/ui/Toast'

const CLASIF_OPTS = [
  { value: 'necesidad', label: 'Necesidad', dotColor: 'var(--necesidad)' },
  { value: 'deseo',     label: 'Deseo',     dotColor: 'var(--deseo)'     },
  { value: 'ahorro',    label: 'Ahorro',    dotColor: 'var(--ahorro)'    },
]

const FORM_VACIO = {
  descripcion: '', monto: '', categoria_id: '', clasificacion: 'deseo',
  metodo_pago_id: '', msi_meses: '', fecha: new Date().toISOString().split('T')[0]
}

const MSI_OPTS = [3, 6, 9, 12, 18, 24].map(n => ({ value: n, label: `${n} meses sin intereses` }))

export default function ControlGastos() {
  const { profile } = useAuth()
  const { mes, anio } = useMes()
  const { transacciones, categorias, metodos, loading, error, refetch, saving, totales, agregar, actualizar, eliminar } = useTransacciones()
  const umbral = profile?.umbral_hormiga ?? 100
  const toast  = useToast()

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [transaccionOriginal, setTransaccionOriginal] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const abrirEditar = (t) => {
    setTransaccionOriginal(t)
    setForm({
      descripcion:    t.descripcion,
      monto:          t.monto,
      categoria_id:   t.categorias?.id   ?? '',
      clasificacion:  t.clasificacion,
      metodo_pago_id: t.metodos_pago?.id ?? '',
      msi_meses:      t.msi_meses ?? '',
      fecha:          t.fecha,
    })
    setEditandoId(t.id)
    setMostrarForm(true)
  }

  const cerrarForm = () => {
    setMostrarForm(false)
    setEditandoId(null)
    setTransaccionOriginal(null)
    setForm(FORM_VACIO)
  }

  const [confirmDelete, setConfirmDelete] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [filtroClasif, setFiltroClasif] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroOrigen, setFiltroOrigen] = useState('')
  const [soloHormiga, setSoloHormiga] = useState(false)

  const onCategoriaChange = (catId) => {
    setF('categoria_id', catId)
    const cat = categorias.find(c => c.id === Number(catId))
    if (cat) setF('clasificacion', cat.clasificacion)
  }

  // El método seleccionado, para saber si es tarjeta de crédito (habilita MSI)
  const metodoSeleccionado = metodos.find(m => m.id === Number(form.metodo_pago_id))
  const esTarjetaCredito = !!metodoSeleccionado?.credito_id

  const handleGuardar = async () => {
    if (!form.descripcion || !form.monto) return
    const resto = { ...form }
    delete resto.msi_meses
    const datos = {
      ...resto,
      monto:          Number(form.monto),
      categoria_id:   form.categoria_id   ? Number(form.categoria_id)   : null,
      metodo_pago_id: form.metodo_pago_id ? Number(form.metodo_pago_id) : null,
    }
    // MSI solo aplica a tarjetas; se manda la columna solo cuando es relevante
    if (esTarjetaCredito && form.msi_meses) datos.msi_meses = Number(form.msi_meses)
    else if (transaccionOriginal?.msi_meses) datos.msi_meses = null // editó y lo quitó
    const { error } = editandoId
      ? await actualizar(editandoId, datos, transaccionOriginal)
      : await agregar(datos)
    if (!error) {
      cerrarForm()
      toast(editandoId ? 'Gasto actualizado ✓' : 'Gasto guardado ✓', 'success')
    } else {
      toast('Error al guardar el gasto', 'error')
    }
  }

  const filtradas = useMemo(() => transacciones.filter(t => {
    const matchBusqueda = !busqueda        || t.descripcion.toLowerCase().includes(busqueda.toLowerCase())
    const matchClasif   = !filtroClasif    || t.clasificacion === filtroClasif
    const matchCat      = !filtroCategoria || t.categoria_id === Number(filtroCategoria)
    const matchOrigen   = !filtroOrigen    || (t.origen ?? 'web') === filtroOrigen
    const matchHormiga  = !soloHormiga     || (Number(t.monto) <= umbral && t.clasificacion === 'deseo')
    return matchBusqueda && matchClasif && matchCat && matchOrigen && matchHormiga
  }), [transacciones, busqueda, filtroClasif, filtroCategoria, filtroOrigen, soloHormiga, umbral])

  const hayFiltros = busqueda || filtroClasif || filtroCategoria || filtroOrigen || soloHormiga

  // Exporta los movimientos visibles (respeta filtros) a un archivo .xlsx.
  // Import dinámico: la librería solo se descarga al usar el botón.
  const exportarExcel = async () => {
    const XLSX = await import('xlsx')
    const filas = filtradas.map(t => ({
      Fecha:       t.fecha,
      Descripción: t.descripcion,
      Categoría:   t.categorias ? `${t.categorias.icono} ${t.categorias.nombre}` : '',
      Tipo:        t.clasificacion,
      Método:      t.metodos_pago?.nombre ?? '',
      Monto:       Number(t.monto),
    }))
    const ws = XLSX.utils.json_to_sheet(filas)
    ws['!cols'] = [{ wch: 11 }, { wch: 32 }, { wch: 20 }, { wch: 11 }, { wch: 14 }, { wch: 11 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos')
    XLSX.writeFile(wb, `gastos-${anio}-${String(mes).padStart(2, '0')}${hayFiltros ? '-filtrado' : ''}.xlsx`)
    toast('Excel descargado ✓', 'success')
  }

  if (error && !loading && transacciones.length === 0) {
    return (
      <Layout titulo="Control de Gastos">
        <ErrorState onRetry={refetch} mensaje={error} />
      </Layout>
    )
  }

  return (
    <Layout titulo="Control de Gastos">
      <div className="space-y-4">

        {/* Tarjetas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[
            { label: 'Total Gastos',  value: totales.total,     valueColor: 'var(--negative-fg)'  },
            { label: '🔵 Necesidad', value: totales.necesidad, valueColor: 'var(--necesidad-fg)' },
            { label: '🟡 Deseo',     value: totales.deseo,     valueColor: 'var(--deseo-fg)'     },
            { label: '🟢 Ahorro',    value: totales.ahorro,    valueColor: 'var(--ahorro-fg)'    },
          ].map(({ label, value, valueColor }) => (
            <div key={label} className="card p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] mb-2" style={{ color: 'var(--fg-3)' }}>{label}</p>
              <p className="text-xl font-bold tabular" style={{ color: valueColor, fontVariantNumeric: 'tabular-nums' }}>{formatMXN(value)}</p>
            </div>
          ))}
        </div>

        {/* Controles */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px] max-w-[260px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="input pl-9 text-sm" placeholder="Buscar por descripción..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <FilterSelect
            className="w-full sm:w-44"
            value={filtroClasif}
            onChange={setFiltroClasif}
            options={CLASIF_OPTS}
            placeholder="Todas las clases"
          />
          <FilterSelect
            className="w-full sm:w-52"
            value={filtroCategoria}
            onChange={setFiltroCategoria}
            options={categorias.map(c => ({ value: c.id, label: c.nombre, icon: c.icono }))}
            placeholder="Todas las categorías"
          />
          <FilterSelect
            className="w-full sm:w-44"
            value={filtroOrigen}
            onChange={setFiltroOrigen}
            options={[
              { value: 'web',          label: 'Manual'            },
              { value: 'gastos_fijos', label: 'Gastos fijos'      },
              { value: 'deuda',        label: 'Pagos deuda'       },
              { value: 'ahorro',       label: 'Depósitos ahorro'  },
              { value: 'whatsapp',     label: 'WhatsApp'          },
            ]}
            placeholder="Todos los orígenes"
          />
          <button
            onClick={() => setSoloHormiga(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--r-md)] text-sm font-medium border transition-all"
            style={soloHormiga
              ? { background: 'var(--warning-bg)', borderColor: 'var(--deseo)', color: 'var(--deseo-fg)', fontWeight: 700 }
              : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg-2)' }}>
            🐜 Solo hormiga
          </button>
          {hayFiltros && (
            <button onClick={() => { setBusqueda(''); setFiltroClasif(''); setFiltroCategoria(''); setFiltroOrigen(''); setSoloHormiga(false) }}
              className="btn-ghost flex items-center gap-1 text-sm">
              <X className="w-4 h-4" /> Limpiar
            </button>
          )}
          {filtradas.length > 0 && (
            <button onClick={exportarExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--r-md)] text-sm font-medium border transition-all"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg-2)' }}
              title="Descargar los movimientos visibles en Excel">
              <Download className="w-4 h-4" /> Exportar
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
            <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">{editandoId ? 'Editar Gasto' : 'Nuevo Gasto'}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
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
                <FilterSelect
                  value={form.categoria_id}
                  onChange={onCategoriaChange}
                  options={categorias.map(c => ({ value: c.id, label: c.nombre, icon: c.icono }))}
                  placeholder="Sin categoría"
                />
              </div>
              <div>
                <label className="label">Tipo</label>
                <FilterSelect
                  value={form.clasificacion}
                  onChange={v => setF('clasificacion', v)}
                  options={CLASIF_OPTS}
                  placeholder="Tipo"
                  showClear={false}
                />
              </div>
              <div>
                <label className="label">Método de Pago</label>
                <FilterSelect
                  value={form.metodo_pago_id}
                  onChange={v => setF('metodo_pago_id', v)}
                  options={metodos.map(m => ({ value: m.id, label: m.nombre }))}
                  placeholder="No especificado"
                />
              </div>
              {esTarjetaCredito && (
                <div>
                  <label className="label">¿A meses?</label>
                  <FilterSelect
                    value={form.msi_meses}
                    onChange={v => setF('msi_meses', v)}
                    options={MSI_OPTS}
                    placeholder="Contado"
                  />
                  {form.msi_meses && Number(form.monto) > 0 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--primary-600)' }}>
                      {formatMXN(Number(form.monto) / Number(form.msi_meses))}/mes
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <label className="label">Fecha</label>
                <DatePicker
                  className="w-full sm:w-40"
                  value={form.fecha}
                  onChange={v => setF('fecha', v)}
                />
              </div>
              <div className="flex gap-2">
                <button className="btn-primary px-6" onClick={handleGuardar} disabled={saving}>
                  {saving ? 'Guardando...' : editandoId ? 'Actualizar' : 'Guardar Gasto'}
                </button>
                <button className="btn-ghost" onClick={cerrarForm}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="card">
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
                <>
                {/* Desktop: tabla */}
                <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {['Fecha','Descripción','Categoría','Tipo','Método','Monto','',''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtradas.map(t => {
                      const esAuto = t.origen === 'gastos_fijos' || t.origen === 'deuda' || t.origen === 'ahorro'
                      const origenLabel = t.origen === 'gastos_fijos' ? '🧾 Gasto fijo' : t.origen === 'deuda' ? '💳 Pago deuda' : t.origen === 'ahorro' ? '🐷 Ahorro' : null
                      return (
                      <tr key={t.id} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{t.fecha}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800 text-sm">{t.descripcion}</p>
                            {t.origen === 'whatsapp' && <MessageSquare className="w-3 h-3 text-gray-300" title="Via WhatsApp" />}
                            {origenLabel && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 whitespace-nowrap">
                                {origenLabel}
                              </span>
                            )}
                            {t.msi_meses && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                                style={{ background: 'var(--necesidad-bg)', color: 'var(--necesidad-fg)' }}
                                title={`${formatMXN(Number(t.monto) / t.msi_meses)}/mes`}>
                                {t.msi_meses} MSI
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {t.categorias ? `${t.categorias.icono} ${t.categorias.nombre}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge-${t.clasificacion}`}>{t.clasificacion}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{t.metodos_pago?.nombre ?? '—'}</td>
                        <td className="px-4 py-3 font-bold tabular whitespace-nowrap" style={{ color: 'var(--negative-fg)', fontVariantNumeric: 'tabular-nums' }}>-{formatMXN(t.monto)}</td>
                        <td className="px-2 py-3">
                          {esAuto
                            ? <div className="w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100" title="Edita desde Gastos Fijos o Deudas">
                                <Lock className="w-3 h-3 text-gray-300" />
                              </div>
                            : <button onClick={() => abrirEditar(t)}
                                className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-blue-50 hover:text-blue-500 flex items-center justify-center text-gray-300 transition-all">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                          }
                        </td>
                        <td className="px-2 py-3">
                          <button onClick={() => setConfirmDelete(t)}
                            className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-300 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                  <tfoot className="border-t border-gray-100 bg-gray-50">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 font-bold text-gray-700 text-sm">
                        {hayFiltros ? 'Subtotal filtrado' : 'TOTAL'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-primary-700">
                        -{formatMXN(filtradas.reduce((s, t) => s + Number(t.monto), 0))}
                      </td>
                      <td /><td />
                    </tr>
                  </tfoot>
                </table>
                </div>

                {/* Mobile: tarjetas apiladas */}
                <div className="lg:hidden divide-y divide-gray-50">
                  {filtradas.map(t => {
                    const esAuto = t.origen === 'gastos_fijos' || t.origen === 'deuda' || t.origen === 'ahorro'
                    const origenLabel = t.origen === 'gastos_fijos' ? '🧾 Gasto fijo' : t.origen === 'deuda' ? '💳 Pago deuda' : t.origen === 'ahorro' ? '🐷 Ahorro' : null
                    return (
                      <div key={t.id} className="px-4 py-3 flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-gray-800 text-sm">{t.descripcion}</p>
                            {t.origen === 'whatsapp' && <MessageSquare className="w-3 h-3 text-gray-300" />}
                            {origenLabel && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 whitespace-nowrap">
                                {origenLabel}
                              </span>
                            )}
                            {t.msi_meses && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                                style={{ background: 'var(--necesidad-bg)', color: 'var(--necesidad-fg)' }}>
                                {t.msi_meses} MSI
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`badge-${t.clasificacion}`}>{t.clasificacion}</span>
                            <span className="text-xs text-gray-500">
                              {t.categorias ? `${t.categorias.icono} ${t.categorias.nombre}` : '—'}
                            </span>
                            <span className="text-xs text-gray-300 font-mono">· {t.fecha}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className="font-bold text-sm tabular whitespace-nowrap" style={{ color: 'var(--negative-fg)', fontVariantNumeric: 'tabular-nums' }}>
                            -{formatMXN(t.monto)}
                          </span>
                          <div className="flex gap-1">
                            {esAuto
                              ? <span className="w-7 h-7 flex items-center justify-center" title="Edita desde Gastos Fijos o Deudas">
                                  <Lock className="w-3 h-3 text-gray-300" />
                                </span>
                              : <button onClick={() => abrirEditar(t)}
                                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-500 flex items-center justify-center text-gray-400">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                            }
                            <button onClick={() => setConfirmDelete(t)}
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div className="px-4 py-3 flex items-center justify-between bg-gray-50 font-bold text-sm">
                    <span className="text-gray-700">{hayFiltros ? 'Subtotal filtrado' : 'TOTAL'}</span>
                    <span className="font-mono text-primary-700">
                      -{formatMXN(filtradas.reduce((s, t) => s + Number(t.monto), 0))}
                    </span>
                  </div>
                </div>
                </>
              )}
        </div>

      </div>
      <ConfirmModal
        open={!!confirmDelete}
        titulo="¿Eliminar gasto?"
        descripcion={confirmDelete ? `${confirmDelete.descripcion} — ${confirmDelete.fecha}` : ''}
        onConfirm={() => { eliminar(confirmDelete); setConfirmDelete(null); toast('Gasto eliminado', 'info') }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
