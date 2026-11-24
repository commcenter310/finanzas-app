import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  CreditCard,
  Info,
  Link2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import Layout from '../components/layout/Layout'
import Resumen, { Dato } from '../components/ui/Resumen'
import ConfirmModal from '../components/ui/ConfirmModal'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import { useToast } from '../components/ui/Toast'
import {
  PriorityPanel,
  ProgressRail,
  Sheet,
  StatusPill,
} from '../components/commitments/CommitmentUI'
import { useCreditos } from '../hooks/useCreditos'
import { calcularEstadoTarjeta, calcularSaldoNoRegistrado, diasHastaDiaDelMes } from '../utils/calculos'
import { formatMXN } from '../utils/constantes'
import { esDiaDelMesOpcional, textoLimpio } from '../utils/validaciones'
import { resolverVencimientoProgramado } from '../utils/pagosProgramados'

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
  const pagoProgramado = resolverVencimientoProgramado({
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
  // Saldo que no sale de compras registradas: el pago calculado no lo incluye
  const saldoNoRegistrado = calcularSaldoNoRegistrado(credito.saldo_utilizado, ciclo)
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

  // El método vinculado solo se menciona si se llama distinto de la tarjeta
  const mostrarMetodo = metodoVinculado && metodoVinculado.nombre.trim().toLowerCase() !== credito.nombre.trim().toLowerCase()

  return (
    <article className={`tarjeta group ${riesgoAlto ? 'is-urgent' : requiereAtencion ? 'is-warning' : ''}`}>
      <header className="tarjeta-cabecera">
        <h3>{credito.nombre}</h3>
        <span className="tarjeta-estados">
          {mostrarMetodo && <StatusPill tone="primary" icon={Link2}>{metodoVinculado.nombre}</StatusPill>}
          {pagoRegistrado && <StatusPill tone="positive" icon={CheckCircle2}>Ciclo cubierto</StatusPill>}
          {!pagoRegistrado && pagoUrgente && <StatusPill tone="negative" icon={Bell}>{textoDiasPago(alerta.diasParaPago)}</StatusPill>}
          {alerta.enRangoOptimo && <StatusPill tone="positive" icon={ShieldCheck}>Buen momento para usarla</StatusPill>}
          {alerta.enRangoEvitar && <StatusPill tone="warning" icon={AlertTriangle}>Mejor no usarla hoy</StatusPill>}
        </span>
        <span className="tarjeta-herramientas acciones-hover">
          <button type="button" className="icon-button icon-button-sm" onClick={() => onEditar(credito)} title="Editar tarjeta" aria-label={`Editar ${credito.nombre}`}>
            <Pencil />
          </button>
          <button type="button" className="icon-button icon-button-sm" onClick={() => onEliminar(credito.id)} title="Eliminar tarjeta" aria-label={`Eliminar ${credito.nombre}`}>
            <Trash2 />
          </button>
        </span>
      </header>

      <div className="tarjeta-saldo">
        <strong>{formatMXN(saldo)}</strong>
        <span>
          de {formatMXN(limite)} · <span className={`tarjeta-pct tone-${tonoUso}`}>{pctUso.toFixed(0)}%</span> · {formatMXN(disponible)} libres
        </span>
      </div>
      <ProgressRail value={pctUso} marker={30} tone={tonoUso} />

      <dl className="tarjeta-datos">
        <div>
          <dt>Corte · día {credito.fecha_corte || '—'}</dt>
          <dd>{textoDiasCorte(alerta.diasParaCorte)}</dd>
        </div>
        <div className={pagoRegistrado ? 'is-paid' : pagoUrgente || pagoProximo ? 'is-urgent' : ''}>
          <dt>Pago · día {credito.fecha_pago || '—'}</dt>
          <dd>{pagoRegistrado ? 'Pago registrado' : textoDiasPago(alerta.diasParaPago)}</dd>
        </div>
        {ciclo && metodoVinculado ? (
          <>
            <div>
              <dt>Pago sin intereses</dt>
              <dd title={`Facturado al corte del ${fmtFechaCorta(ciclo.ultimoCorte)}`}>{formatMXN(ciclo.pagoProximo)}</dd>
            </div>
            <div>
              <dt>Compras del periodo{ciclo.msiPendiente > 0 ? ' · MSI' : ''}</dt>
              <dd>
                {formatMXN(ciclo.gastoPeriodoActual)}
                {ciclo.msiPendiente > 0 && <small> · {formatMXN(ciclo.msiPendiente)}</small>}
              </dd>
            </div>
          </>
        ) : (
          <div className="tarjeta-sin-metodo">
            <dt>Sin método de pago vinculado</dt>
            <dd>Vincúlalo al editar la tarjeta para separar lo facturado de lo del siguiente corte.</dd>
          </div>
        )}
      </dl>

      <p className="tarjeta-ventana">
        <span className={alerta.enRangoOptimo ? 'is-good' : ''}>Mejor para comprar: {fmtRango(alerta.inicioOptimo, alerta.finOptimo).toLowerCase()}</span>
        <span className={alerta.enRangoEvitar ? 'is-bad' : ''}>Evita: {fmtRango(alerta.inicioEvitar, alerta.finEvitar).toLowerCase()}</span>
      </p>

      {(saldoNoRegistrado > 0 || pagoPara30 > 0) && (
        <div className="tarjeta-notas">
          {pagoPara30 > 0 && (
            <p style={{ color: 'var(--warning-fg)' }}>Paga {formatMXN(pagoPara30)} para dejarla en 30% de uso.</p>
          )}
          {saldoNoRegistrado > 0 && (
            <p role="note">
              <Info aria-hidden="true" />
              Incluye {formatMXN(saldoNoRegistrado)} que no viene de compras registradas aquí; confirma el pago en tu estado de cuenta.
            </p>
          )}
        </div>
      )}
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
    crearMetodoParaTarjeta,
    actualizar,
    eliminar,
    vincularMetodo,
  } = useCreditos()
  const toast = useToast()
  const navigate = useNavigate()
  // Llega desde el formulario de gastos con un método de crédito que aún no
  // tiene tarjeta: abre el alta ya vinculada a ese método.
  const nuevaTarjeta = useLocation().state?.nuevaTarjeta
  const [mostrarForm, setMostrarForm] = useState(Boolean(nuevaTarjeta))
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(() => nuevaTarjeta
    ? { ...FORM_VACIO, nombre: nuevaTarjeta.nombre ?? '', metodo_vinculado_id: String(nuevaTarjeta.metodoId ?? '') }
    : FORM_VACIO)
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
    if (nuevaTarjeta) navigate('.', { replace: true, state: null })
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
    const nombre = textoLimpio(form.nombre)
    if (!nombre) return toast('Escribe el nombre de la tarjeta.', 'error')
    if (!esDiaDelMesOpcional(form.fecha_corte) || !esDiaDelMesOpcional(form.fecha_pago)) {
      return toast('El día de corte y el de pago deben ser números del 1 al 31.', 'error')
    }
    const datos = {
      nombre,
      fecha_corte: form.fecha_corte ? Number(form.fecha_corte) : null,
      fecha_pago: form.fecha_pago ? Number(form.fecha_pago) : null,
      mejor_fecha_inicio: null,
      mejor_fecha_fin: null,
      limite_credito: form.limite_credito ? Number(form.limite_credito) : null,
      saldo_utilizado: form.saldo_utilizado ? Number(form.saldo_utilizado) : 0,
    }
    const { data, error: errorGuardar } = editando
      ? await actualizar(editando, datos)
      : await agregar(datos)
    if (errorGuardar) {
      toast('No se pudo guardar la tarjeta. Intenta de nuevo.', 'error')
      return
    }
    const creditoId = editando ?? data?.id
    if (creditoId) {
      // Tarjeta nueva sin método elegido → se le crea uno con su nombre
      const { error: errorVinculo } = !editando && !form.metodo_vinculado_id
        ? await crearMetodoParaTarjeta(creditoId, nombre)
        : await vincularMetodo(
          creditoId,
          form.metodo_vinculado_id ? Number(form.metodo_vinculado_id) : null
        )
      if (errorVinculo) toast('La tarjeta se guardó, pero no se pudo vincular el método de pago.', 'error')
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
    <Layout titulo="Créditos" acciones={(
      <button type="button" className="btn-primary" onClick={abrirNueva}>
        <Plus className="w-4 h-4" aria-hidden="true" />
        <span>Nueva tarjeta</span>
      </button>
    )}>
      <div className="commitment-page">
        <Resumen
          titulo="Debes en tarjetas"
          cifra={formatMXN(totalSaldo)}
          nota={creditos.length > 0 ? `Usas ${pctGlobal.toFixed(0)}% de ${formatMXN(totalLimite)} · ${formatMXN(totalDisponible)} disponibles` : null}
          progreso={creditos.length > 0 ? pctGlobal : null}
          tono={pctGlobal > 80 ? 'negative' : pctGlobal > 30 ? 'warning' : 'neutral'}
          cargando={loading}
          desgloses={creditos.length > 0 && (
            <>
              <Dato label="Facturado al corte" value={formatMXN(totalFacturado)} />
              <Dato label="Compras del periodo" value={formatMXN(totalPeriodo)} />
              <Dato label="MSI por facturar" value={formatMXN(totalMsi)} />
            </>
          )}
          aviso={creditos.length > 0 && (
            <PriorityPanel
              tone={pagoPara30Total > 0 ? 'warning' : 'neutral'}
              title={prioridadTitle}
              description={prioridadDescription}
              action={(pagoPara30Total > 0 || proximoPago) && (
                <Link to="/deudas" className="commitment-text-action">
                  <span>Registrar pago</span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              )}
            />
          )}
        />

        {loading ? (
          <div className="credit-grid">
            {[0, 1, 2, 3].map(item => <div key={item} className="card h-80 animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
          </div>
        ) : creditos.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No tienes tarjetas registradas"
            description="Agrega una tarjeta para ver su saldo, su fecha de corte y cuándo toca pagarla."
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
        description="Con el límite y los días de corte y pago se calcula todo lo demás."
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
              <option value="">{editando ? 'Sin vincular' : 'Crear uno con el nombre de la tarjeta'}</option>
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
        onConfirm={async () => {
          const id = confirmDelete
          setConfirmDelete(null)
          const { error } = await eliminar(id)
          if (error) toast('No se pudo eliminar. Intenta de nuevo.', 'error')
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
