import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import BrandMark from '../components/layout/BrandMark'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [modo, setModo] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleSubmit = async () => {
    setError(''); setInfo('')

    if (modo === 'reset') {
      if (!email) return setError('Ingresa tu correo')
      setLoading(true)
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      })
      setLoading(false)
      if (err) return setError(err.message)
      return setInfo('Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo.')
    }

    if (!email || !password) return setError('Completa todos los campos')
    setLoading(true)

    const { error: err } = modo === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (err) {
      setError(err.message)
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

          <div className="auth-form-fields">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={event => setEmail(event.target.value)}
                onKeyDown={event => event.key === 'Enter' && handleSubmit()}
              />
            </div>

            {modo !== 'reset' && (
              <div>
                <label className="label">Contraseña</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && handleSubmit()}
                />
              </div>
            )}

            {error && <p className="auth-message is-error">{error}</p>}
            {info && <p className="auth-message is-success">{info}</p>}

            <button className="btn-primary auth-submit" onClick={handleSubmit} disabled={loading}>
              <span>{loading ? 'Cargando...' : modo === 'login' ? 'Entrar a Finni' : modo === 'registro' ? 'Crear cuenta' : 'Enviar enlace'}</span>
              {!loading && <ArrowRight />}
            </button>

            {modo === 'login' && (
              <button
                className="auth-text-button"
                onClick={() => { setModo('reset'); setError(''); setInfo('') }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </div>

          <div className="auth-form-footer">
            {modo === 'reset' ? (
              <button onClick={() => { setModo('login'); setError(''); setInfo('') }}>
                <ArrowLeft /> Volver al inicio de sesión
              </button>
            ) : (
              <p>
                {modo === 'login' ? '¿Primera vez en Finni?' : '¿Ya tienes cuenta?'}{' '}
                <button onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError(''); setInfo('') }}>
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
