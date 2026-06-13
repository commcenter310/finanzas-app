import { AlertTriangle, RotateCw } from 'lucide-react'

// Estado de error reutilizable: se muestra cuando una consulta a Supabase falla,
// en vez de dejar la página en skeleton infinito o vacía sin explicación.
export default function ErrorState({ onRetry, mensaje }) {
  return (
    <div className="card p-8 flex flex-col items-center text-center gap-3">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: 'var(--negative-bg)' }}
      >
        <AlertTriangle className="w-6 h-6" style={{ color: 'var(--negative-fg)' }} />
      </div>
      <div>
        <p className="font-bold" style={{ color: 'var(--fg-1)' }}>No se pudieron cargar los datos</p>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-3)' }}>
          {mensaje || 'Revisa tu conexión e intenta de nuevo.'}
        </p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary flex items-center gap-2 text-sm mt-1">
          <RotateCw className="w-4 h-4" /> Reintentar
        </button>
      )}
    </div>
  )
}
