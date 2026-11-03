// Panel superior del Dashboard: disponible, métricas del mes y consejos.
import { ArrowUpRight, Gauge, PiggyBank, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatMXN } from '../../utils/constantes'

export function OverviewSkeleton() {
  return (
    <div className="dashboard-overview">
      <div className="dashboard-balance animate-pulse">
        <div className="h-3 rounded w-28" style={{ background: 'rgba(255,255,255,.14)' }} />
        <div className="h-12 rounded w-52 mt-7" style={{ background: 'rgba(255,255,255,.14)' }} />
        <div className="h-20 rounded mt-10" style={{ background: 'rgba(255,255,255,.08)' }} />
      </div>
      <div className="dashboard-focus-panel animate-pulse">
        <div className="h-4 rounded w-32" style={{ background: 'var(--surface-3)' }} />
        <div className="h-28 rounded mt-5" style={{ background: 'var(--surface-2)' }} />
        <div className="h-16 rounded mt-3" style={{ background: 'var(--surface-2)' }} />
      </div>
    </div>
  )
}

function OverviewMetric({ icon: Icon, label, value, tone }) {
  return (
    <div className="dashboard-balance-metric">
      <Icon className="w-4 h-4" style={{ color: tone }} strokeWidth={2.1} />
      <div className="min-w-0">
        <p>{label}</p>
        <strong>{formatMXN(value)}</strong>
      </div>
    </div>
  )
}

const INSIGHT_STYLE = {
  danger:  { accent: 'var(--negative)', bg: 'var(--negative-bg)', fg: 'var(--negative-fg)' },
  warning: { accent: 'var(--warning)',  bg: 'var(--warning-bg)',  fg: 'var(--warning-fg)'  },
  success: { accent: 'var(--positive)', bg: 'var(--positive-bg)', fg: 'var(--positive-fg)' },
  info:    { accent: 'var(--primary)',  bg: 'var(--primary-50)',  fg: 'var(--primary-700)' },
}

function InsightCard({ insight, featured = false }) {
  const Icon = insight.icon
  const style = INSIGHT_STYLE[insight.kind] ?? INSIGHT_STYLE.info

  return (
    <Link
      to={insight.to}
      className={`dashboard-insight ${featured ? 'is-featured' : ''}`}
      style={{ '--insight-accent': style.accent, '--insight-bg': style.bg, '--insight-fg': style.fg }}
    >
      <span className="dashboard-insight-icon"><Icon /></span>
      <span className="dashboard-insight-copy">
        <span className="dashboard-insight-title">{insight.title}</span>
        <strong>{insight.value}</strong>
        {featured && <span className="dashboard-insight-body">{insight.body}</span>}
      </span>
      <span className="dashboard-insight-action">
        <span>{featured ? insight.action : ''}</span>
        <ArrowUpRight />
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
        <div className="dashboard-balance-topline">
          <span className="dashboard-balance-status"><Gauge /> Pulso del mes</span>
          <Link to="/tendencias">Ver análisis <ArrowUpRight /></Link>
        </div>

        <div className="dashboard-balance-main">
          <p>Disponible para decidir</p>
          <strong className={!positivo ? 'is-negative' : ''}>
            {disponibleReal == null ? 'Sin ingresos aún' : formatMXN(disponibleReal)}
          </strong>
          <span>
            {totalApartado > 0
              ? `${formatMXN(totalApartado)} ya están protegidos en tu plan.`
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
          <OverviewMetric icon={TrendingUp} label="Ingreso" value={totalIngresos} tone="#79E6BD" />
          <OverviewMetric icon={TrendingDown} label="Gastado" value={totalGastos} tone="#FF9CA8" />
          <OverviewMetric icon={PiggyBank} label="Ahorro" value={ahorro} tone="#8DC7FF" />
        </div>
      </div>

      <div className="dashboard-focus-panel">
        <div className="dashboard-section-heading">
          <div>
            <p>Ahora</p>
            <h2>Tu siguiente mejor movimiento</h2>
          </div>
          <span>{insights.length} prioridad{insights.length !== 1 ? 'es' : ''}</span>
        </div>

        {insights.length > 0 ? (
          <div className="dashboard-insight-list">
            <InsightCard insight={insights[0]} featured />
            {insights.slice(1, 4).map(insight => (
              <InsightCard key={`${insight.title}-${insight.value}`} insight={insight} />
            ))}
          </div>
        ) : (
          <div className="dashboard-focus-empty">
            <Target />
            <div>
              <strong>Todo en orden</strong>
              <p>No hay prioridades urgentes para este mes.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
