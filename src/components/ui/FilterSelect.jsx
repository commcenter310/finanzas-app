import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * FilterSelect — dropdown estilizado con tokens Finni.
 * Reemplaza el <select> nativo para filtros y selects de clasificación.
 *
 * Props:
 *   value        — valor seleccionado actualmente
 *   onChange(v)  — callback con el nuevo valor
 *   options      — [{ value, label, dotColor?, icon? }]
 *   placeholder  — texto cuando value está vacío (default "Todas")
 *   className    — clases extra para el trigger
 */
export default function FilterSelect({ value, onChange, options, placeholder = 'Todas', className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => String(o.value) === String(value))

  return (
    <div className={`relative ${className}`} ref={ref}>

      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="input text-sm flex items-center justify-between gap-2 cursor-pointer w-full select-none"
        style={open ? { borderColor: 'var(--primary)', boxShadow: 'var(--ring-focus)' } : {}}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              {selected.dotColor && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: selected.dotColor }}
                />
              )}
              {selected.icon && (
                <span className="flex-shrink-0 text-sm leading-none">{selected.icon}</span>
              )}
              <span className="truncate" style={{ color: 'var(--fg-1)' }}>{selected.label}</span>
            </>
          ) : (
            <span className="truncate" style={{ color: 'var(--fg-4)' }}>{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className="flex-shrink-0 transition-transform duration-200"
          style={{
            width: 15, height: 15,
            color: 'var(--fg-4)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* ── Panel ── */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-30 min-w-full rounded-[var(--r-md)] overflow-x-hidden overflow-y-auto max-h-60"
          style={{
            background:  'var(--surface)',
            border:      '1px solid var(--border)',
            boxShadow:   'var(--shadow-lg)',
          }}
        >
          {/* Opción "Todas" */}
          <DropItem
            label={placeholder}
            active={!value}
            onClick={() => { onChange(''); setOpen(false) }}
          />

          {options.map(opt => (
            <DropItem
              key={opt.value}
              label={opt.label}
              dotColor={opt.dotColor}
              icon={opt.icon}
              active={String(opt.value) === String(value)}
              onClick={() => { onChange(opt.value); setOpen(false) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DropItem({ label, dotColor, icon, active, onClick }) {
  const [hover, setHover] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors"
      style={{
        background: active
          ? 'var(--primary-soft-bg)'
          : hover ? 'var(--surface-2)' : 'transparent',
        color:      active ? 'var(--primary-soft-fg)' : 'var(--fg-2)',
        fontWeight: active ? 600 : 400,
      }}
    >
      {dotColor && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: dotColor }}
        />
      )}
      {icon && (
        <span className="flex-shrink-0 text-sm leading-none">{icon}</span>
      )}
      {!dotColor && !icon && (
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--fg-4)' }} />
      )}
      {label}
      {active && (
        <span className="ml-auto text-xs" style={{ color: 'var(--primary-soft-fg)' }}>✓</span>
      )}
    </button>
  )
}
