// Panel superior del Dashboard: disponible, métricas del mes y pendientes.
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatMXN } from '../../utils/constantes'

export function OverviewSkeleton() {
  return (
    <div className="dashboard-overview">
      <div className="dashboard-balance animate-pulse">
        <div className="h-3 rounded w-28" style={{ background: 'var(--surface-3)' }} />
        <div className="h-12 rounded w-52 mt-5" style={{ background: 'var(--surface-3)' }} />
        <div className="h-16 rounded mt-10" style={{ background: 'var(--surface-2)' }} />
      </div>
      <div className="dashboard-focus-panel animate-pulse">
        <div className="h-4 rounded w-32" style={{ background: 'var(--surface-3)' }} />
        <div className="h-20 rounded mt-5" style={{ background: 'var(--surface-2)' }} />
        <div className="h-12 rounded mt-3" style={{ background: 'var(--surface-2)' }} />
      </div>
    </div>
  )
}

function OverviewMetric({ label, value }) {
  return (
    <div className="dashboard-balance-metric">
      <p>{label}</p>
      <strong>{formatMXN(value)}</strong>
    </div>
  )
}

const INSIGHT_COLOR = {
  danger:  'var(--negative)',
  warning: 'var(--warning)',
  success: 'var(--positive)',
  info:    'var(--fg-4)',
}

function InsightRow({ insight, featured = false }) {
  return (
    <Link
      to={insight.to}
      className={`dashboard-insight ${featured ? 'is-featured' : ''}`}
      style={{ '--insight-accent': INSIGHT_COLOR[insight.kind] ?? INSIGHT_COLOR.info }}
    >
      <span className="dashboard-insight-dot" aria-hidden="true" />
      <span className="dashboard-insight-copy">
        <span className="dashboard-insight-title">{insight.title}</span>
        <strong>{insight.value}</strong>
        {featured && <span className="dashboard-insight-body">{insight.body}</span>}
      </span>
      <span className="dashboard-insight-action">
        {featured && <span>{insight.action}</span>}
        <ArrowRight />
      </span>
    </Link>
  )
}

export default function DashboardOverview({ totalIngresos, totalGastos, porAsignar, totalApartado, ahorro, insights }) {
  const disponibleReal = porAsignar == null ? null : porAsignar - totalApartado
  const consumoPct = totalIngresos > 0 ? Math.min((totalGastos / totalIngresos) * 100, 100) : 0
  const positivo = disponibleReal == null || disponibleReal >= 0

  return (
    <section className="dashboard-overview">
      <div className="dashboard-balance">
        <div className="dashboard-balance-main">
          <p>Disponible este mes</p>
          <strong className={!positivo ? 'is-negative' : ''}>
            {disponibleReal == null ? 'Sin ingresos aún' : formatMXN(disponibleReal)}
          </strong>
          <span>
            {totalApartado > 0
              ? `Ya descuenta ${formatMXN(totalApartado)} apartados en tu plan de quincena.`
              : 'Lo que queda después de tus gastos y compromisos registrados.'}
          </span>
        </div>

        <div className="dashboard-balance-progress">
          <div className="flex items-center justify-between gap-3">
            <span>Ingreso utilizado</span>
            <strong>{totalIngresos > 0 ? `${Math.round(consumoPct)}%` : '--'}</strong>
          </div>
          <div className="dashboard-balance-track">
            <span style={{ width: `${consumoPct}%` }} />
          </div>
        </div>

        <div className="dashboard-balance-metrics">
          <OverviewMetric label="Ingresos" value={totalIngresos} />
          <OverviewMetric label="Gastado" value={totalGastos} />
          <OverviewMetric label="Ahorrado" value={ahorro} />
        </div>
      </div>

      <div className="dashboard-focus-panel">
        <div className="dashboard-section-heading">
          <h2>Por atender</h2>
          {insights.length > 0 && <span>{insights.length}</span>}
        </div>

        {insights.length > 0 ? (
          <div className="dashboard-insight-list">
            <InsightRow insight={insights[0]} featured />
            {insights.slice(1, 4).map(insight => (
              <InsightRow key={`${insight.title}-${insight.value}`} insight={insight} />
            ))}
          </div>
        ) : (
          <div className="dashboard-focus-empty">
            <strong>Todo en orden</strong>
            <p>No hay nada urgente este mes.</p>
          </div>
        )}
      </div>
    </section>
  )
}
