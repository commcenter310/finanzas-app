import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  BellRing,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Receipt,
  X,
} from 'lucide-react'
import { useMes } from '../../context/MesContext'
import { useRecordatorios, formatoFechaRecordatorio, textoDiasRecordatorio } from '../../hooks/useRecordatorios'
import { formatMXN, MESES } from '../../utils/constantes'

const STATUS = {
  vencido: { label: 'Vencido', bg: 'var(--negative-bg)', fg: 'var(--negative-fg)', border: 'var(--negative)' },
  hoy:     { label: 'Hoy',     bg: 'var(--warning-bg)',  fg: 'var(--warning-fg)',  border: 'var(--warning)' },
  pronto:  { label: 'Pronto',  bg: 'var(--primary-50)',  fg: 'var(--primary-700)', border: 'var(--primary-400)' },
  mes:     { label: 'Mes',     bg: 'var(--surface-2)',  fg: 'var(--fg-3)',        border: 'var(--border)' },
}

const TIPO = {
  fijo:    { label: 'Gasto fijo', icon: Receipt },
  deuda:   { label: 'Deuda',      icon: BadgeDollarSign },
  credito: { label: 'Tarjeta',    icon: CreditCard },
}

function SummaryPill({ label, value, tone = 'fg' }) {
  const color = tone === 'danger'
    ? 'var(--negative-fg)'
    : tone === 'warning'
    ? 'var(--warning-fg)'
    : tone === 'primary'
    ? 'var(--primary-700)'
    : 'var(--fg-1)'

  return (
    <div className="rounded-[var(--r-md)] border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
      <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--fg-4)' }}>{label}</p>
      <p className="mt-1 text-base font-bold tabular" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  )
}

