/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle2, XCircle, Info } from 'lucide-react'

/* ── Context ───────────────────────────────────────────────────────────────── */
const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  // opciones.accion = { etiqueta, onClick }: agrega un botón (p. ej. "Deshacer").
  // Con acción el aviso dura más (8 s) para dar tiempo a usarla.
  const show = useCallback((message, type = 'success', opciones = {}) => {
    const id = Date.now() + Math.random()
    const { accion = null, duracion = accion ? 8000 : 3500 } = opciones
    setToasts(prev => [...prev, { id, message, type, accion }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duracion)
  }, [])

  const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {/* Stack — bottom-center, apila hacia arriba */}
      <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse gap-2 items-center pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/** `const toast = useToast()` → `toast('Mensaje', 'success' | 'error' | 'info', { accion: { etiqueta, onClick } })` */
export const useToast = () => useContext(ToastCtx)

/* ── Configuración por tipo ────────────────────────────────────────────────── */
const CFG = {
  success: { bg: 'var(--ahorro)',   Icon: CheckCircle2 },
  error:   { bg: 'var(--negative)', Icon: XCircle      },
  info:    { bg: 'var(--primary)',  Icon: Info          },
}

/* ── Item individual ───────────────────────────────────────────────────────── */
function ToastItem({ message, type, accion, onDismiss }) {
  const [visible, setVisible] = useState(false)
  const { bg, Icon } = CFG[type] ?? CFG.info

  // Trigger de animación de entrada en el siguiente frame
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      className="pointer-events-auto flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 rounded-full text-white text-sm font-semibold"
      style={{
        background:  bg,
        boxShadow:   'var(--shadow-lg)',
        maxWidth:    'min(520px, calc(100vw - 24px))',
        transition:  'opacity 280ms ease, transform 280ms var(--ease-out)',
        opacity:     visible ? 1 : 0,
        transform:   visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.94)',
        whiteSpace:  'normal',
      }}
    >
      <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
      {message}
      {accion && (
        <button
          type="button"
          onClick={() => { onDismiss?.(); accion.onClick() }}
          className="ml-1 underline underline-offset-2 font-bold whitespace-nowrap"
          style={{ color: 'inherit' }}
        >
          {accion.etiqueta}
        </button>
      )}
    </div>
  )
}
