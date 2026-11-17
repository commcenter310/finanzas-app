export function SpendingOverview({
  title,
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
          <h1>{title}</h1>
        </div>

        <div className={`spending-overview-amount tone-${tone}`}>
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

export function SpendingMetric({ label, value, tone = 'neutral' }) {
  return (
    <div className={`spending-metric tone-${tone}`}>
      <span className="spending-metric-copy">
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  )
}

export function SpendingSignal({ title, description, action, tone = 'primary' }) {
  return (
    <div className={`spending-signal tone-${tone}`}>
      <div className="spending-signal-copy">
        <strong>{title}</strong>
        {description && <p>{description}</p>}
        {action && <div className="spending-signal-action">{action}</div>}
      </div>
    </div>
  )
}
