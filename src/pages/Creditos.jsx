import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Gauge,
  Link2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  WalletCards,
} from 'lucide-react'
import Layout from '../components/layout/Layout'
import ConfirmModal from '../components/ui/ConfirmModal'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import {
  CommitmentHero,
  CommitmentNav,
  HeroMetric,
  PriorityPanel,
  ProgressRail,
  SectionHeader,
  Sheet,
  StatusPill,
} from '../components/commitments/CommitmentUI'
import { useCreditos } from '../hooks/useCreditos'
import { calcularEstadoTarjeta, diasHastaDiaDelMes } from '../utils/calculos'
import { formatMXN } from '../utils/constantes'
import { resolverVencimientoMensual } from '../utils/pagosProgramados'

const FORM_VACIO = {
  nombre: '',
  fecha_corte: '',
  fecha_pago: '',
  limite_credito: '',
  saldo_utilizado: '',
  metodo_vinculado_id: '',
}

function calcularFechasOptimas(fechaCorte) {
  const corte = Number(fechaCorte)
  if (!Number.isFinite(corte) || corte < 1 || corte > 31) {
    return { inicioOptimo: null, finOptimo: null, inicioEvitar: null, finEvitar: null }
  }
  const margen = 5
  const diasMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  return {
    inicioOptimo: corte >= diasMes ? 1 : corte + 1,
    finOptimo: corte - margen > 0 ? corte - margen : diasMes + corte - margen,
    inicioEvitar: corte - margen + 1 > 0 ? corte - margen + 1 : diasMes + corte - margen + 1,
    finEvitar: corte,
  }
}

function estaEnRango(hoy, inicio, fin) {
  if (inicio == null || fin == null) return false
  return inicio <= fin ? hoy >= inicio && hoy <= fin : hoy >= inicio || hoy <= fin
}

function getAlerta(credito) {
  const hoyFecha = new Date()
  const hoy = hoyFecha.getDate()
  const diasParaCorte = diasHastaDiaDelMes(credito.fecha_corte) ?? 99
  const pagoProgramado = resolverVencimientoMensual({
    diaPago: credito.fecha_pago,
    pagos: credito.pagos_credito,
    hoy: hoyFecha,
    ventanaInicio: 'mes',
  })
  const diasParaPago = pagoProgramado?.dias ?? 99
  const fechas = calcularFechasOptimas(credito.fecha_corte)
  return {
    diasParaCorte,
    diasParaPago,
    pagoProgramado,
    enRangoOptimo: estaEnRango(hoy, fechas.inicioOptimo, fechas.finOptimo),
    enRangoEvitar: estaEnRango(hoy, fechas.inicioEvitar, fechas.finEvitar),
    ...fechas,
  }
}

const textoDiasPago = dias => {
  if (dias == null || dias >= 90) return 'Captura fecha de pago'
  if (dias < 0) return `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`
  if (dias === 0) return 'Vence hoy'
  return `Vence en ${dias} día${dias !== 1 ? 's' : ''}`
}

const textoDiasCorte = dias => {
  if (dias == null || dias >= 90) return 'Sin fecha de corte'
  if (dias === 0) return 'Corta hoy'
  return `Corta en ${dias} día${dias !== 1 ? 's' : ''}`
}

const fmtFechaCorta = fecha => fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

const fmtRango = (inicio, fin) => {
  if (inicio == null || fin == null) return 'Captura el día de corte'
  return inicio <= fin ? `Días ${inicio} al ${fin}` : `Días ${inicio} al ${fin} del mes siguiente`
}

