import { useState, useEffect, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { useGastosFijos } from '../hooks/useGastosFijos'
import { CLASIF_OPTS, formatMXN } from '../utils/constantes'
import { Plus, Trash2, Repeat, CheckCircle2, Circle, Pencil } from 'lucide-react'
import ConfirmModal from '../components/ui/ConfirmModal'
import FilterSelect from '../components/ui/FilterSelect'
import DatePicker   from '../components/ui/DatePicker'
import ErrorState   from '../components/ui/ErrorState'
import EmptyState   from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { contextoMes, fechaCorta, fechaLocalISO } from '../utils/fecha'
import { urgenciaGastoFijo } from '../utils/calculos'
import { esDiaDelMesOpcional, esMontoPositivo, textoLimpio } from '../utils/validaciones'
import { useMes } from '../context/MesContext'
import { plural } from '../utils/texto'
import { mensajeErrorOperacion } from '../utils/operaciones'

const FORM_VACIO = { concepto: '', monto_previsto: '', clasificacion: 'necesidad', es_recurrente: false, dia_cobro: '', categoria_id: '', metodo_pago_id: '' }

export default function GastosFijos() {
  const { gastos, categorias, metodos, loading, error, refetch, saving, totales, agregar, actualizar, togglePagado, eliminar, autoCopiadosCount } = useGastosFijos()
  const toast = useToast()
  const prevAutoCopRef = useRef(0)
  const { mes, anio } = useMes()
  const contexto = contextoMes(mes, anio)

  useEffect(() => {
    if (autoCopiadosCount > 0 && autoCopiadosCount !== prevAutoCopRef.current) {
      prevAutoCopRef.current = autoCopiadosCount
      toast(`${plural(autoCopiadosCount, 'gasto recurrente cargado', 'gastos recurrentes cargados')} para este mes`, 'success')
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
    const resultado = await togglePagado(pagando, { monto: formPago.monto, fecha: formPago.fecha })
    if (resultado?.error) {
      toast(mensajeErrorOperacion(resultado.error), 'error')
      return
    }
    toast('Pago registrado', 'success')
    setPagando(null)
  }

  const desmarcarPago = async gasto => {
    const resultado = await togglePagado(gasto)
    toast(
      resultado?.error ? mensajeErrorOperacion(resultado.error) : 'Pago desmarcado',
      resultado?.error ? 'error' : 'info'
    )
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
    if (!textoLimpio(form.concepto) || !esMontoPositivo(form.monto_previsto)) {
      toast('Escribe el concepto y un monto mayor a cero.', 'error')
      return
    }
    if (!esDiaDelMesOpcional(form.dia_cobro)) {
      toast('El día de cobro debe ser un número del 1 al 31.', 'error')
      return
    }
    const datos = { ...form, concepto: textoLimpio(form.concepto), monto_previsto: Number(form.monto_previsto), dia_cobro: form.dia_cobro ? Number(form.dia_cobro) : null, categoria_id: form.categoria_id ? Number(form.categoria_id) : null }
    // Método de pago: solo mandar la columna cuando es relevante
    delete datos.metodo_pago_id
    if (form.metodo_pago_id) datos.metodo_pago_id = Number(form.metodo_pago_id)
    else if (editandoId) datos.metodo_pago_id = null // permitir quitarlo al editar
    const { error } = editandoId
      ? await actualizar(editandoId, datos)
      : await agregar({ ...datos, monto_actual: 0 })
    if (error) {
      toast('No se pudo guardar el gasto fijo. Intenta de nuevo.', 'error')
      return
    }
    toast(editandoId ? 'Gasto fijo actualizado' : 'Gasto fijo guardado', 'success')
    cerrarForm()
  }

  const pagados = gastos.filter(g => g.pagado).length
  const total   = gastos.length
  const pctPagado = total > 0 ? (pagados / total) * 100 : 0

  // Urgencia de cada gasto según el mes que se está viendo (no solo el día de hoy)
  const urgencia = (g) => urgenciaGastoFijo(g, contexto)

  if (error && !loading && gastos.length === 0) {
    return (
      <Layout titulo="Gastos fijos">
        <ErrorState onRetry={refetch} mensaje={error} />
      </Layout>
    )
  }

  const abrirNuevo = () => { cerrarForm(); setMostrarForm(v => !v) }

  return (
    <Layout titulo="Gastos fijos" acciones={(
      <button type="button" onClick={abrirNuevo} className="btn-primary">
        <Plus className="w-4 h-4" aria-hidden="true" /> <span>Agregar gasto fijo</span>
      </button>
    )}>
      <div className="space-y-3">

        {/* Formulario */}
        {mostrarForm && (
          <div className="card p-4">
            <h3 className="titulo-seccion mb-4">{editandoId ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}</h3>
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
                  searchable
                  searchPlaceholder="Buscar categoría"
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
                  options={metodos.map(m => ({ value: m.id, label: m.nombre }))}
                  placeholder="Sin método"
                />
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input type="checkbox" className="accent-primary-700 w-4 h-4"
                  checked={form.es_recurrente} onChange={e => setF('es_recurrente', e.target.checked)} />
                Se repite cada mes
              </label>
              <div className="flex gap-2">
                {editandoId && (
                  <button className="btn-ghost" style={{ color: 'var(--negative-fg)' }}
                    onClick={() => { const g = gastos.find(x => x.id === editandoId); cerrarForm(); setConfirmDelete(g) }}>
                    <Trash2 className="w-4 h-4" aria-hidden="true" /> Eliminar
                  </button>
                )}
                <button className="btn-ghost" onClick={cerrarForm}>
                  Cancelar
                </button>
                <button className="btn-primary" onClick={handleGuardar} disabled={saving}>
                  {saving ? 'Guardando...' : editandoId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tarjetas */}
        {loading ? (
          <div className="space-y-2">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="card h-14 animate-pulse" />
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
          <section className="card">
            <div className="fijos-resumen">
              <p>
                Por pagar <strong>{formatMXN(totales.porPagar)}</strong>
                <span className="fijos-resumen-sep">·</span>
                pagado {formatMXN(totales.actual)} de {formatMXN(totales.previsto)}
              </p>
              <p className="tabular">{pagados} de {total} pagados</p>
            </div>
            <div className="fijos-barra" role="progressbar" aria-valuenow={Math.round(pctPagado)} aria-valuemin={0} aria-valuemax={100} aria-label="Gastos fijos pagados">
              <span style={{ width: `${pctPagado}%` }} />
            </div>
            <ul>
              {gastos.map(g => {
                const u = urgencia(g)
                const met = metodos.find(m => m.id === g.metodo_pago_id)
                const detalle = [
                  g.dia_cobro ? `día ${g.dia_cobro}` : null,
                  g.categorias?.nombre,
                  met?.nombre,
                  g.es_recurrente ? 'cada mes' : null,
                ].filter(Boolean).join(' · ')
                return (
                  <li key={g.id} className="fijo-fila group">
                    <span className="fijo-concepto">
                      <button type="button" className="fijo-abrir" onClick={() => abrirEditar(g)} title="Editar">{g.concepto}</button>
                      {u === 'vencido' && <span style={{ color: 'var(--negative-fg)' }}>vencido</span>}
                      {u === 'proximo' && <span style={{ color: 'var(--warning-fg)' }}>vence pronto</span>}
                    </span>
                    <span className={`badge-${g.clasificacion} fijo-tipo`}>{g.clasificacion}</span>
                    <span className="fijo-detalle">{detalle}</span>
                    <span className="fijo-monto">
                      {formatMXN(g.pagado && Number(g.monto_actual) > 0 ? g.monto_actual : g.monto_previsto)}
                      {g.pagado && g.fecha_pago && <small>pagado el {fechaCorta(g.fecha_pago)}</small>}
                    </span>
                    {/* Al marcar pide monto/fecha reales; desmarcar es directo */}
                    <button
                      onClick={() => g.pagado ? desmarcarPago(g) : abrirDialogoPago(g)}
                      disabled={saving}
                      className={`btn-check fijo-check ${g.pagado ? 'is-on' : ''}`}
                      title={g.pagado ? 'Desmarcar el pago' : undefined}
                    >
                      {g.pagado
                        ? <><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Pagado</>
                        : <><Circle className="w-4 h-4" aria-hidden="true" /> Marcar pagado</>}
                    </button>
                    <span className="acciones-hover fijo-acciones">
                      <button onClick={() => abrirEditar(g)} aria-label={`Editar ${g.concepto}`} title="Editar" className="icon-button icon-button-sm">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(g)} aria-label={`Eliminar ${g.concepto}`} title="Eliminar" className="icon-button icon-button-sm">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                    <span className="fijo-meta">
                      <span className={`badge-${g.clasificacion}`}>{g.clasificacion}</span>{detalle && ` · ${detalle}`}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

      </div>

      <ConfirmModal
        open={!!confirmDelete}
        titulo="¿Eliminar gasto fijo?"
        descripcion={confirmDelete?.pagado
          ? 'Ya está marcado como pagado: también se quitará su movimiento de Control de Gastos. Esta acción no se puede deshacer.'
          : 'Esta acción no se puede deshacer.'}
        onConfirm={async () => {
          const { id } = confirmDelete
          setConfirmDelete(null)
          const { error } = await eliminar(id)
          if (error) toast(mensajeErrorOperacion(error), 'error')
          else toast('Gasto fijo eliminado', 'info')
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Diálogo de pago: monto y fecha reales */}
      {pagando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-backdrop-in">
          <div className="card p-4 w-full max-w-sm shadow-xl animate-modal-in">
            <h3 className="titulo-seccion mb-1">
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