function ReminderRow({ item, onNavigate }) {
  const meta = TIPO[item.tipo]
  const Icon = meta.icon
  const status = STATUS[item.estado]

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className="group block rounded-[var(--r-md)] border p-3 transition-colors hover:bg-surface-2"
      style={{ borderColor: 'var(--border)', borderLeftColor: status.border, borderLeftWidth: 3 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[var(--r-sm)]"
            style={{ background: status.bg, color: status.fg }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold" style={{ color: 'var(--fg-1)' }}>{item.titulo}</span>
            <span className="mt-0.5 block text-xs" style={{ color: 'var(--fg-3)' }}>
              {meta.label} · {formatoFechaRecordatorio(item.fecha)}
            </span>
          </span>
        </div>
        <span
          className="flex-shrink-0 rounded-full px-2 py-1 text-[11px] font-bold"
          style={{ background: status.bg, color: status.fg }}
        >
          {textoDiasRecordatorio(item.dias)}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tabular" style={{ color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums' }}>
            {formatMXN(item.monto)}
          </p>
          {item.detalle && <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--fg-3)' }}>{item.detalle}</p>}
        </div>
        <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-bold" style={{ color: 'var(--primary-700)' }}>
          {item.action}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

function MissingDateRow({ item, onNavigate }) {
  const meta = TIPO[item.tipo]
  const Icon = meta.icon

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border px-3 py-2.5 transition-colors hover:bg-surface-2"
      style={{ borderColor: 'var(--border)', color: 'var(--fg-1)' }}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[var(--r-sm)]" style={{ background: 'var(--warning-bg)', color: 'var(--warning-fg)' }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-bold">{item.titulo}</span>
          <span className="block text-[11px]" style={{ color: 'var(--fg-3)' }}>{meta.label} sin fecha</span>
        </span>
      </span>
      <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--fg-4)' }} />
    </Link>
  )
}

export default function ReminderBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { mes, anio } = useMes()
  const {
    loading,
    error,
    recordatorios,
    sinFecha,
    vencidos,
    proximos,
    inmediatos,
    masTarde,
    montoPendiente,
  } = useRecordatorios()

  const badgeCount = vencidos.length + proximos.length
  const hasSetupIssues = sinFecha.length > 0
  const showDot = badgeCount > 0 || hasSetupIssues
  const prioridad = inmediatos[0] ?? masTarde[0]

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const closePanel = () => setOpen(false)
  const badgeLabel = badgeCount > 9 ? '9+' : badgeCount

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="icon-button relative"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={badgeCount > 0 ? `${badgeCount} recordatorios urgentes` : 'Abrir recordatorios'}
      >
        <BellRing className="h-5 w-5" strokeWidth={2} />
        {showDot && (
          <span
            className="absolute -right-1 -top-1 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
            style={{ background: badgeCount > 0 ? 'var(--negative)' : 'var(--warning)' }}
          >
            {badgeCount > 0 ? badgeLabel : ''}
          </span>
        )}
      </button>

      {open && (
        <div
          className="reminder-popover"
          role="dialog"
          aria-label="Recordatorios financieros"
        >
          <div className="card overflow-hidden" style={{ boxShadow: 'var(--shadow-xl)' }}>
            <div className="flex items-start justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
              <div className="min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--fg-1)' }}>Recordatorios</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--fg-3)' }}>
                  {MESES[mes - 1]} {anio}
                </p>
              </div>
              <button type="button" className="icon-button icon-button-sm" onClick={closePanel} aria-label="Cerrar recordatorios">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-2">
                <SummaryPill label="Vencidos" value={vencidos.length} tone={vencidos.length > 0 ? 'danger' : 'fg'} />
                <SummaryPill label="7 días" value={proximos.length} tone="warning" />
                <SummaryPill label="Monto" value={formatMXN(montoPendiente)} tone="primary" />
              </div>

              {loading ? (
                <div className="mt-4 space-y-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="h-20 rounded-[var(--r-md)] animate-pulse" style={{ background: 'var(--surface-2)' }} />
                  ))}
                </div>
              ) : error ? (
                <div className="mt-4 rounded-[var(--r-md)] border px-3 py-3 text-sm" style={{ borderColor: 'var(--negative-bg)', background: 'var(--negative-bg)', color: 'var(--negative-fg)' }}>
                  No pude cargar recordatorios. {error}
                </div>
              ) : recordatorios.length === 0 && sinFecha.length === 0 ? (
                <div className="mt-4 flex flex-col items-center justify-center rounded-[var(--r-md)] border px-4 py-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                  <CheckCircle2 className="h-7 w-7" style={{ color: 'var(--positive-fg)' }} />
                  <p className="mt-2 text-sm font-bold" style={{ color: 'var(--fg-1)' }}>Todo al día</p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--fg-3)' }}>No hay pagos pendientes para este mes.</p>
                </div>
              ) : (
                <>
                  {prioridad && (
                    <div className="mt-4 rounded-[var(--r-md)] border px-3 py-3" style={{ borderColor: 'var(--primary-200)', background: 'var(--primary-50)' }}>
                      <div className="flex items-start gap-2">
                        <CalendarClock className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: 'var(--primary-700)' }} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase" style={{ color: 'var(--primary-700)' }}>Prioridad</p>
                          <p className="mt-1 truncate text-sm font-bold" style={{ color: 'var(--fg-1)' }}>{prioridad.titulo}</p>
                          <p className="mt-0.5 text-xs" style={{ color: 'var(--fg-3)' }}>
                            {textoDiasRecordatorio(prioridad.dias)} · {formatMXN(prioridad.monto)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {inmediatos.length > 0 && (
                    <section className="mt-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase" style={{ color: 'var(--fg-4)' }}>Atención ahora</p>
                        <AlertTriangle className="h-4 w-4" style={{ color: vencidos.length > 0 ? 'var(--negative-fg)' : 'var(--warning-fg)' }} />
                      </div>
                      <div className="space-y-2">
                        {inmediatos.slice(0, 5).map(item => <ReminderRow key={item.id} item={item} onNavigate={closePanel} />)}
                      </div>
                    </section>
                  )}

                  {masTarde.length > 0 && (
                    <section className="mt-4">
                      <p className="mb-2 text-xs font-bold uppercase" style={{ color: 'var(--fg-4)' }}>Más adelante</p>
                      <div className="space-y-2">
                        {masTarde.slice(0, inmediatos.length > 0 ? 3 : 5).map(item => <ReminderRow key={item.id} item={item} onNavigate={closePanel} />)}
                      </div>
                    </section>
                  )}

                  {sinFecha.length > 0 && (
                    <section className="mt-4">
                      <p className="mb-2 text-xs font-bold uppercase" style={{ color: 'var(--fg-4)' }}>Faltan fechas</p>
                      <div className="space-y-2">
                        {sinFecha.slice(0, 4).map(item => <MissingDateRow key={item.id} item={item} onNavigate={closePanel} />)}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
