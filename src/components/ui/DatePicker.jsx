import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const DIAS  = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// YYYY-MM-DD → Date (sin desfase de zona horaria)
function parseISO(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Date → YYYY-MM-DD
function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// YYYY-MM-DD → dd/mm/aaaa
function formatDisplay(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

function sameDay(a, b) {
  return a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
}

/**
 * DatePicker — selector de fecha con tokens Finni.
 * Props:
 *   value        YYYY-MM-DD string o ''
 *   onChange(v)  callback con YYYY-MM-DD
 *   className    clases extra para el wrapper
 *   placeholder  texto vacío (default "dd/mm/aaaa")
 */
export default function DatePicker({ value, onChange, className = '', placeholder = 'dd/mm/aaaa' }) {
  const [open, setOpen] = useState(false)
  const ref  = useRef(null)
  const today    = new Date()
  const selected = parseISO(value)

  const initDate = selected ?? today
  const [viewMonth, setViewMonth] = useState(initDate.getMonth())
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear())

  // Cerrar al hacer click fuera
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Sincronizar vista si cambia value externamente
  useEffect(() => {
    if (selected) { setViewMonth(selected.getMonth()); setViewYear(selected.getFullYear()) }
  }, [value]) // eslint-disable-line

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Construir celdas del calendario (6 filas × 7 cols = 42)
  const firstWeekday  = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth   = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrev    = new Date(viewYear, viewMonth, 0).getDate()

  const cells = []
  for (let i = firstWeekday - 1; i >= 0; i--)
    cells.push({ n: daysInPrev - i, cur: false, date: new Date(viewYear, viewMonth - 1, daysInPrev - i) })
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ n: d, cur: true, date: new Date(viewYear, viewMonth, d) })
  while (cells.length < 42)
    cells.push({ n: cells.length - firstWeekday - daysInMonth + 1, cur: false, date: new Date(viewYear, viewMonth + 1, cells.length - firstWeekday - daysInMonth + 1) })

  const pick = (date) => { onChange(toISO(date)); setOpen(false) }

  return (
    <div className={`relative ${className}`} ref={ref}>

      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="input text-sm flex items-center justify-between gap-2 w-full cursor-pointer select-none"
        style={open ? { borderColor: 'var(--primary)', boxShadow: 'var(--ring-focus)' } : {}}
      >
        <span style={{ color: value ? 'var(--fg-1)' : 'var(--fg-4)' }}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Calendar style={{ width: 14, height: 14, color: 'var(--fg-4)', flexShrink: 0 }} />
      </button>

      {/* ── Panel ── */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-40 p-3 rounded-[var(--r-lg)]"
          style={{
            width: 272,
            background:  'var(--surface)',
            border:      '1px solid var(--border)',
            boxShadow:   'var(--shadow-xl)',
          }}
        >
          {/* Navegación mes */}
          <div className="flex items-center justify-between mb-2.5">
            <NavBtn onClick={prevMonth}><ChevronLeft style={{ width: 15, height: 15 }} /></NavBtn>
            <span className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
              {MESES[viewMonth]} {viewYear}
            </span>
            <NavBtn onClick={nextMonth}><ChevronRight style={{ width: 15, height: 15 }} /></NavBtn>
          </div>

          {/* Cabecera días */}
          <div className="grid grid-cols-7 mb-1">
            {DIAS.map(d => (
              <div key={d} className="text-center text-[11px] font-bold py-1 uppercase"
                style={{ color: 'var(--fg-4)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Celdas */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((cell, i) => {
              const isSel  = sameDay(cell.date, selected)
              const isTod  = sameDay(cell.date, today)
              return (
                <DayBtn
                  key={i}
                  n={cell.n}
                  cur={cell.cur}
                  selected={isSel}
                  today={isTod}
                  onClick={() => pick(cell.date)}
                />
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-2.5 pt-2.5"
            style={{ borderTop: '1px solid var(--divider)' }}>
            <FootBtn
              label="Borrar"
              color="var(--fg-3)"
              hoverBg="var(--surface-2)"
              onClick={() => { onChange(''); setOpen(false) }}
            />
            <FootBtn
              label="Hoy"
              color="var(--primary)"
              hoverBg="var(--primary-soft-bg)"
              onClick={() => pick(today)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Sub-componentes ─────────────────────────────────────────────────────── */

function NavBtn({ onClick, children }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="w-7 h-7 rounded-[var(--r-sm)] flex items-center justify-center transition-colors"
      style={{ color: 'var(--fg-3)', background: hover ? 'var(--surface-2)' : '' }}
    >
      {children}
    </button>
  )
}

function DayBtn({ n, cur, selected, today, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center justify-center rounded-[var(--r-sm)] text-xs transition-all"
      style={{
        aspectRatio: '1',
        fontWeight: selected || today ? 700 : 400,
        color: selected
          ? '#fff'
          : !cur   ? 'var(--fg-4)'
          : today  ? 'var(--primary)'
          :          'var(--fg-1)',
        background: selected
          ? 'var(--primary)'
          : hover ? 'var(--surface-3)' : '',
        outline:    today && !selected ? '2px solid var(--primary-200)' : '',
        outlineOffset: '-2px',
      }}
    >
      {n}
    </button>
  )
}

function FootBtn({ label, color, hoverBg, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="text-xs font-semibold px-2.5 py-1 rounded-[var(--r-sm)] transition-colors"
      style={{ color, background: hover ? hoverBg : '' }}
    >
      {label}
    </button>
  )
}
