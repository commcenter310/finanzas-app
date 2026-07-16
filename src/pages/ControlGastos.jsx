import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Download,
  Landmark,
  Layers3,
  Lock,
  MessageSquare,
  Pencil,
  PiggyBank,
  Plus,
  ReceiptText,
  Repeat2,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react'
import Layout from '../components/layout/Layout'
import ConfirmModal from '../components/ui/ConfirmModal'
import DatePicker from '../components/ui/DatePicker'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import FilterSelect from '../components/ui/FilterSelect'
import { useToast } from '../components/ui/Toast'
import {
  SectionHeader,
  SegmentedControl,
  Sheet,
  StatusPill,
} from '../components/commitments/CommitmentUI'
import {
  SpendingMetric,
  SpendingNav,
  SpendingOverview,
  SpendingSignal,
} from '../components/spending/SpendingUI'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useTransacciones } from '../hooks/useTransacciones'
import { CLASIF_OPTS, formatMXN, MESES } from '../utils/constantes'
import { fechaLocalISO } from '../utils/fecha'

const FORM_VACIO = {
  descripcion: '',
  monto: '',
  categoria_id: '',
  clasificacion: 'deseo',
  metodo_pago_id: '',
  msi_meses: '',
  fecha: fechaLocalISO(),
}

const MSI_OPTS = [3, 6, 9, 12, 18, 24].map(n => ({ value: n, label: `${n} meses sin intereses` }))
const CSV_HEADERS = ['Fecha', 'Descripcion', 'Categoria', 'Tipo', 'Metodo', 'Monto']
const ORIGEN_OPTS = [
  { value: 'web', label: 'Manual' },
  { value: 'gastos_fijos', label: 'Gastos fijos' },
  { value: 'deuda', label: 'Pagos de deuda' },
  { value: 'ahorro', label: 'Depósitos de ahorro' },
  { value: 'whatsapp', label: 'WhatsApp' },
]
const CLASIF_SEGMENTS = [
  { value: '', label: 'Todos', icon: Layers3 },
  { value: 'necesidad', label: 'Necesidad', icon: ShieldCheck },
  { value: 'deseo', label: 'Deseo', icon: Sparkles },
  { value: 'ahorro', label: 'Ahorro', icon: PiggyBank },
]
const ORIGEN_META = {
  gastos_fijos: { label: 'Gasto fijo', icon: Repeat2 },
  deuda: { label: 'Pago de deuda', icon: Landmark },
  ahorro: { label: 'Ahorro', icon: PiggyBank },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare },
}

function escapeCsvValue(value) {
  const raw = value == null ? '' : String(value)
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replaceAll('"', '""')}"`
}

