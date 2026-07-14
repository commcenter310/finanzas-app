import { Sparkles } from 'lucide-react'

export default function BrandMark({ compact = false, inverse = false }) {
  return (
    <div className={`brand-lockup ${compact ? 'is-compact' : ''} ${inverse ? 'is-inverse' : ''}`}>
      <span className="brand-symbol" aria-hidden="true">
        <span className="brand-symbol-letter">F</span>
        <Sparkles className="brand-symbol-spark" strokeWidth={2.4} />
      </span>
      {!compact && (
        <span className="brand-wordmark">
          <span className="brand-name">Finni</span>
          <span className="brand-tagline">Tu dinero, con dirección</span>
        </span>
      )}
    </div>
  )
}
