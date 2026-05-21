import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [modo, setModo] = useState('login') // 'login' | 'registro'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email || !password) return setError('Completa todos los campos')
    setLoading(true)
    setError('')

    const { error: err } = modo === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        {/* Logo / Título */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-700 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl">₱</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Finanzas</h1>
          <p className="text-gray-500 text-sm mt-1">
            {modo === 'login' ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta'}
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
          <div>
            <label className="label">Contraseña</label>
            <input type="password" className="input" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{error}</p>}

          <button className="btn-primary w-full py-3" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Cargando...' : modo === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          {modo === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button className="text-primary-700 font-semibold hover:underline"
            onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError('') }}>
            {modo === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  )
}
