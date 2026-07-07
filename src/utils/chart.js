export const chartAxisTick = {
  fill: 'var(--fg-3)',
  fontSize: 11,
  fontWeight: 600,
}

export const chartAxisProps = {
  axisLine: false,
  tickLine: false,
  tick: chartAxisTick,
}

export const chartGridProps = {
  stroke: 'var(--divider)',
  strokeDasharray: '4 8',
  vertical: false,
}

export function formatCompactCurrency(value) {
  const amount = Number(value ?? 0)
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${Math.round(amount / 1_000)}k`
  return `$${Math.round(amount)}`
}
