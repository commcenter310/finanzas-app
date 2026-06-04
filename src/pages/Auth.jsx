import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [modo, setModo] = useState('login') // 'login' | 'registro' | 'reset'
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

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        {/* Logo / Título */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-[13px] flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--grad-primary)', boxShadow: 'var(--shadow-primary)' }}>
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg-1)' }}>Finni Apoyo</h1>
          <p className="text-gray-500 text-sm mt-1">
            {modo === 'login' ? 'Inicia sesión en tu cuenta' : modo === 'registro' ? 'Crea tu cuenta' : 'Recupera tu contraseña'}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="correo@ejemplo.com"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          {modo !== 'reset' && (
            <div>
              <label className="label">Contraseña</label>
              <input type="password" className="input" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
          )}

          {error && <p className="text-sm rounded-lg p-3" style={{ color: 'var(--negative-fg)', background: 'var(--negative-bg)' }}>{error}</p>}
          {info  && <p className="text-sm rounded-lg p-3" style={{ color: 'var(--positive-fg)', background: 'var(--positive-bg)' }}>{info}</p>}

          <button className="btn-primary w-full py-3" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Cargando...' : modo === 'login' ? 'Iniciar Sesión' : modo === 'registro' ? 'Crear Cuenta' : 'Enviar enlace'}
          </button>

          {modo === 'login' && (
            <button className="w-full text-center text-sm hover:underline" style={{ color: 'var(--fg-3)' }}
              onClick={() => { setModo('reset'); setError(''); setInfo('') }}>
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          {modo === 'reset'
            ? <button className="text-primary-700 font-semibold hover:underline"
                onClick={() => { setModo('login'); setError(''); setInfo('') }}>
                ← Volver al inicio de sesión
              </button>
            : <>
                {modo === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                <button className="text-primary-700 font-semibold hover:underline"
                  onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError('') }}>
                  {modo === 'login' ? 'Regístrate' : 'Inicia sesión'}
                </button>
              </>
          }
        </p>
      </div>
    </div>
  )
}
