import { useState, useRef, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search } from 'lucide-react'
import { useFloatingPosition } from './useFloatingPosition'
import { filtrarOpciones, normalizarBusqueda } from './filterSelectUtils'

export default function FilterSelect({
  value,
  onChange,
  options,
  placeholder = 'Todas',
  className = '',
  showClear = true,
  searchable = false,
  searchPlaceholder = 'Buscar opción',
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const searchRef = useRef(null)
  const listId = useId()
  const floatingStyle = useFloatingPosition({ open, triggerRef, panelRef, maxHeight: searchable ? 300 : 240 })

  useEffect(() => {
    const handler = (e) => {
      const target = e.target
      if (ref.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
      setQuery('')
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open || !searchable) return undefined

    const frame = window.requestAnimationFrame(() => searchRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open, searchable])

  const selected = options.find(o => String(o.value) === String(value))
  const filteredOptions = filtrarOpciones(options, query)
  const showClearOption = showClear && (!query || normalizarBusqueda(placeholder).includes(normalizarBusqueda(query)))

  const selectOption = (nextValue) => {
    onChange(nextValue)
    setOpen(false)
    setQuery('')
  }

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (query) setQuery('')
      else {
        setOpen(false)
        setQuery('')
        triggerRef.current?.focus()
      }
    }
    if (event.key === 'Enter' && filteredOptions.length === 1) {
      event.preventDefault()
      selectOption(filteredOptions[0].value)
    }
  }

  const panel = (
    <div
      ref={panelRef}
      className="z-[1000] rounded-[var(--r-md)] overflow-hidden flex flex-col"
      style={{
        ...floatingStyle,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {searchable && (
        <label
          className="flex items-center gap-2 px-3 py-2.5 border-b"
          style={{ borderColor: 'var(--divider)', background: 'var(--surface)' }}
        >
          <Search className="w-4 h-4 flex-shrink-0" aria-hidden="true" style={{ color: 'var(--fg-4)' }} />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            aria-controls={listId}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--fg-1)' }}
          />
        </label>
      )}

      <div id={listId} role="listbox" className="min-h-0 overflow-x-hidden overflow-y-auto">
        {showClearOption && (
          <DropItem
            label={placeholder}
            active={!value}
            onClick={() => selectOption('')}
          />
        )}

        {filteredOptions.map(opt => (
          <DropItem
            key={opt.value}
            label={opt.label}
            dotColor={opt.dotColor}
            icon={opt.icon}
            active={String(opt.value) === String(value)}
            onClick={() => selectOption(opt.value)}
          />
        ))}

        {!showClearOption && filteredOptions.length === 0 && (
          <div className="px-3.5 py-5 text-center text-sm" style={{ color: 'var(--fg-4)' }}>
            Sin resultados
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (open) setQuery('')
          setOpen(current => !current)
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
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

      {open && createPortal(panel, document.body)}
    </div>
  )
}

function DropItem({ label, dotColor, icon, active, onClick }) {
  const [hover, setHover] = useState(false)

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors"
      style={{
        background: active
          ? 'var(--primary-soft-bg)'
          : hover ? 'var(--surface-2)' : 'transparent',
        color: active ? 'var(--primary-soft-fg)' : 'var(--fg-2)',
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
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {active && (
        <span className="ml-auto text-xs" style={{ color: 'var(--primary-soft-fg)' }}>✓</span>
      )}
    </button>
  )
}
