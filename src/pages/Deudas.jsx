import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownToLine,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  CreditCard,
  ExternalLink,
  ListOrdered,
  LoaderCircle,
  Pencil,
  Plus,
  Target,
  TimerReset,
  Trash2,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import Layout from '../components/layout/Layout'
import ConfirmModal from '../components/ui/ConfirmModal'
import DatePicker from '../components/ui/DatePicker'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import { useToast } from '../components/ui/Toast'
import {
  CommitmentHero,
  CommitmentNav,
  HeroMetric,
  PriorityPanel,
  ProgressRail,
  SectionHeader,
  SegmentedControl,
  Sheet,
  StatusPill,
  TextAction,
} from '../components/commitments/CommitmentUI'
import { useDeudas } from '../hooks/useDeudas'
import { formatMXN } from '../utils/constantes'
import {
  esFechaQuincenalValida,
  montoMensualProgramado,
  normalizarFrecuenciaPago,
  resolverVencimientoProgramado,
} from '../utils/pagosProgramados'
import { mensajeErrorPago } from '../utils/pagos'

const FORM_VACIO = {
  nombre: '',
  saldo_original: '',
  saldo_actual: '',
  pago_mensual: '',
  frecuencia_pago: 'mensual',
  tasa_interes: '',
  fecha_proximo_pago: '',
  notas: '',
}

const numero = value => Number(value ?? 0)

const formatearMeses = meses => {
  if (!meses) return 'Sin estimación'
  if (meses < 12) return `${meses} mes${meses !== 1 ? 'es' : ''}`
  const anios = Math.floor(meses / 12)
  const resto = meses % 12
  return `${anios} año${anios !== 1 ? 's' : ''}${resto ? ` ${resto}m` : ''}`
}

const mesesParaLiquidar = deuda => {
  const pago = montoMensualProgramado(deuda.pago_mensual, deuda.frecuencia_pago)
  const saldo = numero(deuda.saldo_actual)
  return pago > 0 && saldo > 0 ? Math.ceil(saldo / pago) : null
}

const estadoVencimiento = (deuda, hoy = new Date()) => {
  if (deuda.tipo === 'credito') {
    return resolverVencimientoProgramado({
      diaPago: deuda.fecha_pago_dia,
      pagos: deuda.abonos_deuda,
      hoy,
      ventanaInicio: 'mes',
    })
  }

  return resolverVencimientoProgramado({
    fechaBaseISO: deuda.fecha_proximo_pago,
    frecuencia: deuda.frecuencia_pago,
    pagos: deuda.abonos_deuda,
    montoObjetivo: deuda.pago_mensual,
    saldoActual: deuda.saldo_actual,
    hoy,
    ventanaInicio: 'periodo',
  })
}

const textoVencimiento = (deuda, estado = estadoVencimiento(deuda)) => {
  if (!estado) return deuda.fecha_proximo_pago
  const { dias, ciclosPagados } = estado
  const prefijoPagado = ciclosPagados > 0 ? 'Pago registrado · ' : ''
  if (dias < 0) return `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`
  if (dias === 0) return `${prefijoPagado}Vence hoy`
  return `${prefijoPagado}Vence en ${dias} día${dias !== 1 ? 's' : ''}`
}

const tonoVencimiento = estado => {
  if (!estado) return 'neutral'
  if (estado.ciclosPagados > 0 && estado.dias >= 0) return 'positive'
  if (estado.dias < 0 || estado.dias <= 3) return 'negative'
  if (estado.dias <= 7) return 'warning'
  return 'neutral'
}

