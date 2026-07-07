import { formatMXN } from '../../utils/constantes'

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  nameMap = {},
  valueFormatter = formatMXN,
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="chart-tooltip">
      {label != null && (
        <div className="chart-tooltip__label">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="chart-tooltip__rows">
        {payload
          .filter(item => item.value != null)
          .map(item => {
            const rawName = item.name ?? item.dataKey
            const name = nameMap[rawName] ?? nameMap[item.dataKey] ?? rawName
            const color = item.color ?? item.fill ?? item.stroke ?? 'var(--primary)'
            return (
              <div className="chart-tooltip__row" key={`${item.dataKey}-${rawName}`}>
                <span className="chart-dot" style={{ background: color }} />
                <span className="chart-tooltip__name">{name}</span>
                <span className="chart-tooltip__value">
                  {valueFormatter(item.value, rawName, item)}
                </span>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export function ChartLegend({ payload = [], nameMap = {} }) {
  const seen = new Set()
  const items = payload.filter(item => {
    const key = item.dataKey ?? item.value
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (!items.length) return null

  return (
    <div className="chart-legend">
      {items.map(item => {
        const rawName = item.value ?? item.dataKey
        const name = nameMap[rawName] ?? nameMap[item.dataKey] ?? rawName
        const color = item.color ?? item.payload?.stroke ?? item.payload?.fill ?? 'var(--primary)'
        return (
          <span className="chart-legend__item" key={`${item.dataKey ?? rawName}`}>
            <span className="chart-dot" style={{ background: color }} />
            {name}
          </span>
        )
      })}
    </div>
  )
}

export function ChartEmptyState({ children = 'Sin datos para graficar' }) {
  return (
    <div className="chart-empty">
      {children}
    </div>
  )
}