function TarjetaCredito({ credito, metodos, ciclo, onEditar, onEliminar }) {
  const alerta = getAlerta(credito)
  const limite = Number(credito.limite_credito ?? 0)
  const saldo = Number(credito.saldo_utilizado ?? 0)
  const disponible = Math.max(0, limite - saldo)
  const pctUso = limite > 0 ? (saldo / limite) * 100 : 0
  const pagoPara30 = limite > 0 ? Math.max(0, saldo - (limite * 0.3)) : 0
  const pagoRegistrado = alerta.pagoProgramado?.ciclosPagados > 0
  const pagoUrgente = !pagoRegistrado && alerta.diasParaPago <= 3
  const pagoProximo = !pagoRegistrado && alerta.diasParaPago <= 7
  const corteProximo = alerta.diasParaCorte <= 7
  const metodoVinculado = metodos.find(metodo => metodo.credito_id === credito.id)
  const riesgoAlto = pctUso > 80 || pagoUrgente
  const requiereAtencion = !riesgoAlto && (pctUso > 30 || pagoProximo || corteProximo)
  const tonoUso = pctUso > 80 ? 'negative' : pctUso > 30 ? 'warning' : 'positive'

  return (
    <article className={`credit-instrument ${riesgoAlto ? 'is-urgent' : requiereAtencion ? 'is-warning' : ''}`}>
      <div className="credit-instrument-top">
        <div className="credit-instrument-header">
          <div className="credit-instrument-brand">
            <span>Línea de crédito</span>
            <h3>{credito.nombre}</h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {metodoVinculado && <StatusPill tone="primary" icon={Link2}>{metodoVinculado.nombre}</StatusPill>}
              {pagoRegistrado && <StatusPill tone="positive" icon={CheckCircle2}>Ciclo cubierto</StatusPill>}
              {!pagoRegistrado && pagoUrgente && <StatusPill tone="negative" icon={Bell}>{textoDiasPago(alerta.diasParaPago)}</StatusPill>}
              {alerta.enRangoOptimo && <StatusPill tone="positive" icon={ShieldCheck}>Buen momento de uso</StatusPill>}
              {alerta.enRangoEvitar && <StatusPill tone="warning" icon={AlertTriangle}>Evita usarla hoy</StatusPill>}
            </div>
          </div>
          <div className="credit-instrument-tools">
            <button type="button" className="icon-button icon-button-sm" onClick={() => onEditar(credito)} title="Editar tarjeta" aria-label={`Editar ${credito.nombre}`}>
              <Pencil />
            </button>
            <button type="button" className="icon-button icon-button-sm" onClick={() => onEliminar(credito.id)} title="Eliminar tarjeta" aria-label={`Eliminar ${credito.nombre}`}>
              <Trash2 />
            </button>
          </div>
        </div>

        <div className="credit-instrument-balance">
          <div>
            <span>Saldo utilizado</span>
            <strong>{formatMXN(saldo)}</strong>
          </div>
          <span className={`credit-instrument-pct tone-${tonoUso}`}>{pctUso.toFixed(0)}%</span>
        </div>

        <ProgressRail
          value={pctUso}
          marker={30}
          tone={tonoUso}
          label={`${formatMXN(disponible)} disponibles`}
          endLabel={`${formatMXN(limite)} de línea`}
        />

        {pagoPara30 > 0 && (
          <p className="mt-3 text-[10px] font-bold" style={{ color: 'var(--warning-fg)' }}>
            Paga {formatMXN(pagoPara30)} para llevar esta tarjeta al 30%.
          </p>
        )}
      </div>

      <div className="credit-instrument-meta">
        <div className="credit-date-cell">
          <CalendarClock aria-hidden="true" />
          <div>
            <span>Corte · día {credito.fecha_corte || '—'}</span>
            <strong>{textoDiasCorte(alerta.diasParaCorte)}</strong>
          </div>
        </div>
        <div className={`credit-date-cell ${pagoRegistrado ? 'is-paid' : pagoUrgente || pagoProximo ? 'is-urgent' : ''}`}>
          {pagoRegistrado ? <CheckCircle2 aria-hidden="true" /> : <Bell aria-hidden="true" />}
          <div>
            <span>Pago · día {credito.fecha_pago || '—'}</span>
            <strong>{pagoRegistrado ? 'Pago registrado' : textoDiasPago(alerta.diasParaPago)}</strong>
          </div>
        </div>
      </div>

      {ciclo && metodoVinculado ? (
        <div className="credit-cycle">
          <div className="credit-cycle-primary">
            <div>
              <span>Pago para no generar intereses</span>
              <strong>{formatMXN(ciclo.pagoProximo)}</strong>
            </div>
            <p>Facturado al corte del {fmtFechaCorta(ciclo.ultimoCorte)}</p>
          </div>
          <div className="credit-cycle-secondary">
            <div>
              <span>Compras del periodo</span>
              <strong>{formatMXN(ciclo.gastoPeriodoActual)}</strong>
            </div>
            <div>
              <span>MSI por facturar{ciclo.msiActivos > 0 ? ` · ${ciclo.msiActivos}` : ''}</span>
              <strong>{formatMXN(ciclo.msiPendiente)}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="credit-unlinked">
          Vincula un método de pago para separar automáticamente lo facturado de las compras del siguiente corte.
        </div>
      )}

      <div className="credit-guidance">
        <div className={`credit-guidance-cell ${alerta.enRangoOptimo ? 'is-good' : ''}`}>
          <span>Mejor ventana</span>
          <strong>{fmtRango(alerta.inicioOptimo, alerta.finOptimo)}</strong>
        </div>
        <div className={`credit-guidance-cell ${alerta.enRangoEvitar ? 'is-bad' : ''}`}>
          <span>Evita comprar</span>
          <strong>{fmtRango(alerta.inicioEvitar, alerta.finEvitar)}</strong>
        </div>
      </div>
    </article>
  )
}