function construirPlan(deudas, totalDeuda, totalPagoMensual, snowball, avalanche) {
  const activas = deudas.filter(deuda => numero(deuda.saldo_actual) > 0)
  const conTasa = activas.filter(deuda => numero(deuda.tasa_interes) > 0)
  const foco = conTasa.length
    ? avalanche.find(deuda => numero(deuda.saldo_actual) > 0)
    : snowball.find(deuda => numero(deuda.saldo_actual) > 0)
  const proximas = activas
    .map(deuda => ({ deuda, estado: estadoVencimiento(deuda) }))
    .filter(({ estado }) => estado)
    .sort((a, b) => a.estado.dias - b.estado.dias)
    .map(({ deuda }) => deuda)
  const tarjetasSobre30 = activas.filter(deuda =>
    deuda.tipo === 'credito'
    && numero(deuda.saldo_original) > 0
    && (numero(deuda.saldo_actual) / numero(deuda.saldo_original)) > 0.3
  )

  return {
    foco,
    metodo: conTasa.length ? 'Avalancha' : 'Bola de nieve',
    proximo: proximas[0] ?? null,
    mesesTotales: totalPagoMensual > 0 ? Math.ceil(totalDeuda / totalPagoMensual) : null,
    tarjetasSobre30,
  }
}

