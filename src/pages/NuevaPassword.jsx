import BrandMark from '../components/layout/BrandMark'
import PasswordForm from '../components/auth/PasswordForm'
import { useAuth } from '../context/AuthContext'

// Se muestra al entrar con el enlace de "¿Olvidaste tu contraseña?": antes
// ese enlace iniciaba sesión pero nunca dejaba elegir una contraseña nueva.
export default function NuevaPassword() {
  const { cambiarPassword, signOutLocal } = useAuth()
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-app)' }}>
      <div className="card p-6 w-full" style={{ maxWidth: 420 }}>
        <BrandMark />
        <h1 className="text-xl font-bold mt-5" style={{ color: 'var(--fg-1)' }}>Elige una contraseña nueva</h1>
        <p className="text-sm mt-1 mb-5" style={{ color: 'var(--fg-3)' }}>
          Con ella entrarás a Finni a partir de ahora.
        </p>
        <PasswordForm onGuardar={cambiarPassword} textoBoton="Guardar y entrar" />
        <button type="button" onClick={signOutLocal} className="btn-ghost text-sm mt-3">Cancelar y salir</button>
      </div>
    </div>
  )
}
