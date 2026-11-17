const chartAxisTick = {
  fill: 'var(--fg-3)',
  fontSize: 12,
}

export const chartAxisProps = {
  axisLine: false,
  tickLine: false,
  tick: chartAxisTick,
}

export const chartGridProps = {
  stroke: 'var(--divider)',
  strokeDasharray: '2 4',
  vertical: false,
}

export function formatCompactCurrency(value) {
  const amount = Number(value ?? 0)
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${Math.round(amount / 1_000)}k`
  return `$${Math.round(amount)}`
}
