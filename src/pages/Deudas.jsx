import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { useDeudas } from '../hooks/useDeudas'
import { formatMXN } from '../utils/constantes'
import { resolverVencimientoMensual } from '../utils/pagosProgramados'
import { Plus, ChevronDown, ChevronUp, Trash2, CreditCard, ExternalLink, Pencil, Target, CalendarClock, TimerReset } from 'lucide-react'
import ConfirmModal from '../components/ui/ConfirmModal'
import DatePicker   from '../components/ui/DatePicker'
import ErrorState   from '../components/ui/ErrorState'
import EmptyState   from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'

const FORM_VACIO = { nombre:'', saldo_original:'', saldo_actual:'', pago_mensual:'', tasa_interes:'', fecha_proximo_pago:'', notas:'' }

const numero = (v) => Number(v ?? 0)

const formatearMeses = (meses) => {
  if (!meses) return 'Sin estimación'
  if (meses < 12) return `${meses} mes${meses !== 1 ? 'es' : ''}`
  const anios = Math.floor(meses / 12)
  const resto = meses % 12
  return `${anios} año${anios !== 1 ? 's' : ''}${resto ? ` ${resto}m` : ''}`
}

const mesesParaLiquidar = (deuda) => {
  const pago = numero(deuda.pago_mensual)
  const saldo = numero(deuda.saldo_actual)
  return pago > 0 && saldo > 0 ? Math.ceil(saldo / pago) : null
}

