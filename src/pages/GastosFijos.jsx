import { useState, useEffect, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { useGastosFijos } from '../hooks/useGastosFijos'
import { CLASIF_OPTS, formatMXN } from '../utils/constantes'
import { Plus, Trash2, Repeat, CheckCircle2, Circle, CalendarClock, AlertCircle, Pencil } from 'lucide-react'
import ConfirmModal from '../components/ui/ConfirmModal'
import FilterSelect from '../components/ui/FilterSelect'
import DatePicker   from '../components/ui/DatePicker'
import ErrorState   from '../components/ui/ErrorState'
import EmptyState   from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { fechaLocalISO } from '../utils/fecha'

const FORM_VACIO = { concepto: '', monto_previsto: '', clasificacion: 'necesidad', es_recurrente: false, dia_cobro: '', categoria_id: '', metodo_pago_id: '' }

export default function GastosFijos() {
  const { gastos, categorias, metodos, loading, error, refetch, saving, totales, agregar, actualizar, togglePagado, eliminar, autoCopiadosCount } = useGastosFijos()
  const toast = useToast()
  const prevAutoCopRef = useRef(0)
  const hoyDia = new Date().getDate()

  useEffect(() => {
    if (autoCopiadosCount > 0 && autoCopiadosCount !== prevAutoCopRef.current) {
      prevAutoCopRef.current = autoCopiadosCount
      toast(`✅ ${autoCopiadosCount} gastos recurrentes cargados para este mes`, 'success')
    }
  }, [autoCopiadosCount, toast])

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }))

  // Diálogo de pago: pregunta monto y fecha REALES antes de marcar pagado
  const [pagando, setPagando] = useState(null) // gasto en proceso de pago
  const [formPago, setFormPago] = useState({ monto: '', fecha: '' })

  const abrirDialogoPago = (g) => {
    // Fecha sugerida: el día de cobro del gasto en su mes, o hoy si no tiene
    const hoy = fechaLocalISO()
    let fechaSugerida = hoy
    if (g.dia_cobro && g.mes && g.anio) {
      const diasDelMes = new Date(g.anio, g.mes, 0).getDate()
      const dia = Math.min(g.dia_cobro, diasDelMes)
      fechaSugerida = `${g.anio}-${String(g.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    }
    setFormPago({ monto: g.monto_previsto, fecha: fechaSugerida })
    setPagando(g)
  }

  const confirmarPago = async () => {
    if (!pagando) return
    await togglePagado(pagando, { monto: formPago.monto, fecha: formPago.fecha })
    toast('Pago registrado ✓', 'success')
    setPagando(null)
  }

  // Al elegir categoría, hereda su clasificación (necesidad/deseo/ahorro)
  const onCategoriaChange = (catId) => {
    const cat = categorias.find(c => c.id === Number(catId))
    setForm(f => ({ ...f, categoria_id: catId, clasificacion: cat?.clasificacion ?? f.clasificacion }))
  }

  const abrirEditar = (g) => {
    setEditandoId(g.id)
    setForm({
      concepto:      g.concepto,
      monto_previsto: g.monto_previsto,
      clasificacion: g.clasificacion,
      es_recurrente: g.es_recurrente,
      dia_cobro:     g.dia_cobro ?? '',
      categoria_id:  g.categoria_id ?? '',
      metodo_pago_id: g.metodo_pago_id ?? '',
    })
    setMostrarForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cerrarForm = () => {
    setMostrarForm(false)
    setEditandoId(null)
    setForm(FORM_VACIO)
  }

  const handleGuardar = async () => {
    if (!form.concepto || !form.monto_previsto) return
    const datos = { ...form, dia_cobro: form.dia_cobro ? Number(form.dia_cobro) : null, categoria_id: form.categoria_id ? Number(form.categoria_id) : null }
    // Método de pago: solo mandar la columna cuando es relevante
    delete datos.metodo_pago_id
    if (form.metodo_pago_id) datos.metodo_pago_id = Number(form.metodo_pago_id)
    else if (editandoId) datos.metodo_pago_id = null // permitir quitarlo al editar
    if (editandoId) {
      await actualizar(editandoId, datos)
      toast('Gasto fijo actualizado ✓', 'success')
    } else {
      await agregar({ ...datos, monto_actual: 0 })
      toast('Gasto fijo guardado ✓', 'success')
    }
    cerrarForm()
  }

  const pagados = gastos.filter(g => g.pagado).length
  const total   = gastos.length
  const pctPagado = total > 0 ? (pagados / total) * 100 : 0

  // Clasifica urgencia de cada gasto
  const urgencia = (g) => {
    if (g.pagado || !g.dia_cobro) return 'normal'
    if (g.dia_cobro < hoyDia) return 'vencido'
    if (g.dia_cobro - hoyDia <= 3) return 'proximo'
    return 'normal'
  }

  if (error && !loading && gastos.length === 0) {
    return (
      <Layout titulo="Gastos Fijos">
        <ErrorState onRetry={refetch} mensaje={error} />
      </Layout>
    )
  }

  return (
    <Layout titulo="Gastos Fijos">
      <div className="space-y-5">

        {/* Resumen */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Por pagar</p>
            <p className="text-xl font-bold font-mono" style={{ color: 'var(--negative-fg)' }}>
              {formatMXN(totales.previsto - totales.actual)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Ya pagado</p>
            <p className="text-xl font-bold font-mono" style={{ color: 'var(--ahorro-fg)' }}>
              {formatMXN(totales.actual)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Total del mes</p>
            <p className="text-xl font-bold font-mono text-gray-700">{formatMXN(totales.previsto)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Progreso</p>
            <p className="text-xl font-bold font-mono text-primary-700">{pagados}/{total} facturas</p>
          </div>
        </div>

        {/* Barra de progreso */}
        {total > 0 && (
          <div className="card px-5 py-3">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-700">Facturas pagadas este mes</span>
              <span className="font-mono text-gray-500">{pctPagado.toFixed(0)}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bar-fill"
                style={{ width: `${pctPagado}%`, background: 'var(--ahorro)' }} />
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-2">
          <button onClick={() => { cerrarForm(); setMostrarForm(v => !v) }}
            className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Agregar gasto fijo
          </button>
        </div>

        {/* Formulario */}
        {mostrarForm && (
          <div className="card p-5 border-2 border-primary-100">
            <h3 className="font-bold text-gray-900 mb-4">{editandoId ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
              <div className="col-span-2 lg:col-span-1">
                <label className="label">Concepto</label>
                <input className="input" placeholder="Ej: Netflix, Renta, Luz..."
                  value={form.concepto} onChange={e => setF('concepto', e.target.value)} />
              </div>
              <div>
                <label className="label">Monto ($)</label>
                <input type="number" className="input font-mono" placeholder="0.00"
                  value={form.monto_previsto} onChange={e => setF('monto_previsto', e.target.value)} />
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
                <label className="label">Día de cobro</label>
                <input type="number" min="1" max="31" className="input font-mono"
                  placeholder="Ej: 15"
                  value={form.dia_cobro} onChange={e => setF('dia_cobro', e.target.value)} />
              </div>
              <div>
                <label className="label">Clasificación</label>
                <FilterSelect
                  value={form.clasificacion}
                  onChange={v => setF('clasificacion', v)}
                  options={CLASIF_OPTS}
                  placeholder="Tipo"
                  showClear={false}
                />
              </div>
              <div>
                <label className="label">Se paga con</label>
                <FilterSelect
                  value={form.metodo_pago_id}
                  onChange={v => setF('metodo_pago_id', v)}
                  options={metodos.map(m => ({ value: m.id, label: m.credito_id ? `💳 ${m.nombre}` : m.nombre }))}
                  placeholder="Sin método"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input type="checkbox" className="accent-primary-700 w-4 h-4"
                  checked={form.es_recurrente} onChange={e => setF('es_recurrente', e.target.checked)} />
                <Repeat className="w-3.5 h-3.5 text-gray-400" />
                Se repite cada mes
              </label>
              <div className="flex gap-2">
                <button className="btn-primary px-6" onClick={handleGuardar} disabled={saving}>
                  {saving ? 'Guardando...' : editandoId ? 'Actualizar' : 'Guardar'}
                </button>
                <button className="btn-ghost" onClick={cerrarForm}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tarjetas */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="card h-32 animate-pulse bg-gray-50" />
            ))}
          </div>
        ) : gastos.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No hay gastos fijos este mes"
            description="Agrega renta, servicios o suscripciones para que Finni te avise que falta pagar."
            action={
              <button onClick={() => { cerrarForm(); setMostrarForm(true) }} className="btn-primary text-sm">
                <Plus className="w-4 h-4" /> Agregar gasto fijo
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {gastos.map(g => {
              const u = urgencia(g)
              return (
                <div key={g.id}
                  className="card p-4 self-start transition-all"
                  style={
                    g.pagado      ? { opacity: 0.65 } :
                    u === 'vencido' ? { borderColor: 'var(--negative)', borderWidth: 2 } :
                    u === 'proximo' ? { borderColor: 'var(--deseo)',    borderWidth: 2 } :
                    {}
                  }
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-gray-900 text-sm truncate">{g.concepto}</p>
                        {g.es_recurrente && <Repeat className="w-3 h-3 text-gray-300 flex-shrink-0" title="Recurrente" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`badge-${g.clasificacion} text-xs`}>{g.clasificacion}</span>
                        {g.categorias && (
                          <span className="text-xs text-gray-400">{g.categorias.icono} {g.categorias.nombre}</span>
                        )}
                        {(() => {
                          const met = metodos.find(m => m.id === g.metodo_pago_id)
                          return met && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                              style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}>
                              {met.credito_id ? '💳' : ''} {met.nombre}
                            </span>
                          )
                        })()}
                        {g.dia_cobro && (
                          <span className="flex items-center gap-1 text-xs font-mono text-gray-400">
                            <CalendarClock className="w-3 h-3" />
                            Día {g.dia_cobro}
                          </span>
                        )}
                        {u === 'vencido' && (
                          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--negative-fg)' }}>
                            <AlertCircle className="w-3 h-3" /> Vencido
                          </span>
                        )}
                        {u === 'proximo' && (
                          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--deseo-fg)' }}>
                            <AlertCircle className="w-3 h-3" /> Próximo
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      <button onClick={() => abrirEditar(g)}
                        className="w-7 h-7 rounded-lg hover:bg-primary-50 hover:text-primary-700 flex items-center justify-center text-gray-300 transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(g.id)}
                        className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-300 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Monto */}
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Monto</p>
                      <p className="text-2xl font-bold font-mono" style={{ color: g.pagado ? 'var(--ahorro-fg)' : 'var(--fg-1)' }}>
                        {formatMXN(g.monto_previsto)}
                      </p>
                    </div>
                    {g.pagado && g.fecha_pago && (
                      <p className="text-xs text-gray-400 font-mono">Pagado {g.fecha_pago}</p>
                    )}
                  </div>

                  {/* Botón pago: al marcar pide monto/fecha reales; desmarcar es directo */}
                  <button
                    onClick={() => g.pagado ? togglePagado(g) : abrirDialogoPago(g)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={g.pagado
                      ? { background: 'var(--ahorro-bg)', color: 'var(--ahorro-fg)' }
                      : { background: 'var(--surface-2, #f3f4f6)', color: 'var(--fg-2)' }
                    }
                  >
                    {g.pagado
                      ? <><CheckCircle2 className="w-4 h-4" /> Pagado — desmarcar</>
                      : <><Circle className="w-4 h-4" /> Marcar como pagado</>
                    }
                  </button>
                </div>
              )
            })}
          </div>
        )}

      </div>

      <ConfirmModal
        open={!!confirmDelete}
        titulo="¿Eliminar gasto fijo?"
        descripcion="Esta acción no se puede deshacer."
        onConfirm={() => { eliminar(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Diálogo de pago: monto y fecha reales */}
      {pagando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-backdrop-in">
          <div className="card p-6 w-full max-w-sm shadow-xl animate-modal-in">
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--fg-1)' }}>
              Pagar: {pagando.concepto}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--fg-3)' }}>
              Confirma cuánto pagaste y qué día (pre-llenado con lo previsto).
              {(() => {
                const met = metodos.find(m => m.id === pagando.metodo_pago_id)
                return met && (
                  <span className="block mt-1">
                    Se registrará con: <span className="font-semibold" style={{ color: 'var(--fg-2)' }}>{met.credito_id ? '💳 ' : ''}{met.nombre}</span>
                    {met.credito_id ? ' (suma al saldo y al corte de la tarjeta)' : ''}
                  </span>
                )
              })()}
            </p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="label">¿Cuánto pagaste? ($)</label>
                <input type="number" className="input font-mono"
                  value={formPago.monto}
                  onChange={e => setFormPago(f => ({ ...f, monto: e.target.value }))} />
                {Number(formPago.monto) !== Number(pagando.monto_previsto) && formPago.monto !== '' && (
                  <p className="text-xs mt-1" style={{ color: 'var(--warning-fg)' }}>
                    Previsto: {formatMXN(pagando.monto_previsto)}
                  </p>
                )}
              </div>
              <div>
                <label className="label">¿Qué día?</label>
                <DatePicker
                  value={formPago.fecha}
                  onChange={v => setFormPago(f => ({ ...f, fecha: v }))}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setPagando(null)}>Cancelar</button>
              <button className="btn-primary"
                disabled={!formPago.monto || Number(formPago.monto) <= 0}
                onClick={confirmarPago}>
                Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
