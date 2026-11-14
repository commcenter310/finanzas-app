import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { PASSWORD_MIN, traducirErrorAuth, validarPasswordNueva } from '../../utils/erroresAuth'

// Formulario "contraseña nueva + confirmación". Lo usan Configuración
// (cambiar contraseña) y la pantalla de recuperación.
// onGuardar(password) debe devolver { error } (como supabase.auth.updateUser).
export default function PasswordForm({ onGuardar, textoBoton = 'Cambiar contraseña' }) {
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [visible, setVisible] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  const enviar = async (evento) => {
    evento.preventDefault()
    setOk(false)
    const problema = validarPasswordNueva(nueva, confirmacion)
    if (problema) return setError(problema)
    setError('')
    setGuardando(true)
    const { error: fallo } = await onGuardar(nueva)
    setGuardando(false)
    if (fallo) return setError(traducirErrorAuth(fallo))
    setNueva(''); setConfirmacion('')
    setOk(true)
  }

  const tipo = visible ? 'text' : 'password'
  return (
    <form onSubmit={enviar} className="space-y-3" noValidate>
      <div>
        <label className="label" htmlFor="password-nueva">Contraseña nueva</label>
        <div className="relative">
          <input id="password-nueva" type={tipo} className="input pr-10" autoComplete="new-password"
            placeholder={`Mínimo ${PASSWORD_MIN} caracteres`}
            value={nueva} onChange={e => setNueva(e.target.value)} />
          <button type="button" onClick={() => setVisible(v => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ color: 'var(--fg-3)' }}
            aria-label={visible ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}>
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="password-confirmacion">Repite la contraseña</label>
        <input id="password-confirmacion" type={tipo} className="input" autoComplete="new-password"
          value={confirmacion} onChange={e => setConfirmacion(e.target.value)} />
      </div>
      {error && <p className="text-sm font-medium" role="alert" style={{ color: 'var(--negative-fg)' }}>{error}</p>}
      {ok && <p className="text-sm font-medium" role="status" style={{ color: 'var(--positive-fg)' }}>Contraseña actualizada ✅</p>}
      <button type="submit" className="btn-primary text-sm" disabled={guardando}>
        {guardando ? 'Guardando…' : textoBoton}
      </button>
    </form>
  )
}
