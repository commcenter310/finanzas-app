import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { ArrowRight, CreditCard, Landmark, X } from 'lucide-react'

export function CommitmentNav() {
  return (
    <nav className="commitment-nav" aria-label="Centro de compromisos">
      <NavLink to="/deudas" className={({ isActive }) => `commitment-nav-item ${isActive ? 'is-active' : ''}`}>
        <Landmark aria-hidden="true" />
        <span>Deudas</span>
      </NavLink>
      <NavLink to="/creditos" className={({ isActive }) => `commitment-nav-item ${isActive ? 'is-active' : ''}`}>
        <CreditCard aria-hidden="true" />
        <span>Créditos</span>
      </NavLink>
    </nav>
  )
}

export function CommitmentHero({
  eyebrow,
  title,
  description,
  amountLabel,
  amount,
  aside,
  children,
}) {
  return (
    <section className="commitment-hero">
      <div className="commitment-hero-main">
        <div>
          <p className="commitment-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="commitment-hero-description">{description}</p>
        </div>
        <div className="commitment-hero-balance">
          <span>{amountLabel}</span>
          <strong>{amount}</strong>
        </div>
        {children && <div className="commitment-hero-metrics">{children}</div>}
      </div>
      <aside className="commitment-hero-aside">{aside}</aside>
    </section>
  )
}

export function HeroMetric({ icon: Icon, label, value, tone = 'default' }) {
  return (
    <div className={`commitment-hero-metric tone-${tone}`}>
      {Icon && <Icon aria-hidden="true" />}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

export function PriorityPanel({ icon: Icon, label = 'Prioridad ahora', title, description, action, tone = 'primary' }) {
  return (
    <div className={`commitment-priority tone-${tone}`}>
      <div className="commitment-priority-icon">{Icon && <Icon aria-hidden="true" />}</div>
      <div className="commitment-priority-copy">
        <span>{label}</span>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="commitment-priority-action">{action}</div>}
    </div>
  )
}

export function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="commitment-section-header">
      <div>
        {eyebrow && <p>{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <span>{description}</span>}
      </div>
      {action && <div className="commitment-section-action">{action}</div>}
    </div>
  )
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

export function Sheet({ open, onClose, title, description, eyebrow = 'Centro de compromisos', children, footer }) {
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
            <p>{eyebrow}</p>
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
