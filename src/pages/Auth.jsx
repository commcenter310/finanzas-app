import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import BrandMark from '../components/layout/BrandMark'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { PASSWORD_MIN, traducirErrorAuth } from '../utils/erroresAuth'
import { hayEnlaceInvalido, olvidarEnlaceInvalido } from '../utils/urlInicial'

export default function Auth() {
  const navigate = useNavigate()
  const { user, loading: cargandoSesion } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [modo, setModo] = useState('login')
  const [loading, setLoading] = useState(false)
  // Enlace del correo (confirmación o recuperación) vencido o ya usado
  const [error, setError] = useState(hayEnlaceInvalido() ? 'El enlace expiró o ya se usó. Solicita uno nuevo.' : '')
  const [info, setInfo] = useState('')

  const handleSubmit = async (evento) => {
    evento.preventDefault()
    olvidarEnlaceInvalido()
    setError(''); setInfo('')

    if (modo === 'reset') {
      if (!email) return setError('Ingresa tu correo')
      setLoading(true)
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      })
      setLoading(false)
      if (err) return setError(traducirErrorAuth(err))
      return setInfo('Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo.')
    }

    if (!email || !password) return setError('Completa todos los campos')
    if (modo === 'registro' && password.length < PASSWORD_MIN) {
      return setError(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`)
    }
    setLoading(true)

    const { error: err } = modo === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (err) {
      setError(traducirErrorAuth(err))
    } else if (modo === 'login') {
      navigate('/')
    } else {
      setInfo('Cuenta creada. Revisa tu correo para confirmar.')
    }
    setLoading(false)
  }

  const title = modo === 'login'
    ? 'Bienvenido de vuelta'
    : modo === 'registro'
      ? 'Empieza con claridad'
      : 'Recupera tu acceso'

  const subtitle = modo === 'login'
    ? 'Tu panorama financiero está listo.'
    : modo === 'registro'
      ? 'Crea tu espacio personal en Finni.'
      : 'Te enviaremos un enlace seguro a tu correo.'

  // Con sesión abierta no tiene sentido mostrar el login
  if (!cargandoSesion && user) return <Navigate to="/" replace />

  return (
    <div className="auth-shell">
      <aside className="auth-brand-panel">
        <BrandMark inverse />

        <div className="auth-statement">
          <span>Finanzas personales, sin ruido</span>
          <h1>Cada peso.<br />Una dirección.</h1>
          <p>Control claro para tomar decisiones con calma y avanzar con intención.</p>
        </div>

        <div className="auth-rhythm" aria-hidden="true">
          {[
            ['01', 'Observa', '100%'],
            ['02', 'Decide', '72%'],
            ['03', 'Avanza', '86%'],
          ].map(([number, label, width]) => (
            <div key={number} className="auth-rhythm-row">
              <span>{number}</span>
              <strong>{label}</strong>
              <i><b style={{ width }} /></i>
            </div>
          ))}
        </div>

        <div className="auth-privacy"><ShieldCheck /> Espacio privado y personal</div>
      </aside>

      <main className="auth-form-panel">
        <div className="auth-mobile-brand"><BrandMark /></div>
        <div className="auth-form-wrap">
          <div className="auth-form-heading">
            <span>Acceso a Finni</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          {/* <form>: Enter envía, y los gestores de contraseñas lo reconocen */}
          <form className="auth-form-fields" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="label" htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                className="input"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={event => setEmail(event.target.value)}
              />
            </div>

            {modo !== 'reset' && (
              <div>
                <label className="label" htmlFor="auth-password">Contraseña</label>
                <input
                  id="auth-password"
                  type="password"
                  name="password"
                  autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                  className="input"
                  placeholder={modo === 'registro' ? `Mínimo ${PASSWORD_MIN} caracteres` : '••••••••'}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                />
              </div>
            )}

            {error && <p className="auth-message is-error" role="alert">{error}</p>}
            {info && <p className="auth-message is-success" role="status">{info}</p>}

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              <span>{loading ? 'Cargando...' : modo === 'login' ? 'Entrar a Finni' : modo === 'registro' ? 'Crear cuenta' : 'Enviar enlace'}</span>
              {!loading && <ArrowRight />}
            </button>

            {modo === 'login' && (
              <button
                type="button"
                className="auth-text-button"
                onClick={() => { setModo('reset'); setError(''); setInfo('') }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </form>

          <div className="auth-form-footer">
            {modo === 'reset' ? (
              <button type="button" onClick={() => { setModo('login'); setError(''); setInfo('') }}>
                <ArrowLeft /> Volver al inicio de sesión
              </button>
            ) : (
              <p>
                {modo === 'login' ? '¿Primera vez en Finni?' : '¿Ya tienes cuenta?'}{' '}
                <button type="button" onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError(''); setInfo('') }}>
                  {modo === 'login' ? 'Crea tu cuenta' : 'Inicia sesión'}
                </button>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
