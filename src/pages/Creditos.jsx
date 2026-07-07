import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { useCreditos } from '../hooks/useCreditos'
import { formatMXN } from '../utils/constantes'
import { diasHastaDiaDelMes, calcularEstadoTarjeta } from '../utils/calculos'
import { Plus, Pencil, Trash2, AlertTriangle, Bell } from 'lucide-react'
import ConfirmModal from '../components/ui/ConfirmModal'
import ErrorState from '../components/ui/ErrorState'

// ── Resumen global de utilización ────────────────────────────────────────────
function ResumenGeneral({ creditos }) {
  const conLimite = creditos.filter(c => Number(c.limite_credito) > 0)
  if (conLimite.length === 0) return null

  const totalLimite    = conLimite.reduce((s, c) => s + Number(c.limite_credito), 0)
  const totalUtilizado = conLimite.reduce((s, c) => s + Number(c.saldo_utilizado ?? 0), 0)
  const pctGlobal      = totalLimite > 0 ? (totalUtilizado / totalLimite) * 100 : 0
  const disponible     = totalLimite - totalUtilizado
  const sobreLimite    = pctGlobal > 30
  const colorGlobal    = pctGlobal > 80 ? 'var(--negative)' : pctGlobal > 30 ? 'var(--warning)' : 'var(--ahorro)'
  const ordenadasPorUso = conLimite
    .slice()
    .sort((a, b) => (Number(b.saldo_utilizado ?? 0) / Number(b.limite_credito)) - (Number(a.saldo_utilizado ?? 0) / Number(a.limite_credito)))
  const mayorUso = ordenadasPorUso[0]
  const pagoMayorUso30 = mayorUso
    ? Math.max(0, Number(mayorUso.saldo_utilizado ?? 0) - (Number(mayorUso.limite_credito) * 0.3))
    : 0
  const pagoTotal30 = conLimite.reduce((s, c) =>
    s + Math.max(0, Number(c.saldo_utilizado ?? 0) - (Number(c.limite_credito) * 0.3)), 0)
  const proximoPago = conLimite
    .slice()
    .sort((a, b) => (diasHastaDiaDelMes(a.fecha_pago) ?? 99) - (diasHastaDiaDelMes(b.fecha_pago) ?? 99))[0]
  const diasProximoPago = proximoPago ? diasHastaDiaDelMes(proximoPago.fecha_pago) : null

  return (
    <div className="card p-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-sm" style={{ color: 'var(--fg-1)' }}>Utilización Global</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
            {formatMXN(totalUtilizado)} utilizados de {formatMXN(totalLimite)} en total
          </p>
        </div>
        <span
          className="text-3xl font-bold tabular"
          style={{ color: colorGlobal, fontVariantNumeric: 'tabular-nums' }}
        >
          {pctGlobal.toFixed(0)}%
        </span>
      </div>

      {/* Barra global con marcador 30% */}
      <div className="relative h-3 rounded-full overflow-visible mb-1" style={{ background: 'var(--surface-3)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pctGlobal, 100)}%`, backgroundColor: colorGlobal }}
        />
        <div className="absolute top-0 h-full" style={{ left: '30%' }}>
          <div className="w-0.5 h-4 -mt-0.5 rounded" style={{ background: 'var(--warning)' }} />
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-semibold" style={{ color: 'var(--warning-fg)' }}>30%</span>
        <span className="text-xs font-semibold" style={{ color: 'var(--ahorro-fg)' }}>
          Disponible: {formatMXN(disponible)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <div className="rounded-[var(--r-lg)] p-3 lg:col-span-2"
          style={{ background: sobreLimite ? 'var(--warning-bg)' : 'var(--ahorro-bg)', border: `1px solid ${sobreLimite ? 'var(--warning-bg)' : 'var(--ahorro-bg)'}` }}>
          <p className="text-xs font-bold mb-1" style={{ color: sobreLimite ? 'var(--warning-fg)' : 'var(--ahorro-fg)' }}>
            Acción recomendada
          </p>
          <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
            {pagoTotal30 > 0
              ? `Paga ${formatMXN(pagoMayorUso30)} en ${mayorUso.nombre} para acercarla al 30%.`
              : 'Todas tus tarjetas están dentro del 30% recomendado.'}
          </p>
          {pagoTotal30 > 0 && (
            <p className="text-xs mt-1" style={{ color: 'var(--fg-3)' }}>
              Para dejar todas al 30% o menos: {formatMXN(pagoTotal30)}.
            </p>
          )}
        </div>
        <div className="rounded-[var(--r-lg)] p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-bold mb-1" style={{ color: 'var(--fg-3)' }}>Siguiente pago</p>
          <p className="text-sm font-bold truncate" style={{ color: 'var(--fg-1)' }}>{proximoPago?.nombre ?? 'Sin fechas'}</p>
          <p className="text-xs" style={{ color: 'var(--fg-3)' }}>
            {diasProximoPago != null ? `En ${diasProximoPago} día${diasProximoPago !== 1 ? 's' : ''}` : 'Captura fecha de pago'}
          </p>
        </div>
      </div>

      {/* Mini barras por tarjeta */}
      <div className="space-y-2 border-t pt-4" style={{ borderColor: 'var(--divider)' }}>
        {conLimite
          .slice()
          .sort((a, b) => (Number(b.saldo_utilizado) / Number(b.limite_credito)) - (Number(a.saldo_utilizado) / Number(a.limite_credito)))
          .map(c => {
            const pct   = (Number(c.saldo_utilizado ?? 0) / Number(c.limite_credito)) * 100
            const color = pct > 80 ? 'var(--negative)' : pct > 30 ? 'var(--warning)' : 'var(--ahorro)'
            return (
              <div key={c.id} className="flex items-center gap-3">
                <span
                  className="text-xs font-semibold truncate flex-shrink-0 w-24"
                  style={{ color: 'var(--fg-2)' }}
                  title={c.nombre}
                >
                  {c.nombre}
                </span>
                <div className="flex-1 relative h-2 rounded-full overflow-visible" style={{ background: 'var(--surface-3)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
                  {/* Marcador 30% en mini barra */}
                  <div className="absolute top-0 h-full" style={{ left: '30%' }}>
                    <div className="w-px h-3 -mt-0.5" style={{ background: 'var(--warning)', opacity: 0.5 }} />
                  </div>
                </div>
                <span
                  className="text-xs font-bold tabular flex-shrink-0 w-8 text-right"
                  style={{ color, fontVariantNumeric: 'tabular-nums' }}
                >
                  {pct.toFixed(0)}%
                </span>
                <span
                  className="text-xs tabular flex-shrink-0 w-20 text-right hidden sm:block"
                  style={{ color: 'var(--fg-4)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatMXN(c.saldo_utilizado ?? 0)}
                </span>
              </div>
            )
          })}
      </div>

      {/* Estado global */}
      <p className="text-xs mt-3 font-semibold" style={{ color: sobreLimite ? 'var(--warning-fg)' : 'var(--ahorro-fg)' }}>
        {sobreLimite
          ? '⚠️ Tu uso global supera el 30% recomendado. Puede afectar tu score de crédito.'
          : '✓ Tu uso global está dentro del 30% recomendado. ¡Bien manejado!'}
      </p>
    </div>
  )
}

function calcularFechasOptimas(fechaCorte) {
  const buf = 5
  // Días del mes en curso para el "wrap" de rangos que cruzan de mes
  const diasMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  return {
    inicioOptimo: fechaCorte >= diasMes ? 1 : fechaCorte + 1,
    finOptimo:    fechaCorte - buf > 0 ? fechaCorte - buf : diasMes + fechaCorte - buf,
    inicioEvitar: fechaCorte - buf + 1 > 0 ? fechaCorte - buf + 1 : diasMes + fechaCorte - buf + 1,
    finEvitar:    fechaCorte,
  }
}

function estaEnRango(hoy, inicio, fin) {
  return inicio <= fin
    ? hoy >= inicio && hoy <= fin
    : hoy >= inicio || hoy <= fin
}

function getAlerta(credito) {
  const hoy = new Date().getDate()
  // Días con calendario real (meses de 28-31 días)
  const diasParaCorte = diasHastaDiaDelMes(credito.fecha_corte) ?? 99
  const diasParaPago  = diasHastaDiaDelMes(credito.fecha_pago)  ?? 99
  const { inicioOptimo, finOptimo, inicioEvitar, finEvitar } = calcularFechasOptimas(credito.fecha_corte)
  return {
    diasParaCorte, diasParaPago,
    enRangoOptimo: estaEnRango(hoy, inicioOptimo, finOptimo),
    enRangoEvitar: estaEnRango(hoy, inicioEvitar, finEvitar),
    inicioOptimo, finOptimo, inicioEvitar, finEvitar,
  }
}

const fmtFechaCorta = (d) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

function TarjetaCredito({ credito, metodos, ciclo, onEditar, onEliminar }) {
  const { diasParaCorte, diasParaPago, enRangoOptimo, enRangoEvitar, inicioOptimo, finOptimo, inicioEvitar, finEvitar } = getAlerta(credito)
  const pctUso = credito.limite_credito > 0
    ? (credito.saldo_utilizado / credito.limite_credito) * 100 : 0
  const alertaPagoUrgente  = diasParaPago  <= 3
  const alertaPago         = diasParaPago  <= 7
  const alertaCorteUrgente = diasParaCorte <= 3
  const alertaCorte        = diasParaCorte <= 7
  const sobreLimite  = pctUso > 30
  const metodoVinculado = metodos?.find(m => m.credito_id === credito.id)
  const colorBarra = pctUso > 80 ? 'var(--negative)' : pctUso > 30 ? 'var(--warning)' : 'var(--ahorro)'
  const limite = Number(credito.limite_credito ?? 0)
  const saldo = Number(credito.saldo_utilizado ?? 0)
  const disponible = Math.max(0, limite - saldo)
  const pagoPara30 = limite > 0 ? Math.max(0, saldo - (limite * 0.3)) : 0

  const fmtRango = (inicio, fin) =>
    inicio <= fin ? `días ${inicio} al ${fin}` : `días ${inicio} al ${fin} (mes sig.)`

  return (
    <div className="card p-5" style={alertaPagoUrgente ? { border: '2px solid var(--negative)' } : alertaPago ? { border: '2px solid var(--negative-bg)' } : alertaCorteUrgente ? { border: '2px solid var(--warning)' } : alertaCorte ? { border: '2px solid var(--warning-bg)' } : {}}>
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1">
          <h3 className="font-bold text-gray-900">{credito.nombre}</h3>
          <div className="flex flex-wrap gap-1">
            {metodoVinculado && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'var(--primary-50)', color: 'var(--primary-700)', border: '1px solid var(--primary-200)' }}>
                via {metodoVinculado.nombre}
              </span>
            )}
            {enRangoOptimo && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'var(--ahorro-bg)', color: 'var(--ahorro-fg)', border: '1px solid var(--ahorro-bg)' }}>
                ✅ Úsala hoy
              </span>
            )}
            {enRangoEvitar && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'var(--negative-bg)', color: 'var(--negative-fg)', border: '1px solid var(--negative-bg)' }}>
                ⚠️ Evita usarla hoy
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEditar(credito)}
            className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-700 flex items-center justify-center text-gray-400">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEliminar(credito.id)}
            className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {credito.limite_credito > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-gray-500">Saldo utilizado</span>
            <span className="font-mono font-bold" style={{ color: colorBarra }}>
              {pctUso.toFixed(0)}%
              <span className="text-gray-400 font-normal ml-1">
                ({formatMXN(credito.saldo_utilizado)} / {formatMXN(credito.limite_credito)})
              </span>
            </span>
          </div>
          {/* Barra con marcador del 30% */}
          <div className="relative h-2 bg-gray-100 rounded-full overflow-visible mb-1">
            <div className="h-full rounded-full transition-all overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pctUso, 100)}%`, backgroundColor: colorBarra }} />
            </div>
            {/* Marcador 30% */}
            <div className="absolute top-0 h-full" style={{ left: '30%' }}>
              <div className="w-0.5 h-3 -mt-0.5 rounded" style={{ background: 'var(--warning)' }} />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono" style={{ color: 'var(--warning-fg)' }}>30%</span>
            {sobreLimite
              ? <span className="text-xs font-semibold" style={{ color: 'var(--warning-fg)' }}>⚠️ Supera el 30% recomendado</span>
              : <span className="text-xs font-semibold" style={{ color: 'var(--ahorro-fg)' }}>✓ Dentro del límite recomendado</span>
            }
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-[var(--r-sm)] px-3 py-2" style={{ background: 'var(--surface-2)' }}>
              <p className="text-xs" style={{ color: 'var(--fg-3)' }}>Disponible</p>
              <p className="text-sm font-bold tabular" style={{ color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums' }}>{formatMXN(disponible)}</p>
            </div>
            <div className="rounded-[var(--r-sm)] px-3 py-2" style={{ background: pagoPara30 > 0 ? 'var(--warning-bg)' : 'var(--ahorro-bg)' }}>
              <p className="text-xs" style={{ color: pagoPara30 > 0 ? 'var(--warning-fg)' : 'var(--ahorro-fg)' }}>Para 30%</p>
              <p className="text-sm font-bold tabular" style={{ color: pagoPara30 > 0 ? 'var(--warning-fg)' : 'var(--ahorro-fg)', fontVariantNumeric: 'tabular-nums' }}>
                {pagoPara30 > 0 ? formatMXN(pagoPara30) : 'OK'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div className="rounded-lg p-3"
          style={alertaCorteUrgente ? { background: 'var(--warning-bg)', border: '1px solid var(--warning)' } : alertaCorte ? { background: 'var(--warning-bg)', border: '1px solid var(--warning-bg)' } : { background: 'var(--surface-2)' }}>
          <p className="text-xs text-gray-400 mb-0.5">Fecha de Corte</p>
          <p className="font-bold text-gray-800 font-mono">Día {credito.fecha_corte}</p>
          <p className="text-xs mt-0.5" style={alertaCorte ? { color: 'var(--warning-fg)', fontWeight: 600 } : { color: 'var(--fg-4)' }}>
            {alertaCorteUrgente
              ? <span className="flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />⚠️ ¡{diasParaCorte} días!</span>
              : alertaCorte
              ? <span className="flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />Faltan {diasParaCorte} días</span>
              : `En ${diasParaCorte} días`}
          </p>
        </div>
        <div className="rounded-lg p-3"
          style={alertaPagoUrgente ? { background: 'var(--negative-bg)', border: '1px solid var(--negative)' } : alertaPago ? { background: 'var(--negative-bg)', border: '1px solid var(--negative-bg)' } : { background: 'var(--surface-2)' }}>
          <p className="text-xs text-gray-400 mb-0.5">Fecha de Pago</p>
          <p className="font-bold text-gray-800 font-mono">Día {credito.fecha_pago}</p>
          <p className="text-xs mt-0.5" style={alertaPago ? { color: 'var(--negative-fg)', fontWeight: 600 } : { color: 'var(--fg-4)' }}>
            {alertaPagoUrgente
              ? <span className="flex items-center gap-0.5"><Bell className="w-3 h-3" />🔴 ¡{diasParaPago} días!</span>
              : alertaPago
              ? <span className="flex items-center gap-0.5"><Bell className="w-3 h-3" />¡{diasParaPago} días!</span>
              : `En ${diasParaPago} días`}
          </p>
        </div>
      </div>

      {/* Ciclo de corte: qué pagar el día de pago vs qué llevas para el siguiente */}
      {ciclo && metodoVinculado && (
        <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-100)' }}>
          <div className="flex flex-wrap justify-between items-center gap-x-3 text-sm">
            <span className="font-semibold" style={{ color: 'var(--fg-1)' }}>🧾 Pagar el día {credito.fecha_pago}</span>
            <span className="font-mono font-bold" style={{ color: 'var(--fg-1)' }}>{formatMXN(ciclo.pagoProximo)}</span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
            Facturado al corte del {fmtFechaCorta(ciclo.ultimoCorte)} · pago para no generar intereses
          </p>
          <div className="flex flex-wrap justify-between items-center gap-x-3 text-xs mt-2 pt-2 border-t" style={{ borderColor: 'var(--primary-100)' }}>
            <span style={{ color: 'var(--fg-3)' }}>🛒 Este periodo (va al corte del {fmtFechaCorta(ciclo.proximoCorte)})</span>
            <span className="font-mono font-semibold" style={{ color: 'var(--fg-2)' }}>{formatMXN(ciclo.gastoPeriodoActual)}</span>
          </div>
          {ciclo.msiActivos > 0 && (
            <div className="flex flex-wrap justify-between items-center gap-x-3 text-xs mt-1">
              <span style={{ color: 'var(--fg-3)' }}>📅 MSI por facturar ({ciclo.msiActivos} compra{ciclo.msiActivos !== 1 ? 's' : ''})</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--fg-2)' }}>{formatMXN(ciclo.msiPendiente)}</span>
            </div>
          )}
        </div>
      )}
      {ciclo && !metodoVinculado && (
        <p className="text-xs mb-3 px-1" style={{ color: 'var(--fg-4)' }}>
          💡 Vincula un método de pago a esta tarjeta para calcular cuánto pagar en cada corte.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg px-3 py-2" style={{ background: 'var(--ahorro-bg)', border: '1px solid var(--ahorro-bg)' }}>
          <p className="font-semibold mb-0.5" style={{ color: 'var(--ahorro-fg)' }}>Óptimo</p>
          <p className="font-mono" style={{ color: 'var(--ahorro-fg)' }}>{fmtRango(inicioOptimo, finOptimo)}</p>
        </div>
        <div className="rounded-lg px-3 py-2" style={{ background: 'var(--negative-bg)', border: '1px solid var(--negative-bg)' }}>
          <p className="font-semibold mb-0.5" style={{ color: 'var(--negative-fg)' }}>Evitar</p>
          <p className="font-mono" style={{ color: 'var(--negative-fg)' }}>{fmtRango(inicioEvitar, finEvitar)}</p>
        </div>
      </div>
    </div>
  )
}

const FORM_VACIO = { nombre:'', fecha_corte:'', fecha_pago:'', limite_credito:'', saldo_utilizado:'', metodo_vinculado_id:'' }

export default function Creditos() {
  const { creditos, metodos, comprasTarjeta, loading, error, refetch, saving, agregar, actualizar, eliminar, vincularMetodo } = useCreditos()

  // Compras agrupadas por tarjeta (para el ciclo de corte)
  const comprasPorCredito = {}
  for (const t of comprasTarjeta) {
    const cid = t.metodos_pago?.credito_id
    if (cid) (comprasPorCredito[cid] ??= []).push(t)
  }
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleEditar = (credito) => {
    const metodoVinculado = metodos.find(m => m.credito_id === credito.id)
    setForm({
      nombre:             credito.nombre,
      fecha_corte:        credito.fecha_corte ?? '',
      fecha_pago:         credito.fecha_pago  ?? '',
      limite_credito:     credito.limite_credito  ?? '',
      saldo_utilizado:    credito.saldo_utilizado ?? '',
      metodo_vinculado_id: metodoVinculado?.id ?? '',
    })
    setEditando(credito.id)
    setMostrarForm(true)
  }

  const handleGuardar = async () => {
    if (!form.nombre) return
    const datos = {
      nombre:             form.nombre,
      fecha_corte:        Number(form.fecha_corte),
      fecha_pago:         Number(form.fecha_pago),
      mejor_fecha_inicio: null,
      mejor_fecha_fin:    null,
      limite_credito:     form.limite_credito  ? Number(form.limite_credito)  : null,
      saldo_utilizado:    form.saldo_utilizado ? Number(form.saldo_utilizado) : 0,
    }
    let creditoId = editando
    if (editando) {
      await actualizar(editando, datos)
    } else {
      const { data } = await agregar(datos)
      creditoId = data?.id
    }
    if (creditoId) await vincularMetodo(creditoId, form.metodo_vinculado_id ? Number(form.metodo_vinculado_id) : null)
    setForm(FORM_VACIO); setEditando(null); setMostrarForm(false)
  }

  const totalSaldo = creditos.reduce((s, c) => s + Number(c.saldo_utilizado ?? 0), 0)
  const pagoPara30Total = creditos.reduce((s, c) =>
    s + Math.max(0, Number(c.saldo_utilizado ?? 0) - (Number(c.limite_credito ?? 0) * 0.3)), 0)

  if (error && !loading && creditos.length === 0) {
    return (
      <Layout titulo="Créditos">
        <ErrorState onRetry={refetch} mensaje={error} />
      </Layout>
    )
  }

  return (
    <Layout titulo="Créditos">
      <div className="space-y-5">

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Tarjetas Activas</p>
            <p className="text-xl font-bold font-mono text-primary-700">{creditos.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Saldo Total Utilizado</p>
            <p className="text-xl font-bold font-mono" style={{ color: 'var(--warning-fg)' }}>{formatMXN(totalSaldo)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Pagos Próximos</p>
            <p className="text-xl font-bold font-mono" style={{ color: 'var(--negative-fg)' }}>
              {creditos.filter(c => getAlerta(c).diasParaPago <= 5).length} alertas
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Para Volver al 30%</p>
            <p className="text-xl font-bold font-mono" style={{ color: pagoPara30Total > 0 ? 'var(--warning-fg)' : 'var(--ahorro-fg)' }}>
              {pagoPara30Total > 0 ? formatMXN(pagoPara30Total) : 'OK'}
            </p>
          </div>
        </div>

        {/* Resumen global con mini barras por tarjeta */}
        {!loading && <ResumenGeneral creditos={creditos} />}

        <div className="flex justify-end">
          <button onClick={() => { setForm(FORM_VACIO); setEditando(null); setMostrarForm(v => !v) }}
            className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Agregar Tarjeta
          </button>
        </div>

        {mostrarForm && (
          <div className="card p-5 border-2 border-primary-200">
            <h3 className="font-bold text-gray-900 mb-4">{editando ? 'Editar Tarjeta' : 'Nueva Tarjeta'}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div className="col-span-2">
                <label className="label">Nombre</label>
                <input className="input" placeholder="NU, Simplicity, Liverpool..."
                  value={form.nombre} onChange={e => setF('nombre', e.target.value)} />
              </div>
              <div>
                <label className="label">Límite de Crédito</label>
                <input type="number" className="input font-mono"
                  value={form.limite_credito} onChange={e => setF('limite_credito', e.target.value)} />
              </div>
              <div>
                <label className="label">Saldo Utilizado</label>
                <input type="number" className="input font-mono"
                  value={form.saldo_utilizado} onChange={e => setF('saldo_utilizado', e.target.value)} />
              </div>
              <div>
                <label className="label">Fecha de Corte (día)</label>
                <input type="number" min="1" max="31" className="input font-mono" placeholder="18"
                  value={form.fecha_corte} onChange={e => setF('fecha_corte', e.target.value)} />
              </div>
              <div>
                <label className="label">Fecha de Pago (día)</label>
                <input type="number" min="1" max="31" className="input font-mono" placeholder="30"
                  value={form.fecha_pago} onChange={e => setF('fecha_pago', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Método de pago en Control de Gastos</label>
                <select className="input" value={form.metodo_vinculado_id}
                  onChange={e => setF('metodo_vinculado_id', e.target.value)}>
                  <option value="">Sin vincular</option>
                  {metodos.filter(m => m.tipo === 'credito').map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Los gastos con este método actualizarán el saldo automáticamente.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary px-6" onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button className="btn-ghost" onClick={() => setMostrarForm(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {loading
          ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array(3).fill(0).map((_,i) => <div key={i} className="card h-48 animate-pulse bg-gray-50" />)}</div>
          : creditos.length === 0
            ? <div className="card p-16 text-center text-gray-300 text-sm">No tienes tarjetas de crédito registradas</div>
            : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {creditos.map(c => (
                  <TarjetaCredito key={c.id} credito={c} metodos={metodos}
                    ciclo={calcularEstadoTarjeta({ transaccionesTarjeta: comprasPorCredito[c.id] ?? [], diaCorte: c.fecha_corte })}
                    onEditar={handleEditar} onEliminar={(id) => setConfirmDelete(id)} />
                ))}
              </div>}

      </div>
      <ConfirmModal
        open={!!confirmDelete}
        titulo="¿Eliminar tarjeta?"
        descripcion="Esta acción no se puede deshacer."
        onConfirm={() => { eliminar(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
