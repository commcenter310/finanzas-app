import { NavLink } from 'react-router-dom'
import { BarChart3, ListChecks } from 'lucide-react'

export function SpendingNav() {
  return (
    <nav className="spending-nav" aria-label="Centro de gastos">
      <NavLink to="/control-gastos" className={({ isActive }) => `spending-nav-item ${isActive ? 'is-active' : ''}`}>
        <ListChecks aria-hidden="true" />
        <span>Movimientos</span>
      </NavLink>
      <NavLink to="/gastos-variables" className={({ isActive }) => `spending-nav-item ${isActive ? 'is-active' : ''}`}>
        <BarChart3 aria-hidden="true" />
        <span>Presupuesto</span>
      </NavLink>
    </nav>
  )
}

export function SpendingOverview({
  eyebrow,
  title,
  description,
  amountLabel,
  amount,
  progress,
  progressLabel,
  progressEnd,
  tone = 'primary',
  loading = false,
  metrics,
  aside,
}) {
  const safeProgress = Math.max(0, Math.min(Number(progress) || 0, 100))

  return (
    <section className="spending-overview">
      <div className="spending-overview-main">
        <div className="spending-overview-copy">
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <span>{description}</span>
        </div>

        <div className={`spending-overview-amount tone-${tone}`}>
          <span>{amountLabel}</span>
          {loading ? <i className="spending-overview-skeleton is-amount" /> : <strong>{amount}</strong>}
        </div>

        {(progressLabel || progressEnd) && (
          <div className="spending-overview-progress">
            {loading ? (
              <i className="spending-overview-skeleton is-progress" />
            ) : (
              <>
                <div>
                  <span>{progressLabel}</span>
                  <strong>{progressEnd}</strong>
                </div>
                <div className={`spending-overview-track tone-${tone}`}>
                  <span style={{ width: `${safeProgress}%` }} />
                </div>
              </>
            )}
          </div>
        )}

        {metrics && (
          <div className={`spending-overview-metrics ${loading ? 'is-loading' : ''}`}>
            {loading
              ? Array.from({ length: 3 }, (_, index) => <i key={index} className="spending-overview-skeleton is-metric" />)
              : metrics}
          </div>
        )}
      </div>
      <aside className="spending-overview-aside">
        {loading ? <i className="spending-overview-skeleton is-signal" /> : aside}
      </aside>
    </section>
  )
}

export function SpendingMetric({ icon: Icon, label, value, tone = 'neutral' }) {
  return (
    <div className={`spending-metric tone-${tone}`}>
      <span className="spending-metric-icon">{Icon && <Icon aria-hidden="true" />}</span>
      <span className="spending-metric-copy">
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  )
}

export function SpendingSignal({ icon: Icon, label, title, description, action, tone = 'primary' }) {
  return (
    <div className={`spending-signal tone-${tone}`}>
      <span className="spending-signal-icon">{Icon && <Icon aria-hidden="true" />}</span>
      <div className="spending-signal-copy">
        <small>{label}</small>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
        {action && <div className="spending-signal-action">{action}</div>}
      </div>
    </div>
  )
}
