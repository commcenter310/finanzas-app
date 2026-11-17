// Envoltorios de Resumen con las props que ya usan Movimientos y Presupuesto.
import Resumen, { Aviso, Dato } from '../ui/Resumen'

const TONO = { primary: 'neutral', warning: 'warning', negative: 'negative' }

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
  const nota = [progressLabel, progressEnd].filter(Boolean).join(' · ')
  return (
    <Resumen
      titulo={title}
      cifra={amount}
      nota={nota || null}
      tono={TONO[tone] ?? 'neutral'}
      progreso={progressLabel || progressEnd ? progress : null}
      desgloses={metrics}
      aviso={aside}
      cargando={loading}
    />
  )
}

export function SpendingMetric({ label, value, tone }) {
  return <Dato label={label} value={value} tone={tone === 'negative' ? 'negative' : 'neutral'} />
}

export function SpendingSignal({ title, description, action, tone }) {
  return <Aviso title={title} description={description} action={action} tone={tone} />
}