export default function Creditos() {
  const {
    creditos,
    metodos,
    comprasTarjeta,
    loading,
    error,
    refetch,
    saving,
    agregar,
    actualizar,
    eliminar,
    vincularMetodo,
  } = useCreditos()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const setF = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const comprasPorCredito = {}
  for (const transaccion of comprasTarjeta) {
    const creditoId = transaccion.metodos_pago?.credito_id
    if (creditoId) (comprasPorCredito[creditoId] ??= []).push(transaccion)
  }

  const ciclosPorCredito = Object.fromEntries(creditos.map(credito => [
    credito.id,
    calcularEstadoTarjeta({
      transaccionesTarjeta: comprasPorCredito[credito.id] ?? [],
      diaCorte: credito.fecha_corte,
    }),
  ]))

  const totalLimite = creditos.reduce((suma, credito) => suma + Number(credito.limite_credito ?? 0), 0)
  const totalSaldo = creditos.reduce((suma, credito) => suma + Number(credito.saldo_utilizado ?? 0), 0)
  const totalDisponible = Math.max(0, totalLimite - totalSaldo)
  const pctGlobal = totalLimite > 0 ? (totalSaldo / totalLimite) * 100 : 0
  const pagoPara30Total = creditos.reduce((suma, credito) => {
    const limite = Number(credito.limite_credito ?? 0)
    return limite > 0
      ? suma + Math.max(0, Number(credito.saldo_utilizado ?? 0) - (limite * 0.3))
      : suma
  }, 0)
  const totalFacturado = Object.values(ciclosPorCredito).reduce((suma, ciclo) => suma + Number(ciclo?.pagoProximo ?? 0), 0)
  const totalPeriodo = Object.values(ciclosPorCredito).reduce((suma, ciclo) => suma + Number(ciclo?.gastoPeriodoActual ?? 0), 0)
  const totalMsi = Object.values(ciclosPorCredito).reduce((suma, ciclo) => suma + Number(ciclo?.msiPendiente ?? 0), 0)

  const tarjetasPorUso = [...creditos].sort((a, b) => {
    const pctA = Number(a.limite_credito) > 0 ? Number(a.saldo_utilizado) / Number(a.limite_credito) : 0
    const pctB = Number(b.limite_credito) > 0 ? Number(b.saldo_utilizado) / Number(b.limite_credito) : 0
    return pctB - pctA
  })
  const mayorUso = tarjetasPorUso[0]
  const mayorUsoPct = mayorUso && Number(mayorUso.limite_credito) > 0
    ? (Number(mayorUso.saldo_utilizado) / Number(mayorUso.limite_credito)) * 100
    : 0
  const proximoPago = [...creditos]
    .map(credito => ({ credito, alerta: getAlerta(credito) }))
    .filter(({ alerta }) => !alerta.pagoProgramado?.ciclosPagados)
    .sort((a, b) => a.alerta.diasParaPago - b.alerta.diasParaPago)[0]

  const creditosOrdenados = [...creditos].sort((a, b) => {
    const alertaA = getAlerta(a)
    const alertaB = getAlerta(b)
    const pagadoA = alertaA.pagoProgramado?.ciclosPagados > 0
    const pagadoB = alertaB.pagoProgramado?.ciclosPagados > 0
    const usoA = Number(a.limite_credito) > 0 ? (Number(a.saldo_utilizado) / Number(a.limite_credito)) * 100 : 0
    const usoB = Number(b.limite_credito) > 0 ? (Number(b.saldo_utilizado) / Number(b.limite_credito)) * 100 : 0
    const prioridadA = (!pagadoA && alertaA.diasParaPago <= 7 ? 200 - alertaA.diasParaPago : 0) + usoA
    const prioridadB = (!pagadoB && alertaB.diasParaPago <= 7 ? 200 - alertaB.diasParaPago : 0) + usoB
    return prioridadB - prioridadA
  })

  const abrirNueva = () => {
    setEditando(null)
    setForm(FORM_VACIO)
    setMostrarForm(true)
  }

  const cerrarForm = () => {
    setMostrarForm(false)
    setEditando(null)
    setForm(FORM_VACIO)
  }

  const handleEditar = credito => {
    const metodoVinculado = metodos.find(metodo => metodo.credito_id === credito.id)
    setForm({
      nombre: credito.nombre,
      fecha_corte: credito.fecha_corte ?? '',
      fecha_pago: credito.fecha_pago ?? '',
      limite_credito: credito.limite_credito ?? '',
      saldo_utilizado: credito.saldo_utilizado ?? '',
      metodo_vinculado_id: metodoVinculado?.id ?? '',
    })
    setEditando(credito.id)
    setMostrarForm(true)
  }

  const handleGuardar = async () => {
    if (!form.nombre) return
    const datos = {
      nombre: form.nombre,
      fecha_corte: form.fecha_corte ? Number(form.fecha_corte) : null,
      fecha_pago: form.fecha_pago ? Number(form.fecha_pago) : null,
      mejor_fecha_inicio: null,
      mejor_fecha_fin: null,
      limite_credito: form.limite_credito ? Number(form.limite_credito) : null,
      saldo_utilizado: form.saldo_utilizado ? Number(form.saldo_utilizado) : 0,
    }
    let creditoId = editando
    if (editando) {
      await actualizar(editando, datos)
    } else {
      const { data } = await agregar(datos)
      creditoId = data?.id
    }
    if (creditoId) {
      await vincularMetodo(creditoId, form.metodo_vinculado_id ? Number(form.metodo_vinculado_id) : null)
    }
    cerrarForm()
  }

  if (error && !loading && creditos.length === 0) {
    return (
      <Layout titulo="Créditos">
        <ErrorState onRetry={refetch} mensaje={error} />
      </Layout>
    )
  }

  const prioridadTitle = pagoPara30Total > 0 && mayorUso
    ? `Baja ${mayorUso.nombre} a una zona más saludable`
    : proximoPago
      ? `Prepara el pago de ${proximoPago.credito.nombre}`
      : creditos.length > 0
        ? 'Tus tarjetas están bajo control'
        : 'Agrega tu primera tarjeta'
  const prioridadDescription = pagoPara30Total > 0 && mayorUso
    ? `${mayorUsoPct.toFixed(0)}% de uso. Para dejar todas tus tarjetas en 30% o menos necesitas ${formatMXN(pagoPara30Total)}.`
    : proximoPago
      ? `${textoDiasPago(proximoPago.alerta.diasParaPago)}. Cuando lo registres, la app moverá el recordatorio al siguiente ciclo.`
      : 'No hay pagos pendientes del ciclo ni utilización por encima del nivel recomendado.'

  return (
    <Layout titulo="Créditos">
      <div className="commitment-page">
        <div className="commitment-module-bar">
          <CommitmentNav />
          <button type="button" className="btn-primary flex items-center gap-2" onClick={abrirNueva}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Nueva tarjeta</span>
          </button>
        </div>

        <CommitmentHero
          eyebrow="Centro de compromisos"
          title="Crédito visible, decisiones más ligeras."
          description="Separa lo que ya debes, lo que está facturado y lo que apenas llegará al siguiente corte."
          amountLabel="Saldo utilizado"
          amount={formatMXN(totalSaldo)}
          aside={(
            <PriorityPanel
              icon={pagoPara30Total > 0 ? Gauge : proximoPago ? Bell : ShieldCheck}
              tone={pagoPara30Total > 0 ? 'warning' : proximoPago ? 'primary' : 'positive'}
              title={prioridadTitle}
              description={prioridadDescription}
              action={(pagoPara30Total > 0 || proximoPago) && (
                <Link to="/deudas" className="commitment-text-action">
                  <span>Registrar pago</span>
                  <CircleDollarSign aria-hidden="true" />
                </Link>
              )}
            />
          )}
        >
          <HeroMetric icon={WalletCards} label="Línea total" value={formatMXN(totalLimite)} />
          <HeroMetric icon={ShieldCheck} label="Disponible" value={formatMXN(totalDisponible)} />
          <HeroMetric icon={Gauge} label="Utilización global" value={`${pctGlobal.toFixed(0)}%`} />
        </CommitmentHero>

        {!loading && creditos.length > 0 && (
          <div className="credit-overview-strip">
            <div className="credit-overview-item">
              <span>Facturado al último corte</span>
              <strong>{formatMXN(totalFacturado)}</strong>
              <p>Pago para no generar intereses calculado con gastos vinculados.</p>
            </div>
            <div className="credit-overview-item">
              <span>Compras del periodo actual</span>
              <strong>{formatMXN(totalPeriodo)}</strong>
              <p>Se reflejarán en el siguiente corte de cada tarjeta.</p>
            </div>
            <div className="credit-overview-item">
              <span>MSI aún por facturar</span>
              <strong>{formatMXN(totalMsi)}</strong>
              <p>Compromiso futuro de compras a meses sin intereses.</p>
            </div>
          </div>
        )}

        <SectionHeader
          eyebrow="Portafolio de crédito"
          title="Tarjetas activas"
          description="Ordenadas por urgencia de pago y nivel de utilización."
          action={creditos.length > 0 ? <StatusPill tone={pctGlobal > 30 ? 'warning' : 'positive'} icon={Gauge}>{pctGlobal.toFixed(0)}% global</StatusPill> : null}
        />

        {loading ? (
          <div className="credit-grid">
            {[0, 1, 2, 3].map(item => <div key={item} className="card h-80 animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
          </div>
        ) : creditos.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No tienes tarjetas registradas"
            description="Agrega tus tarjetas para vigilar utilización, ciclos de corte y pagos desde un mismo lugar."
            action={(
              <button type="button" onClick={abrirNueva} className="btn-primary text-sm">
                <Plus className="w-4 h-4" /> Nueva tarjeta
              </button>
            )}
          />
        ) : (
          <div className="credit-grid">
            {creditosOrdenados.map(credito => (
              <TarjetaCredito
                key={credito.id}
                credito={credito}
                metodos={metodos}
                ciclo={ciclosPorCredito[credito.id]}
                onEditar={handleEditar}
                onEliminar={setConfirmDelete}
              />
            ))}
          </div>
        )}
      </div>

      <Sheet
        open={mostrarForm}
        onClose={cerrarForm}
        title={editando ? 'Editar tarjeta' : 'Nueva tarjeta'}
        description="La línea, los días del ciclo y el método vinculado alimentan todos los cálculos de esta vista."
        footer={(
          <>
            <button type="button" className="btn-ghost" onClick={cerrarForm}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={handleGuardar} disabled={saving || !form.nombre}>
              {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Guardar tarjeta'}
            </button>
          </>
        )}
      >
        <div className="commitment-form-grid">
          <div className="commitment-form-field is-wide">
            <label className="label">Nombre</label>
            <input className="input" placeholder="Ej: Nu, BBVA, Mercado Pago" value={form.nombre} onChange={event => setF('nombre', event.target.value)} />
          </div>
          <div className="commitment-form-field">
            <label className="label">Límite de crédito</label>
            <input type="number" min="0" className="input" placeholder="$0.00" value={form.limite_credito} onChange={event => setF('limite_credito', event.target.value)} />
          </div>
          <div className="commitment-form-field">
            <label className="label">Saldo utilizado</label>
            <input type="number" min="0" className="input" placeholder="$0.00" value={form.saldo_utilizado} onChange={event => setF('saldo_utilizado', event.target.value)} />
          </div>
          <div className="commitment-form-field">
            <label className="label">Día de corte</label>
            <input type="number" min="1" max="31" className="input" placeholder="18" value={form.fecha_corte} onChange={event => setF('fecha_corte', event.target.value)} />
          </div>
          <div className="commitment-form-field">
            <label className="label">Día de pago</label>
            <input type="number" min="1" max="31" className="input" placeholder="30" value={form.fecha_pago} onChange={event => setF('fecha_pago', event.target.value)} />
          </div>
          <div className="commitment-form-field is-wide">
            <label className="label">Método de pago vinculado</label>
            <select className="input" value={form.metodo_vinculado_id} onChange={event => setF('metodo_vinculado_id', event.target.value)}>
              <option value="">Sin vincular</option>
              {metodos.filter(metodo => metodo.tipo === 'credito').map(metodo => (
                <option key={metodo.id} value={metodo.id}>{metodo.nombre}</option>
              ))}
            </select>
            <p className="commitment-form-note">Los gastos con este método actualizarán el saldo y se asignarán al ciclo correcto.</p>
          </div>
        </div>
      </Sheet>

      <ConfirmModal
        open={!!confirmDelete}
        titulo="¿Eliminar tarjeta?"
        descripcion="La tarjeta dejará de aparecer en Créditos y Deudas. Esta acción no se puede deshacer."
        onConfirm={() => { eliminar(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
