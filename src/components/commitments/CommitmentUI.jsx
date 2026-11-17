import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, X } from 'lucide-react'
import Resumen, { Aviso, Dato } from '../ui/Resumen'

// Envoltorios de Resumen con las props que ya usan Deudas y Tarjetas.
export function CommitmentHero({ title, amount, aside, children }) {
  return <Resumen titulo={title} cifra={amount} desgloses={children} aviso={aside} />
}

export function HeroMetric({ label, value, tone }) {
  return <Dato label={label} value={value} tone={tone === 'negative' ? 'negative' : 'neutral'} />
}

export function PriorityPanel({ title, description, action, tone }) {
  return <Aviso title={title} description={description} action={action} tone={tone} />
}

export function StatusPill({ tone = 'neutral', icon: Icon, children }) {
  return (
    <span className={`commitment-pill tone-${tone}`}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </span>
  )
}

export function ProgressRail({ value, marker, tone = 'primary', label, endLabel }) {
  const safeValue = Math.max(0, Math.min(Number(value) || 0, 100))
  return (
    <div className="commitment-progress">
      {(label || endLabel) && (
        <div className="commitment-progress-labels">
          <span>{label}</span>
          <strong>{endLabel}</strong>
        </div>
      )}
      <div className="commitment-progress-track">
        <div className={`commitment-progress-fill tone-${tone}`} style={{ width: `${safeValue}%` }} />
        {marker != null && (
          <span className="commitment-progress-marker" style={{ left: `${Math.max(0, Math.min(marker, 100))}%` }} />
        )}
      </div>
    </div>
  )
}

export function SegmentedControl({ value, options, onChange, ariaLabel }) {
  return (
    <div className="commitment-segments" role="tablist" aria-label={ariaLabel}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={value === option.value ? 'is-active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.icon && <option.icon aria-hidden="true" />}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Sheet({ open, onClose, title, description, children, footer }) {
  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    const handleKey = event => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="commitment-sheet-layer" role="presentation">
      <button className="commitment-sheet-backdrop" type="button" onClick={onClose} aria-label="Cerrar panel" />
      <section className="commitment-sheet" role="dialog" aria-modal="true" aria-labelledby="commitment-sheet-title">
        <header className="commitment-sheet-header">
          <div>
            <h2 id="commitment-sheet-title">{title}</h2>
            {description && <span>{description}</span>}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="commitment-sheet-body">{children}</div>
        {footer && <footer className="commitment-sheet-footer">{footer}</footer>}
      </section>
    </div>,
    document.body
  )
}

export function TextAction({ children, icon: Icon = ArrowRight, ...props }) {
  return (
    <button type="button" className="commitment-text-action" {...props}>
      <span>{children}</span>
      <Icon aria-hidden="true" />
    </button>
  )
}
