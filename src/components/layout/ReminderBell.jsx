import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BellRing, X } from 'lucide-react'
import { useMes } from '../../context/MesContext'
import { useRecordatorios, formatoFechaRecordatorio, textoDiasRecordatorio } from '../../hooks/useRecordatorios'
import { formatMXN, MESES } from '../../utils/constantes'

const COLOR_ESTADO = {
  vencido: 'var(--negative-fg)',
  hoy:     'var(--warning-fg)',
  pronto:  'var(--fg-2)',
  mes:     'var(--fg-3)',
}

const TIPO = {
  fijo:    { label: 'Gasto fijo' },
  deuda:   { label: 'Deuda' },
  credito: { label: 'Tarjeta' },
}

function ReminderRow({ item, onNavigate }) {
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className="flex items-baseline justify-between gap-3 py-2.5 hover:underline underline-offset-2"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium" style={{ color: 'var(--fg-1)' }}>{item.titulo}</span>
        <span className="block text-[13px]" style={{ color: 'var(--fg-3)' }}>
          {TIPO[item.tipo].label} · {formatoFechaRecordatorio(item.fecha)} ·{' '}
          <span style={{ color: COLOR_ESTADO[item.estado] }}>{textoDiasRecordatorio(item.dias).toLowerCase()}</span>
        </span>
      </span>
      <span className="flex-shrink-0 text-sm font-medium tabular" style={{ color: 'var(--fg-1)' }}>
        {formatMXN(item.monto)}
      </span>
    </Link>
  )
}

function MissingDateRow({ item, onNavigate }) {
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className="flex items-baseline justify-between gap-3 py-2.5 hover:underline underline-offset-2"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium" style={{ color: 'var(--fg-1)' }}>{item.titulo}</span>
        <span className="block text-[13px]" style={{ color: 'var(--fg-3)' }}>{TIPO[item.tipo].label} sin fecha</span>
      </span>
      <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 self-center" style={{ color: 'var(--fg-3)' }} />
    </Link>
  )
}

function Seccion({ titulo, children }) {
  return (
    <section className="mt-4">
      <p className="text-[13px]" style={{ color: 'var(--fg-3)' }}>{titulo}</p>
      <div className="divide-y divide-[var(--divider)]">{children}</div>
    </section>
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
    refetch,
  } = useRecordatorios()

  const badgeCount = vencidos.length + proximos.length
  const hasSetupIssues = sinFecha.length > 0
  const showDot = badgeCount > 0 || hasSetupIssues

  useEffect(() => {
    if (!open) return undefined
    refetch()

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
  }, [open, refetch])

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
            className="absolute -right-1 -top-1 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[11px] font-semibold leading-none text-white"
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
                <p className="titulo-seccion">Pagos pendientes</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--fg-3)' }}>
                  {MESES[mes - 1]} {anio}
                </p>
              </div>
              <button type="button" className="icon-button icon-button-sm" onClick={closePanel} aria-label="Cerrar recordatorios">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              <p className="font-display text-2xl font-semibold tabular" style={{ color: 'var(--fg-1)' }}>{formatMXN(montoPendiente)}</p>
              <p className="text-[13px]" style={{ color: 'var(--fg-3)' }}>
                por pagar ·{' '}
                <span style={vencidos.length > 0 ? { color: 'var(--negative-fg)' } : undefined}>
                  {vencidos.length} vencido{vencidos.length !== 1 ? 's' : ''}
                </span>
                {' '}· {proximos.length} en los próximos 7 días
              </p>

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
                <div className="mt-4">
                  <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>Todo al día</p>
                  <p className="text-[13px]" style={{ color: 'var(--fg-3)' }}>No hay pagos pendientes este mes.</p>
                </div>
              ) : (
                <>
                  {inmediatos.length > 0 && (
                    <Seccion titulo="Urgentes">
                      {inmediatos.slice(0, 5).map(item => <ReminderRow key={item.id} item={item} onNavigate={closePanel} />)}
                    </Seccion>
                  )}

                  {masTarde.length > 0 && (
                    <Seccion titulo="Más adelante">
                      {masTarde.slice(0, inmediatos.length > 0 ? 3 : 5).map(item => <ReminderRow key={item.id} item={item} onNavigate={closePanel} />)}
                    </Seccion>
                  )}

                  {sinFecha.length > 0 && (
                    <Seccion titulo="Les falta fecha">
                      {sinFecha.slice(0, 4).map(item => <MissingDateRow key={item.id} item={item} onNavigate={closePanel} />)}
                    </Seccion>
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
