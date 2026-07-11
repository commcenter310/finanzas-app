export default function ConfirmModal({ open, titulo, descripcion, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-backdrop-in">
      <div className="card p-6 w-full max-w-sm shadow-xl animate-modal-in">
        <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--fg-1)' }}>{titulo}</h3>
        {descripcion && (
          <p className="text-sm mb-5" style={{ color: 'var(--fg-3)' }}>{descripcion}</p>
        )}
        <div className="flex gap-2 justify-end">
          <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button
            className="btn-primary"
            style={{ background: 'var(--negative)', boxShadow: 'none' }}
            onClick={onConfirm}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}