export default function Deudas() {
  const {
    deudas,
    loading,
    error,
    refetch,
    saving,
    pagosEnCurso,
    totalDeuda,
    totalPagoMensual,
    snowball,
    avalanche,
    agregar,
    actualizar,
    abonar,
    abonarCredito,
    eliminar,
  } = useDeudas()
  const toast = useToast()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [expandida, setExpandida] = useState(null)
  const [montoAbono, setMontoAbono] = useState({})
  const [vista, setVista] = useState('cartera')
  const [metodoEstrategia, setMetodoEstrategia] = useState('snowball')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const setF = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const plan = construirPlan(deudas, totalDeuda, totalPagoMensual, snowball, avalanche)
  const listaEstrategia = (metodoEstrategia === 'avalanche' ? avalanche : snowball)
    .filter(deuda => numero(deuda.saldo_actual) > 0)

  const abrirNueva = () => {
    setEditandoId(null)
    setForm(FORM_VACIO)
    setMostrarForm(true)
  }

  const abrirEditar = deuda => {
    setEditandoId(deuda.id)
    setForm({
      nombre: deuda.nombre,
      saldo_actual: deuda.saldo_actual,
      saldo_original: deuda.saldo_original ?? '',
      pago_mensual: deuda.pago_mensual ?? '',
      frecuencia_pago: normalizarFrecuenciaPago(deuda.frecuencia_pago),
      tasa_interes: deuda.tasa_interes ?? '',
      fecha_proximo_pago: deuda.fecha_proximo_pago ?? '',
      notas: deuda.notas ?? '',
    })
    setMostrarForm(true)
  }

  const cerrarForm = () => {
    setMostrarForm(false)
    setEditandoId(null)
    setForm(FORM_VACIO)
  }

  const handleGuardar = async () => {
    if (!form.nombre || !form.saldo_actual) return
    if (form.frecuencia_pago === 'quincenal' && form.fecha_proximo_pago && !esFechaQuincenalValida(form.fecha_proximo_pago)) {
      toast('Para una deuda quincenal, el próximo pago debe caer el día 15 o 30.', 'error')
      return
    }
    let resultado
    if (editandoId) {
      resultado = await actualizar(editandoId, form)
    } else {
      resultado = await agregar({
        ...form,
        saldo_original: form.saldo_original || form.saldo_actual,
        saldo_actual: Number(form.saldo_actual),
        pago_mensual: Number(form.pago_mensual) || null,
        tasa_interes: Number(form.tasa_interes) || null,
      })
    }
    if (resultado?.error) {
      const faltaMigracion = String(resultado.error.message ?? '').includes('frecuencia_pago')
      toast(faltaMigracion
        ? 'Falta habilitar la periodicidad de deudas en Supabase.'
        : 'No se pudo guardar la deuda. Intenta de nuevo.', 'error')
      return
    }
    cerrarForm()
  }

  const handleAbonar = async deudaId => {
    const monto = montoAbono[deudaId]
    if (!monto || Number(monto) <= 0) return
    const deuda = deudas.find(item => item.id === deudaId)
    if (deuda && Number(monto) > Number(deuda.saldo_actual)) {
      toast(`El pago (${formatMXN(monto)}) es mayor al saldo (${formatMXN(deuda.saldo_actual)}). Ajusta el monto.`, 'error')
      return
    }
    const resultado = deuda?.tipo === 'credito'
      ? await abonarCredito(deuda.credito_id, monto)
      : await abonar(deudaId, monto)
    if (resultado?.bloqueado) return
    if (resultado?.error) {
      toast(mensajeErrorPago(resultado.error), 'error')
      return
    }
    if (resultado?.recortado) {
      toast(`Se registró ${formatMXN(resultado.montoAplicado)} (el saldo era menor al pago capturado)`, 'info')
    } else {
      toast('Pago registrado', 'success')
    }
    setMontoAbono(current => ({ ...current, [deudaId]: '' }))
  }

  if (error && !loading && deudas.length === 0) {
    return (
      <Layout titulo="Deudas">
        <ErrorState onRetry={refetch} mensaje={error} />
      </Layout>
    )
  }

  const prioridadTitle = plan.tarjetasSobre30.length > 0
    ? `Baja ${plan.tarjetasSobre30[0].nombre} antes de acelerar otras deudas`
    : plan.foco
      ? `Concentra el siguiente extra en ${plan.foco.nombre}`
      : 'Tu cartera no tiene saldos pendientes'
  const prioridadDescription = plan.tarjetasSobre30.length > 0
    ? `${plan.tarjetasSobre30.length} tarjeta${plan.tarjetasSobre30.length !== 1 ? 's están' : ' está'} por encima del 30% de utilización.`
    : plan.foco
      ? `${plan.metodo} es la ruta sugerida con la información que ya capturaste.`
      : 'Cuando agregues una deuda, aquí aparecerá la siguiente acción recomendada.'

  return (
    <Layout titulo="Deudas">
      <div className="commitment-page">
        <div className="commitment-module-bar">
          <CommitmentNav />
          <button type="button" className="btn-primary flex items-center gap-2" onClick={abrirNueva}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Nueva deuda</span>
          </button>
        </div>

        <CommitmentHero
          eyebrow="Centro de compromisos"
          title="Tu deuda, convertida en un plan."
          description="Un solo lugar para ver saldos, registrar pagos y decidir qué compromiso atacar primero."
          amountLabel="Saldo total pendiente"
          amount={formatMXN(totalDeuda)}
          aside={(
            <PriorityPanel
              icon={plan.tarjetasSobre30.length > 0 ? CreditCard : Target}
              tone={plan.tarjetasSobre30.length > 0 ? 'warning' : plan.foco ? 'primary' : 'positive'}
              title={prioridadTitle}
              description={prioridadDescription}
              action={plan.foco && (
                <TextAction onClick={() => { setVista('cartera'); setExpandida(plan.foco.id) }}>
                  Ver compromiso
                </TextAction>
              )}
            />
          )}
        >
          <HeroMetric icon={CircleDollarSign} label="Compromiso mensual" value={formatMXN(totalPagoMensual)} />
          <HeroMetric icon={Wallet} label="Cuentas activas" value={`${deudas.length}`} />
          <HeroMetric icon={TimerReset} label="Ritmo estimado" value={formatearMeses(plan.mesesTotales)} />
        </CommitmentHero>

        <SectionHeader
          eyebrow={vista === 'cartera' ? 'Cartera operativa' : 'Orden de ataque'}
          title={vista === 'cartera' ? 'Compromisos activos' : 'Estrategia de liquidación'}
          description={vista === 'cartera'
            ? 'Compara saldos, registra pagos y consulta el historial sin perder contexto.'
            : 'Cambia de método para ver cómo se reordena tu siguiente movimiento.'}
          action={(
            <SegmentedControl
              value={vista}
              ariaLabel="Vista de deudas"
              onChange={setVista}
              options={[
                { value: 'cartera', label: 'Cartera', icon: Wallet },
                { value: 'estrategia', label: 'Estrategia', icon: ListOrdered },
              ]}
            />
          )}
        />

        {vista === 'cartera' ? (
          loading ? (
            <div className="commitment-list">
              {[0, 1, 2].map(item => <div key={item} className="h-28 animate-pulse" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--divider)' }} />)}
            </div>
          ) : deudas.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No tienes deudas registradas"
              description="Cuando captures una deuda, la app armará el orden de ataque y dará seguimiento a cada pago."
              action={(
                <button type="button" onClick={abrirNueva} className="btn-primary text-sm">
                  <Plus className="w-4 h-4" /> Nueva deuda
                </button>
              )}
            />
          ) : (
            <div className="commitment-list">
              {deudas.map(deuda => {
                const esTarjeta = deuda.tipo === 'credito'
                const saldoOriginal = numero(deuda.saldo_original)
                const saldoActual = numero(deuda.saldo_actual)
                const pctLiquidado = saldoOriginal > 0 ? ((saldoOriginal - saldoActual) / saldoOriginal) * 100 : 0
                const pctUso = saldoOriginal > 0 ? (saldoActual / saldoOriginal) * 100 : 0
                const expandido = expandida === deuda.id
                const mesesDeuda = mesesParaLiquidar(deuda)
                const frecuenciaPago = normalizarFrecuenciaPago(deuda.frecuencia_pago)
                const esFoco = plan.foco?.id === deuda.id
                const estadoPago = estadoVencimiento(deuda)
                const tonoPago = tonoVencimiento(estadoPago)
                const pagoEnCurso = pagosEnCurso.has(String(deuda.id))
                const historial = [...(deuda.abonos_deuda ?? [])].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))

                return (
                  <article key={deuda.id} className="commitment-debt-row">
                    <div className="commitment-debt-main">
                      <div className="commitment-debt-identity">
                        <div className="commitment-debt-title">
                          <h3>{deuda.nombre}</h3>
                          {esTarjeta && <StatusPill tone="primary" icon={CreditCard}>Tarjeta</StatusPill>}
                          {!esTarjeta && frecuenciaPago === 'quincenal' && (
                            <StatusPill tone="primary" icon={CalendarClock}>15 y 30</StatusPill>
                          )}
                          {esFoco && <StatusPill tone="positive" icon={Target}>Foco extra</StatusPill>}
                          {estadoPago?.ciclosPagados > 0 && estadoPago.dias >= 0 && (
                            <StatusPill tone="positive" icon={CheckCircle2}>Ciclo cubierto</StatusPill>
                          )}
                        </div>
                        <div className="commitment-debt-meta">
                          {deuda.pago_mensual > 0 && (
                            <span><CircleDollarSign />{formatMXN(deuda.pago_mensual)}/{frecuenciaPago === 'quincenal' ? 'quincena' : 'mes'}</span>
                          )}
                          {deuda.tasa_interes > 0 && <span><TrendingDown />{deuda.tasa_interes}% de interés</span>}
                          {estadoPago && (
                            <StatusPill tone={tonoPago} icon={CalendarClock}>{textoVencimiento(deuda, estadoPago)}</StatusPill>
                          )}
                          {mesesDeuda && <span><TimerReset />Aprox. {formatearMeses(mesesDeuda)}</span>}
                        </div>
                      </div>

                      <div className="commitment-debt-balance">
                        <div>
                          <span>{esTarjeta ? 'Saldo utilizado' : 'Saldo pendiente'}</span>
                          <strong>{formatMXN(saldoActual)}</strong>
                        </div>
                        <ProgressRail
                          value={esTarjeta ? pctUso : pctLiquidado}
                          marker={esTarjeta ? 30 : null}
                          tone={esTarjeta ? (pctUso > 80 ? 'negative' : pctUso > 30 ? 'warning' : 'positive') : 'positive'}
                          label={esTarjeta ? 'Utilización' : 'Avance liquidado'}
                          endLabel={`${Math.max(0, esTarjeta ? pctUso : pctLiquidado).toFixed(0)}%`}
                        />
                      </div>

                      <div className="commitment-debt-actions">
                        <input
                          type="number"
                          min="0"
                          className="input"
                          aria-label={`Monto de pago para ${deuda.nombre}`}
                          placeholder="Monto del pago"
                          value={montoAbono[deuda.id] ?? ''}
                          onChange={event => setMontoAbono(current => ({ ...current, [deuda.id]: event.target.value }))}
                          disabled={pagoEnCurso}
                        />
                        <button
                          type="button"
                          className="commitment-pay-button"
                          onClick={() => handleAbonar(deuda.id)}
                          disabled={pagoEnCurso || !montoAbono[deuda.id] || Number(montoAbono[deuda.id]) <= 0}
                          aria-busy={pagoEnCurso}
                        >
                          {pagoEnCurso ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ArrowDownToLine aria-hidden="true" />}
                          {pagoEnCurso ? 'Guardando' : 'Pagar'}
                        </button>
                        <div className="commitment-row-tools">
                          <button
                            type="button"
                            className="commitment-history-button"
                            onClick={() => setExpandida(expandido ? null : deuda.id)}
                            aria-expanded={expandido}
                          >
                            {expandido ? <ChevronUp /> : <ChevronDown />}
                            {historial.length ? `${historial.length} pago${historial.length !== 1 ? 's' : ''}` : 'Detalles'}
                          </button>
                          {esTarjeta ? (
                            <Link to="/creditos" className="icon-button icon-button-sm" title="Administrar en Créditos" aria-label="Administrar en Créditos">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <>
                              <button type="button" className="icon-button icon-button-sm" onClick={() => abrirEditar(deuda)} title="Editar deuda" aria-label={`Editar ${deuda.nombre}`}>
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" className="icon-button icon-button-sm" onClick={() => setConfirmDelete(deuda.id)} title="Eliminar deuda" aria-label={`Eliminar ${deuda.nombre}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {expandido && (
                      <div className="commitment-debt-detail">
                        <div className="commitment-detail-block">
                          <span>Contexto</span>
                          <p>{deuda.notas || (esTarjeta ? 'Esta tarjeta se administra desde Créditos y sus pagos se registran aquí.' : 'Sin notas para esta deuda.')}</p>
                        </div>
                        <div className="commitment-detail-block">
                          <span>Historial de pagos</span>
                          {historial.length > 0 ? (
                            <div className="commitment-history-list">
                              {historial.map(pago => (
                                <div key={pago.id} className="commitment-history-item">
                                  <span>{pago.fecha}{pago.notas ? ` · ${pago.notas}` : ''}</span>
                                  <strong>-{formatMXN(pago.monto)}</strong>
                                </div>
                              ))}
                            </div>
                          ) : <p>Aún no hay pagos registrados.</p>}
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )
        ) : (
          <>
            <SegmentedControl
              value={metodoEstrategia}
              ariaLabel="Método de liquidación"
              onChange={setMetodoEstrategia}
              options={[
                { value: 'snowball', label: 'Bola de nieve', icon: CircleDollarSign },
                { value: 'avalanche', label: 'Avalancha', icon: TrendingDown },
              ]}
            />
            <div className="commitment-strategy-layout">
              <div className="commitment-strategy-list">
                {listaEstrategia.length > 0 ? listaEstrategia.map((deuda, index) => (
                  <div key={deuda.id} className="commitment-strategy-item">
                    <span className="commitment-strategy-rank">{index + 1}</span>
                    <div className="commitment-strategy-copy">
                      <strong>{deuda.nombre}</strong>
                      <span>{deuda.tipo === 'credito' ? 'Tarjeta de crédito' : deuda.tasa_interes > 0 ? `${deuda.tasa_interes}% de interés` : 'Deuda manual'}</span>
                    </div>
                    <span className="commitment-strategy-amount">{formatMXN(deuda.saldo_actual)}</span>
                  </div>
                )) : (
                  <div className="p-6 text-sm" style={{ color: 'var(--fg-3)' }}>No hay saldos que ordenar.</div>
                )}
              </div>
              <aside className="commitment-strategy-note">
                <div className="commitment-strategy-note-icon">
                  {metodoEstrategia === 'snowball' ? <CircleDollarSign /> : <TrendingDown />}
                </div>
                <span>Cómo usar este orden</span>
                <strong>{metodoEstrategia === 'snowball' ? 'Gana impulso cerrando cuentas.' : 'Reduce primero el costo financiero.'}</strong>
                <p>{metodoEstrategia === 'snowball'
                  ? 'Cubre los mínimos de todas y dirige el dinero extra a la primera deuda. Cuando termine, mueve ese pago a la siguiente.'
                  : 'Cubre los mínimos de todas y concentra el extra en la tasa más alta. Funciona mejor cuando todas las tasas están capturadas.'}</p>
              </aside>
            </div>
          </>
        )}
      </div>

      <Sheet
        open={mostrarForm}
        onClose={cerrarForm}
        title={editandoId ? 'Editar deuda' : 'Nueva deuda'}
        description="Captura lo esencial para que el plan pueda ordenar pagos y estimar el avance."
        footer={(
          <>
            <button type="button" className="btn-ghost" onClick={cerrarForm}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={handleGuardar} disabled={saving || !form.nombre || !form.saldo_actual}>
              {saving ? 'Guardando...' : editandoId ? 'Actualizar' : 'Guardar deuda'}
            </button>
          </>
        )}
      >
        <div className="commitment-form-grid">
          <div className="commitment-form-field is-wide">
            <label className="label">Nombre</label>
            <input className="input" placeholder="Ej: Préstamo personal" value={form.nombre} onChange={event => setF('nombre', event.target.value)} />
          </div>
          <div className="commitment-form-field">
            <label className="label">Saldo actual</label>
            <input type="number" min="0" className="input" placeholder="$0.00" value={form.saldo_actual} onChange={event => setF('saldo_actual', event.target.value)} />
          </div>
          <div className="commitment-form-field">
            <label className="label">Saldo original</label>
            <input type="number" min="0" className="input" placeholder="$0.00" value={form.saldo_original} onChange={event => setF('saldo_original', event.target.value)} />
          </div>
          <div className="commitment-form-field">
            <label className="label">{form.frecuencia_pago === 'quincenal' ? 'Pago por quincena' : 'Pago mensual'}</label>
            <input type="number" min="0" className="input" placeholder="$0.00" value={form.pago_mensual} onChange={event => setF('pago_mensual', event.target.value)} />
          </div>
          <div className="commitment-form-field">
            <label className="label">Tasa de interés</label>
            <input type="number" min="0" step="0.01" className="input" placeholder="0%" value={form.tasa_interes} onChange={event => setF('tasa_interes', event.target.value)} />
          </div>
          <div className="commitment-form-field is-wide">
            <label className="label">Frecuencia de pago</label>
            <SegmentedControl
              value={form.frecuencia_pago}
              ariaLabel="Frecuencia de pago de la deuda"
              onChange={value => setF('frecuencia_pago', value)}
              options={[
                { value: 'mensual', label: 'Mensual' },
                { value: 'quincenal', label: 'Quincenal · 15 y 30' },
              ]}
            />
          </div>
          <div className="commitment-form-field is-wide">
            <label className="label">{form.frecuencia_pago === 'quincenal' ? 'Próximo pago (15 o 30)' : 'Próximo pago'}</label>
            <DatePicker value={form.fecha_proximo_pago} onChange={value => setF('fecha_proximo_pago', value)} />
          </div>
          <div className="commitment-form-field is-wide">
            <label className="label">Notas</label>
            <textarea className="input min-h-[96px] resize-none" placeholder="Acuerdos, condiciones o contexto útil" value={form.notas} onChange={event => setF('notas', event.target.value)} />
          </div>
        </div>
      </Sheet>

      <ConfirmModal
        open={!!confirmDelete}
        titulo="¿Eliminar deuda?"
        descripcion="Se eliminará la deuda manual y su historial asociado."
        onConfirm={() => { eliminar(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