function downloadCsv(filename, rows) {
  const csv = [
    'sep=,',
    CSV_HEADERS.map(escapeCsvValue).join(','),
    ...rows.map(row => CSV_HEADERS.map(header => escapeCsvValue(row[header])).join(',')),
  ].join('\r\n')

  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function fechaCorta(fecha) {
  const [, mes, dia] = String(fecha ?? '').split('-').map(Number)
  if (!mes || !dia) return fecha
  return `${String(dia).padStart(2, '0')} ${MESES[mes - 1].slice(0, 3).toLowerCase()}`
}

function MovimientoBadges({ transaccion }) {
  const origen = ORIGEN_META[transaccion.origen]
  const OrigenIcon = origen?.icon

  return (
    <div className="spending-row-badges">
      <StatusPill tone={transaccion.clasificacion === 'ahorro' ? 'positive' : transaccion.clasificacion === 'deseo' ? 'warning' : 'primary'}>
        {transaccion.clasificacion}
      </StatusPill>
      {origen && (
        <StatusPill icon={OrigenIcon}>{origen.label}</StatusPill>
      )}
      {transaccion.msi_meses && (
        <StatusPill tone="primary">{transaccion.msi_meses} MSI</StatusPill>
      )}
    </div>
  )
}

export default function ControlGastos() {
  const { profile } = useAuth()
  const { mes, anio } = useMes()
  const {
    transacciones,
    categorias,
    metodos,
    loading,
    error,
    refetch,
    saving,
    totales,
    agregar,
    actualizar,
    eliminar,
  } = useTransacciones()
  const umbral = profile?.umbral_hormiga ?? 100
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [formAbierto, setFormAbierto] = useState(false)
  const mostrarForm = formAbierto || searchParams.get('nuevo') === '1'
  const [editandoId, setEditandoId] = useState(null)
  const [transaccionOriginal, setTransaccionOriginal] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const setF = (key, value) => setForm(current => ({ ...current, [key]: value }))

  useEffect(() => {
    const abrirNuevo = () => setFormAbierto(true)
    window.addEventListener('finni:new-expense', abrirNuevo)
    return () => window.removeEventListener('finni:new-expense', abrirNuevo)
  }, [])

  const abrirNuevo = () => {
    setEditandoId(null)
    setTransaccionOriginal(null)
    setForm(FORM_VACIO)
    setFormAbierto(true)
  }

  const abrirEditar = transaccion => {
    setTransaccionOriginal(transaccion)
    setForm({
      descripcion: transaccion.descripcion,
      monto: transaccion.monto,
      categoria_id: transaccion.categorias?.id ?? '',
      clasificacion: transaccion.clasificacion,
      metodo_pago_id: transaccion.metodos_pago?.id ?? '',
      msi_meses: transaccion.msi_meses ?? '',
      fecha: transaccion.fecha,
    })
    setEditandoId(transaccion.id)
    setFormAbierto(true)
  }

  const cerrarForm = () => {
    setFormAbierto(false)
    if (searchParams.has('nuevo')) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('nuevo')
      setSearchParams(nextParams, { replace: true })
    }
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

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroClasif('')
    setFiltroCategoria('')
    setFiltroOrigen('')
    setSoloHormiga(false)
  }

  const onCategoriaChange = catId => {
    setF('categoria_id', catId)
    const categoria = categorias.find(item => item.id === Number(catId))
    if (categoria) setF('clasificacion', categoria.clasificacion)
  }

  const metodoSeleccionado = metodos.find(item => item.id === Number(form.metodo_pago_id))
  const esTarjetaCredito = Boolean(metodoSeleccionado?.credito_id)

  const handleGuardar = async () => {
    if (!form.descripcion || !form.monto) return
    const resto = { ...form }
    delete resto.msi_meses
    const datos = {
      ...resto,
      monto: Number(form.monto),
      categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      metodo_pago_id: form.metodo_pago_id ? Number(form.metodo_pago_id) : null,
    }
    if (esTarjetaCredito && form.msi_meses) datos.msi_meses = Number(form.msi_meses)
    else if (transaccionOriginal?.msi_meses) datos.msi_meses = null

    const result = editandoId
      ? await actualizar(editandoId, datos, transaccionOriginal)
      : await agregar(datos)

    if (!result.error) {
      const editado = Boolean(editandoId)
      cerrarForm()
      toast(editado ? 'Gasto actualizado' : 'Gasto guardado', 'success')
    } else {
      toast('Error al guardar el gasto', 'error')
    }
  }

  const filtradas = useMemo(() => transacciones.filter(transaccion => {
    const matchBusqueda = !busqueda || transaccion.descripcion.toLowerCase().includes(busqueda.toLowerCase())
    const matchClasif = !filtroClasif || transaccion.clasificacion === filtroClasif
    const matchCategoria = !filtroCategoria || transaccion.categoria_id === Number(filtroCategoria)
    const matchOrigen = !filtroOrigen || (transaccion.origen ?? 'web') === filtroOrigen
    const matchHormiga = !soloHormiga || (Number(transaccion.monto) <= umbral && transaccion.clasificacion === 'deseo')
    return matchBusqueda && matchClasif && matchCategoria && matchOrigen && matchHormiga
  }), [transacciones, busqueda, filtroClasif, filtroCategoria, filtroOrigen, soloHormiga, umbral])

  const resumen = useMemo(() => {
    const porCategoria = new Map()
    let hormigaCantidad = 0
    let hormigaMonto = 0

    transacciones.forEach(transaccion => {
      const monto = Number(transaccion.monto)
      const nombre = transaccion.categorias?.nombre ?? 'Sin categoría'
      porCategoria.set(nombre, (porCategoria.get(nombre) ?? 0) + monto)
      if (transaccion.clasificacion === 'deseo' && monto <= umbral) {
        hormigaCantidad += 1
        hormigaMonto += monto
      }
    })

    const categoriaPrincipal = [...porCategoria.entries()]
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((a, b) => b.monto - a.monto)[0]
    const hoy = new Date()
    const diasDelMes = new Date(anio, mes, 0).getDate()
    const esMesActual = hoy.getFullYear() === anio && hoy.getMonth() + 1 === mes
    const esMesPasado = new Date(anio, mes - 1, 1) < new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const diasBase = esMesActual ? hoy.getDate() : esMesPasado ? diasDelMes : 1

    return {
      categoriaPrincipal,
      hormigaCantidad,
      hormigaMonto,
      promedioDia: totales.total / Math.max(diasBase, 1),
    }
  }, [transacciones, totales.total, mes, anio, umbral])

  const hayFiltros = Boolean(busqueda || filtroClasif || filtroCategoria || filtroOrigen || soloHormiga)
  const subtotal = filtradas.reduce((sum, transaccion) => sum + Number(transaccion.monto), 0)
  const categoriaPct = totales.total > 0 && resumen.categoriaPrincipal
    ? (resumen.categoriaPrincipal.monto / totales.total) * 100
    : 0

  const exportarCSV = () => {
    const filas = filtradas.map(transaccion => ({
      Fecha: transaccion.fecha,
      Descripcion: transaccion.descripcion,
      Categoria: transaccion.categorias ? `${transaccion.categorias.icono} ${transaccion.categorias.nombre}` : '',
      Tipo: transaccion.clasificacion,
      Metodo: transaccion.metodos_pago?.nombre ?? '',
      Monto: Number(transaccion.monto),
    }))
    downloadCsv(`gastos-${anio}-${String(mes).padStart(2, '0')}${hayFiltros ? '-filtrado' : ''}.csv`, filas)
    toast('CSV descargado', 'success')
  }

  if (error && !loading && transacciones.length === 0) {
    return (
      <Layout titulo="Movimientos">
        <ErrorState onRetry={refetch} mensaje={error} />
      </Layout>
    )
  }

  return (
    <Layout titulo="Movimientos">
      <div className="spending-page">
        <div className="spending-module-bar">
          <SpendingNav />
          <button type="button" onClick={abrirNuevo} className="btn-primary spending-new-button">
            <Plus aria-hidden="true" />
            <span>Registrar gasto</span>
          </button>
        </div>

        <SpendingOverview
          eyebrow={`${MESES[mes - 1]} ${anio}`}
          title="El pulso de tus gastos"
          description={`${transacciones.length} movimiento${transacciones.length === 1 ? '' : 's'} en seguimiento`}
          amountLabel="Salida acumulada"
          amount={formatMXN(totales.total)}
          progress={categoriaPct}
          progressLabel={resumen.categoriaPrincipal ? `Mayor concentración: ${resumen.categoriaPrincipal.nombre}` : 'Sin concentración de gasto'}
          progressEnd={resumen.categoriaPrincipal ? `${categoriaPct.toFixed(0)}%` : '0%'}
          loading={loading}
          metrics={(
            <>
              <SpendingMetric icon={ShieldCheck} label="Necesidad" value={formatMXN(totales.necesidad)} tone="need" />
              <SpendingMetric icon={Sparkles} label="Deseo" value={formatMXN(totales.deseo)} tone="want" />
              <SpendingMetric icon={PiggyBank} label="Ahorro" value={formatMXN(totales.ahorro)} tone="saving" />
            </>
          )}
          aside={resumen.hormigaCantidad > 0 ? (
            <SpendingSignal
              icon={CircleDollarSign}
              label="Fuga detectada"
              title={`${resumen.hormigaCantidad} gastos hormiga`}
              description={`${formatMXN(resumen.hormigaMonto)} en compras de hasta ${formatMXN(umbral)}.`}
              tone="warning"
              action={(
                <button type="button" className="spending-signal-link" onClick={() => setSoloHormiga(true)}>
                  Revisar movimientos <ArrowRight aria-hidden="true" />
                </button>
              )}
            />
          ) : (
            <SpendingSignal
              icon={WalletCards}
              label="Ritmo del mes"
              title={`${formatMXN(resumen.promedioDia)} al día`}
              description={resumen.categoriaPrincipal
                ? `${resumen.categoriaPrincipal.nombre} concentra ${formatMXN(resumen.categoriaPrincipal.monto)}.`
                : 'Aun no hay salidas registradas en este periodo.'}
              tone="positive"
            />
          )}
        />

        <SectionHeader
          eyebrow="Bitácora mensual"
          title="Movimientos"
          description={`${filtradas.length} de ${transacciones.length} registros visibles`}
        />

        <section className="spending-ledger">
          <div className="spending-filters">
            <div className="spending-filter-primary">
              <label className="spending-search">
                <Search aria-hidden="true" />
                <input
                  className="input"
                  placeholder="Buscar descripción"
                  value={busqueda}
                  onChange={event => setBusqueda(event.target.value)}
                />
              </label>
              <SegmentedControl
                ariaLabel="Filtrar por clasificación"
                value={filtroClasif}
                options={CLASIF_SEGMENTS}
                onChange={setFiltroClasif}
              />
            </div>

            <div className="spending-filter-secondary">
              <FilterSelect
                className="spending-filter-select"
                value={filtroCategoria}
                onChange={setFiltroCategoria}
                options={categorias.map(categoria => ({ value: categoria.id, label: categoria.nombre, icon: categoria.icono }))}
                placeholder="Todas las categorías"
                searchable
                searchPlaceholder="Buscar categoría"
              />
              <FilterSelect
                className="spending-filter-select"
                value={filtroOrigen}
                onChange={setFiltroOrigen}
                options={ORIGEN_OPTS}
                placeholder="Todos los orígenes"
              />
              <button
                type="button"
                onClick={() => setSoloHormiga(current => !current)}
                className={`spending-filter-toggle ${soloHormiga ? 'is-active' : ''}`}
                aria-pressed={soloHormiga}
              >
                <CircleDollarSign aria-hidden="true" />
                Gastos hormiga
              </button>
              <div className="spending-filter-actions">
                {hayFiltros && (
                  <button type="button" onClick={limpiarFiltros} className="icon-button" aria-label="Limpiar filtros" title="Limpiar filtros">
                    <X aria-hidden="true" />
                  </button>
                )}
                {filtradas.length > 0 && (
                  <button type="button" onClick={exportarCSV} className="icon-button" aria-label="Exportar movimientos" title="Exportar movimientos">
                    <Download aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="spending-ledger-summary">
            <span>{hayFiltros ? 'Subtotal filtrado' : 'Total del periodo'}</span>
            <strong>-{formatMXN(subtotal)}</strong>
          </div>

          {loading ? (
            <div className="spending-loading">
              {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
            </div>
          ) : filtradas.length === 0 ? (
            <EmptyState
              icon={hayFiltros ? Search : ReceiptText}
              title={hayFiltros ? 'Ningún gasto coincide' : 'Sin gastos este mes'}
              description={hayFiltros
                ? 'Ajusta la busqueda o limpia los filtros activos.'
                : 'Tu bitácora comenzará con el primer movimiento del periodo.'}
              className="min-h-[260px]"
              action={hayFiltros ? (
                <button type="button" onClick={limpiarFiltros} className="btn-secondary text-sm">
                  <X aria-hidden="true" /> Limpiar filtros
                </button>
              ) : (
                <button type="button" onClick={abrirNuevo} className="btn-primary text-sm">
                  <Plus aria-hidden="true" /> Registrar gasto
                </button>
              )}
            />
          ) : (
            <>
              <div className="spending-table spending-table-head" aria-hidden="true">
                <span>Fecha</span>
                <span>Movimiento</span>
                <span>Categoría</span>
                <span>Método</span>
                <span>Monto</span>
                <span />
              </div>
              <div className="spending-rows">
                {filtradas.map(transaccion => {
                  const esAuto = ['gastos_fijos', 'deuda', 'ahorro'].includes(transaccion.origen)
                  return (
                    <article key={transaccion.id} className="spending-table spending-row">
                      <div className="spending-row-date">
                        <CalendarDays aria-hidden="true" />
                        <span>{fechaCorta(transaccion.fecha)}</span>
                      </div>
                      <div className="spending-row-main">
                        <strong>{transaccion.descripcion}</strong>
                        <MovimientoBadges transaccion={transaccion} />
                      </div>
                      <div className="spending-row-category">
                        <span>{transaccion.categorias?.icono ?? '–'}</span>
                        <strong>{transaccion.categorias?.nombre ?? 'Sin categoría'}</strong>
                      </div>
                      <span className="spending-row-method">{transaccion.metodos_pago?.nombre ?? 'No especificado'}</span>
                      <strong className="spending-row-amount">-{formatMXN(transaccion.monto)}</strong>
                      <div className="spending-row-actions">
                        {esAuto ? (
                          <span className="icon-button is-static" title="Se edita desde su módulo de origen">
                            <Lock aria-hidden="true" />
                          </span>
                        ) : (
                          <button type="button" onClick={() => abrirEditar(transaccion)} className="icon-button" aria-label={`Editar ${transaccion.descripcion}`} title="Editar">
                            <Pencil aria-hidden="true" />
                          </button>
                        )}
                        <button type="button" onClick={() => setConfirmDelete(transaccion)} className="icon-button is-danger" aria-label={`Eliminar ${transaccion.descripcion}`} title="Eliminar">
                          <Trash2 aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>

      <Sheet
        open={mostrarForm}
        onClose={cerrarForm}
        eyebrow="Centro de gastos"
        title={editandoId ? 'Editar movimiento' : 'Registrar gasto'}
        description={editandoId ? 'Actualiza los datos del movimiento seleccionado.' : 'Añade una salida a la bitácora del periodo.'}
        footer={(
          <>
            <button type="button" className="btn-ghost" onClick={cerrarForm}>Cancelar</button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleGuardar}
              disabled={saving || !form.descripcion || !Number(form.monto)}
            >
              {saving ? 'Guardando...' : editandoId ? 'Actualizar' : 'Guardar gasto'}
            </button>
          </>
        )}
      >
        <div className="spending-form-amount">
          <label htmlFor="gasto-monto">Monto</label>
          <div>
            <span>$</span>
            <input
              id="gasto-monto"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.monto}
              onChange={event => setF('monto', event.target.value)}
            />
          </div>
        </div>

        <div className="commitment-form-grid">
          <div className="commitment-form-field is-wide">
            <label className="label" htmlFor="gasto-descripcion">Descripción</label>
            <input
              id="gasto-descripcion"
              className="input"
              placeholder="Ej. Supermercado, gasolina, cafe"
              value={form.descripcion}
              onChange={event => setF('descripcion', event.target.value)}
            />
          </div>
          <div className="commitment-form-field">
            <label className="label">Fecha</label>
            <DatePicker value={form.fecha} onChange={value => setF('fecha', value)} />
          </div>
          <div className="commitment-form-field">
            <label className="label">Categoría</label>
            <FilterSelect
              value={form.categoria_id}
              onChange={onCategoriaChange}
              options={categorias.map(categoria => ({ value: categoria.id, label: categoria.nombre, icon: categoria.icono }))}
              placeholder="Sin categoría"
              searchable
              searchPlaceholder="Buscar categoría"
            />
          </div>
          <div className="commitment-form-field">
            <label className="label">Clasificación</label>
            <FilterSelect
              value={form.clasificacion}
              onChange={value => setF('clasificacion', value)}
              options={CLASIF_OPTS}
              placeholder="Clasificación"
              showClear={false}
            />
          </div>
          <div className="commitment-form-field">
            <label className="label">Método de pago</label>
            <FilterSelect
              value={form.metodo_pago_id}
              onChange={value => setF('metodo_pago_id', value)}
              options={metodos.map(metodo => ({ value: metodo.id, label: metodo.nombre }))}
              placeholder="No especificado"
            />
          </div>
          {esTarjetaCredito && (
            <div className="commitment-form-field is-wide">
              <label className="label">Compra a meses</label>
              <FilterSelect
                value={form.msi_meses}
                onChange={value => setF('msi_meses', value)}
                options={MSI_OPTS}
                placeholder="Pago de contado"
              />
              {form.msi_meses && Number(form.monto) > 0 && (
                <p className="commitment-form-note">
                  Mensualidad estimada: {formatMXN(Number(form.monto) / Number(form.msi_meses))}
                </p>
              )}
            </div>
          )}
        </div>
      </Sheet>

      <ConfirmModal
        open={Boolean(confirmDelete)}
        titulo="¿Eliminar gasto?"
        descripcion={confirmDelete ? `${confirmDelete.descripcion} — ${confirmDelete.fecha}` : ''}
        onConfirm={() => {
          eliminar(confirmDelete)
          setConfirmDelete(null)
          toast('Gasto eliminado', 'info')
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