const estadoVencimiento = (deuda, hoy = new Date()) => {
  if (deuda.tipo === 'credito') {
    return resolverVencimientoMensual({
      diaPago: deuda.fecha_pago_dia,
      pagos: deuda.abonos_deuda,
      hoy,
      ventanaInicio: 'mes',
    })
  }

  return resolverVencimientoMensual({
    fechaBaseISO: deuda.fecha_proximo_pago,
    pagos: deuda.abonos_deuda,
    montoObjetivo: deuda.pago_mensual,
    saldoActual: deuda.saldo_actual,
    hoy,
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

function construirPlan(deudas, totalDeuda, totalPagoMensual, snowball, avalanche) {
  const activas = deudas.filter(d => numero(d.saldo_actual) > 0)
  const conTasa = activas.filter(d => numero(d.tasa_interes) > 0)
  const foco = conTasa.length
    ? avalanche.find(d => numero(d.saldo_actual) > 0)
    : snowball.find(d => numero(d.saldo_actual) > 0)
  const proximas = activas
    .map(d => ({ deuda: d, estado: estadoVencimiento(d) }))
    .filter(({ estado }) => estado)
    .sort((a, b) => a.estado.dias - b.estado.dias)
    .map(({ deuda }) => deuda)
  const tarjetasSobre30 = activas.filter(d =>
    d.tipo === 'credito' &&
    numero(d.saldo_original) > 0 &&
    (numero(d.saldo_actual) / numero(d.saldo_original)) > 0.3
  )

  return {
    foco,
    metodo: conTasa.length ? 'Avalanche' : 'Snowball',
    proximo: proximas[0] ?? null,
    mesesTotales: totalPagoMensual > 0 ? Math.ceil(totalDeuda / totalPagoMensual) : null,
    tarjetasSobre30,
  }
}

export default function Deudas() {
  const { deudas, loading, error, refetch, saving, totalDeuda, totalPagoMensual, snowball, avalanche, agregar, actualizar, abonar, abonarCredito, eliminar } = useDeudas()
  const toast = useToast()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [expandida, setExpandida] = useState(null)
  const [montoAbono, setMontoAbono] = useState({})
  const [tab, setTab] = useState('deudas')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const plan = construirPlan(deudas, totalDeuda, totalPagoMensual, snowball, avalanche)

  const abrirEditar = (d) => {
    setEditandoId(d.id)
    setForm({
      nombre:             d.nombre,
      saldo_actual:       d.saldo_actual,
      saldo_original:     d.saldo_original ?? '',
      pago_mensual:       d.pago_mensual   ?? '',
      tasa_interes:       d.tasa_interes   ?? '',
      fecha_proximo_pago: d.fecha_proximo_pago ?? '',
      notas:              d.notas          ?? '',
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
    if (editandoId) {
      await actualizar(editandoId, form)
    } else {
      await agregar({
        ...form,
        saldo_original: form.saldo_original || form.saldo_actual,
        saldo_actual:   Number(form.saldo_actual),
        pago_mensual:   Number(form.pago_mensual)  || null,
        tasa_interes:   Number(form.tasa_interes)  || null,
      })
    }
    cerrarForm()
  }

  const handleAbonar = async (deudaId) => {
    const monto = montoAbono[deudaId]
    if (!monto || Number(monto) <= 0) return
    const deuda = deudas.find(d => d.id === deudaId)
    if (deuda && Number(monto) > Number(deuda.saldo_actual)) {
      toast(`El pago (${formatMXN(monto)}) es mayor al saldo (${formatMXN(deuda.saldo_actual)}). Ajusta el monto.`, 'error')
      return
    }
    // Si es tarjeta de crédito, actualiza saldo_utilizado en creditos
    const res = deuda?.tipo === 'credito'
      ? await abonarCredito(deuda.credito_id, monto)
      : await abonar(deudaId, monto)
    // Defensa de respaldo: si el hook recortó el pago, avisar
    if (res?.recortado) {
      toast(`Se registró ${formatMXN(res.montoAplicado)} (el saldo era menor al pago capturado)`, 'info')
    } else {
      toast('Pago registrado ✓', 'success')
    }
    setMontoAbono(m => ({ ...m, [deudaId]: '' }))
  }

  if (error && !loading && deudas.length === 0) {
    return (
      <Layout titulo="Deudas">
        <ErrorState onRetry={refetch} mensaje={error} />
      </Layout>
    )
  }

  return (
    <Layout titulo="Deudas">
      <div className="space-y-4">

        {/* Tarjetas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          <div className="card p-4" style={{ background: 'var(--negative-bg)', borderColor: 'var(--negative-bg)' }}>
            <p className="text-[11px] font-bold uppercase tracking-normal mb-2" style={{ color: 'var(--negative-fg)', letterSpacing: 0 }}>Total Deuda</p>
            <p className="text-2xl font-bold tabular" style={{ color: 'var(--negative-fg)', fontVariantNumeric: 'tabular-nums' }}>{formatMXN(totalDeuda)}</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-bold uppercase tracking-normal mb-2" style={{ color: 'var(--fg-3)', letterSpacing: 0 }}>Pago Mensual</p>
            <p className="text-2xl font-bold tabular" style={{ color: 'var(--primary-700)', fontVariantNumeric: 'tabular-nums' }}>{formatMXN(totalPagoMensual)}</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-bold uppercase tracking-normal mb-2" style={{ color: 'var(--fg-3)', letterSpacing: 0 }}>Número de Deudas</p>
            <p className="text-2xl font-bold tabular" style={{ color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums' }}>{deudas.length}</p>
          </div>
        </div>

        {!loading && deudas.length > 0 && (
          <div className="card p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-normal mb-1" style={{ color: 'var(--fg-3)', letterSpacing: 0 }}>
                  Plan de ataque
                </p>
                <h2 className="font-bold text-lg" style={{ color: 'var(--fg-1)' }}>
                  {plan.foco ? `Enfoca pagos extra en ${plan.foco.nombre}` : 'Sin deuda prioritaria'}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--fg-3)' }}>
                  Método sugerido: {plan.metodo}. Si hay tasa capturada, priorizo mayor interés; si no, la deuda más chica para ganar avance.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto lg:min-w-[560px]">
                <div className="rounded-[var(--r-lg)] p-3" style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-100)' }}>
                  <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--primary-700)' }}>
                    <Target className="w-4 h-4" />
                    <span className="text-xs font-bold">Foco</span>
                  </div>
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--fg-1)' }}>{plan.foco?.nombre ?? 'Listo'}</p>
                  <p className="text-xs tabular" style={{ color: 'var(--fg-3)' }}>{plan.foco ? formatMXN(plan.foco.saldo_actual) : 'Sin saldo'}</p>
                </div>
                <div className="rounded-[var(--r-lg)] p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--warning-fg)' }}>
                    <CalendarClock className="w-4 h-4" />
                    <span className="text-xs font-bold">Próximo</span>
                  </div>
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--fg-1)' }}>{plan.proximo?.nombre ?? 'Sin fecha'}</p>
                  <p className="text-xs" style={{ color: 'var(--fg-3)' }}>{plan.proximo ? textoVencimiento(plan.proximo) : 'Agrega fechas de pago'}</p>
                </div>
                <div className="rounded-[var(--r-lg)] p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--fg-2)' }}>
                    <TimerReset className="w-4 h-4" />
                    <span className="text-xs font-bold">Ritmo actual</span>
                  </div>
                  <p className="text-sm font-bold" style={{ color: 'var(--fg-1)' }}>{formatearMeses(plan.mesesTotales)}</p>
                  <p className="text-xs" style={{ color: 'var(--fg-3)' }}>{totalPagoMensual > 0 ? `${formatMXN(totalPagoMensual)}/mes` : 'Captura pagos mensuales'}</p>
                </div>
              </div>
            </div>

            {plan.tarjetasSobre30.length > 0 && (
              <div className="mt-4 rounded-[var(--r-lg)] px-4 py-3" style={{ background: 'var(--warning-bg)', color: 'var(--warning-fg)' }}>
                <p className="text-sm font-semibold">
                  {plan.tarjetasSobre30.length} tarjeta{plan.tarjetasSobre30.length !== 1 ? 's' : ''} arriba del 30%. Conviene bajar utilización antes de acelerar deudas manuales.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {[['deudas','Mis Deudas'],['calculadora','Calculadora']].map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all
                  ${tab === k ? 'bg-primary-700 text-fg-on-primary' : 'bg-surface border border-gray-200 text-gray-600'}`}>
                {l}
              </button>
            ))}
          </div>
          {tab === 'deudas' && (
            <button onClick={() => { cerrarForm(); setMostrarForm(v => !v) }} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Agregar Deuda
            </button>
          )}
        </div>

        {tab === 'deudas' && (
          <>
            {mostrarForm && (
              <div className="card p-5 border-2" style={{ borderColor: 'var(--negative-bg)' }}>
                <h3 className="font-bold text-gray-900 mb-3">{editandoId ? 'Editar Deuda' : 'Nueva Deuda'}</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className="label">Nombre</label>
                    <input className="input" placeholder="Ej: Mercado Pago, DIDI..."
                      value={form.nombre} onChange={e => setF('nombre', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Saldo Actual ($)</label>
                    <input type="number" className="input font-mono"
                      value={form.saldo_actual} onChange={e => setF('saldo_actual', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Saldo Original ($)</label>
                    <input type="number" className="input font-mono"
                      value={form.saldo_original} onChange={e => setF('saldo_original', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Pago Mensual ($)</label>
                    <input type="number" className="input font-mono"
                      value={form.pago_mensual} onChange={e => setF('pago_mensual', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Tasa Interés (%)</label>
                    <input type="number" className="input font-mono" placeholder="0"
                      value={form.tasa_interes} onChange={e => setF('tasa_interes', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Próximo Pago</label>
                    <DatePicker
                      value={form.fecha_proximo_pago}
                      onChange={v => setF('fecha_proximo_pago', v)}
                    />
                  </div>
                  <div>
                    <label className="label">Notas</label>
                    <input className="input text-sm"
                      value={form.notas} onChange={e => setF('notas', e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary px-6" onClick={handleGuardar} disabled={saving}>
                    {saving ? 'Guardando...' : editandoId ? 'Actualizar' : 'Guardar'}
                  </button>
                  <button className="btn-ghost" onClick={cerrarForm}>Cancelar</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {loading
                ? Array(3).fill(0).map((_,i) => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)
                : deudas.length === 0
                  ? (
                    <EmptyState
                      icon={Target}
                      title="No tienes deudas registradas"
                      description="Cuando captures una deuda, la app arma un plan de ataque y seguimiento de pagos."
                      action={
                        <button onClick={() => { cerrarForm(); setMostrarForm(true) }} className="btn-primary text-sm">
                          <Plus className="w-4 h-4" /> Agregar Deuda
                        </button>
                      }
                    />
                  )
                  : deudas.map(d => {
                    const esTarjeta = d.tipo === 'credito'
                    const pct = d.saldo_original > 0
                      ? ((Number(d.saldo_original) - Number(d.saldo_actual)) / Number(d.saldo_original)) * 100 : 0
                    const expandido = expandida === d.id
                    const mesesDeuda = mesesParaLiquidar(d)
                    const esFoco = plan.foco?.id === d.id
                    const esProximo = plan.proximo?.id === d.id
                    const estadoPago = estadoVencimiento(d)
                    const vencimiento = textoVencimiento(d, estadoPago)
                    return (
                      <div key={d.id}
                        className="card overflow-hidden"
                        style={esTarjeta ? { borderLeft: '3px solid var(--primary-200)' } : {}}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-gray-900">{d.nombre}</p>
                                {/* Chip que indica que viene de Créditos */}
                                {esTarjeta && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    Tarjeta
                                  </span>
                                )}
                                {esFoco && (
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: 'var(--ahorro-bg)', color: 'var(--ahorro-fg)' }}>
                                    Foco extra
                                  </span>
                                )}
                                {esProximo && (
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: 'var(--warning-bg)', color: 'var(--warning-fg)' }}>
                                    Próxima
                                  </span>
                                )}
                                {estadoPago?.ciclosPagados > 0 && estadoPago.dias >= 0 && (
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: 'var(--ahorro-bg)', color: 'var(--ahorro-fg)' }}>
                                    Pago registrado
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                                {d.pago_mensual > 0 && <span>Pago: {formatMXN(d.pago_mensual)}/mes</span>}
                                {d.tasa_interes > 0 && <span>Tasa: {d.tasa_interes}%</span>}
                                {vencimiento && <span>{vencimiento}</span>}
                                {mesesDeuda && <span>≈ {formatearMeses(mesesDeuda)}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                <p className="font-bold font-mono text-lg" style={{ color: 'var(--negative-fg)' }}>{formatMXN(d.saldo_actual)}</p>
                                {d.saldo_original > 0 && <p className="text-xs text-gray-400">de {formatMXN(d.saldo_original)}</p>}
                              </div>
                              {/* Tarjeta: link a Créditos | Deuda manual: botón eliminar */}
                              {esTarjeta ? (
                                <Link
                                  to="/creditos"
                                  className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                                  title="Administrar en Créditos"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              ) : (
                                <div className="flex gap-1">
                                  <button onClick={() => abrirEditar(d)}
                                    className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-700 flex items-center justify-center text-gray-300">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setConfirmDelete(d.id)}
                                    className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-300">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {d.saldo_original > 0 && (
                            <div className="mb-3">
                              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--negative-bg)' }}>
                                <div className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(esTarjeta ? (d.saldo_actual / d.saldo_original) * 100 : pct, 100)}%`,
                                    background: esTarjeta ? 'var(--negative)' : 'var(--ahorro)',
                                  }}
                                />
                              </div>
                              <p className="text-xs mt-1" style={{ color: 'var(--fg-4)' }}>
                                {esTarjeta
                                  ? `${((d.saldo_actual / d.saldo_original) * 100).toFixed(0)}% del límite utilizado`
                                  : `${pct.toFixed(0)}% pagado`
                                }
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              className="input text-sm py-1.5 font-mono w-full sm:w-36"
                              placeholder={esTarjeta ? 'Monto pago' : 'Monto abono'}
                              value={montoAbono[d.id] ?? ''}
                              onChange={e => setMontoAbono(m => ({ ...m, [d.id]: e.target.value }))}
                            />
                            <button onClick={() => handleAbonar(d.id)} className="btn-secondary text-sm py-1.5 px-3">
                              {esTarjeta ? 'Pagar' : 'Abonar'}
                            </button>
                            <button onClick={() => setExpandida(expandido ? null : d.id)}
                              className="btn-ghost text-sm flex items-center gap-1 ml-auto">
                              Historial {expandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {expandido && d.notas && (
                          <div className="border-t border-gray-50 px-4 py-2.5">
                            <p className="text-xs" style={{ color: 'var(--fg-3)' }}>
                              📝 <span className="font-semibold">Notas:</span> {d.notas}
                            </p>
                          </div>
                        )}
                        {expandido && d.abonos_deuda?.length > 0 && (
                          <div className="border-t border-gray-50 bg-gray-50 px-4 py-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                              {esTarjeta ? 'Historial de Pagos' : 'Historial de Abonos'}
                            </p>
                            <div className="space-y-1.5">
                              {[...d.abonos_deuda].sort((a,b) => b.fecha.localeCompare(a.fecha)).map(a => (
                                <div key={a.id} className="flex justify-between text-sm">
                                  <span className="text-gray-500 font-mono">{a.fecha}</span>
                                  <span className="font-semibold" style={{ color: 'var(--ahorro-fg)' }}>-{formatMXN(a.monto)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {expandido && d.abonos_deuda?.length === 0 && (
                          <div className="border-t border-gray-50 bg-gray-50 px-4 py-3 text-sm text-gray-300 text-center">
                            {esTarjeta ? 'Sin pagos registrados' : 'Sin abonos registrados'}
                          </div>
                        )}
                      </div>
                    )
                  })}
            </div>
          </>
        )}

        {tab === 'calculadora' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: '❄️ Método Snowball', subtitle: 'Paga primero la deuda más pequeña (motivación)', lista: snowball, headerStyle: { background: 'var(--primary-50)' } },
              { title: '🏔️ Método Avalanche', subtitle: 'Paga primero la deuda con mayor tasa (ahorra más)', lista: avalanche, headerStyle: { background: 'var(--warning-bg)' } },
            ].map(({ title, subtitle, lista, headerStyle }) => (
              <div key={title} className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100" style={headerStyle}>
                  <h3 className="font-bold text-gray-900">{title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
                </div>
                {lista.length === 0
                  ? (
                    <EmptyState
                      icon={Target}
                      title="Sin deudas para ordenar"
                      description="Agrega una deuda para comparar Snowball y Avalanche."
                      className="min-h-[180px] border-0 bg-transparent"
                    />
                  )
                  : <div className="divide-y divide-gray-50">
                    {lista.map((d, i) => (
                      <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                        <span className="w-6 h-6 rounded-full bg-primary-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-sm text-gray-800">{d.nombre}</p>
                            {d.tipo === 'credito' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}>
                                💳
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {formatMXN(d.saldo_actual)}{d.tasa_interes ? ` · ${d.tasa_interes}% anual` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>}
              </div>
            ))}
          </div>
        )}

      </div>
      <ConfirmModal
        open={!!confirmDelete}
        titulo="¿Eliminar deuda?"
        descripcion="Esta acción no se puede deshacer."
        onConfirm={() => { eliminar(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
