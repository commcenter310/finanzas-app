/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { clearQueryCache } from '../hooks/useSupabaseQuery'
import { conReintentos } from '../utils/reintentos'
import { LLEGO_POR_RECUPERACION } from '../utils/urlInicial'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  // Error de la última carga del perfil (null si salió bien). La UI que
  // escribe en el perfil (Configuración) lo usa para no mostrar un formulario
  // vacío que, al guardarse, borraría nombre y teléfono.
  const [profileError, setProfileError] = useState(null)
  const [loading, setLoading] = useState(true)
  // true cuando se entró con el enlace de "olvidé mi contraseña": la app pide
  // una contraseña nueva antes de mostrar nada más. Arranca desde la URL porque
  // el evento PASSWORD_RECOVERY puede dispararse antes de que haya quien lo escuche.
  const [recuperando, setRecuperando] = useState(LLEGO_POR_RECUPERACION)
  const userIdRef = useRef(null)

  // Carga el perfil con reintentos. Si todos fallan se CONSERVA el perfil que
  // ya hubiera: perderlo por un fallo de red a mitad de la sesión dejaba la
  // app con datos vacíos.
  async function fetchProfile(userId) {
    if (!userId) return { error: null }
    const { data, error } = await conReintentos(() =>
      supabase.from('profiles').select('*').eq('id', userId).single()
    )
    if (userIdRef.current !== userId) return { error: null } // cambió la sesión mientras tanto
    if (error) {
      console.error('No se pudo cargar el perfil:', error.message)
      setProfileError(error.message || 'No se pudo cargar tu perfil')
    } else {
      setProfile(data)
      setProfileError(null)
    }
    setLoading(false)
    return { error }
  }

  // Aplica una sesión: limpia el perfil si cambió de usuario y lo (re)carga
  function aplicarSesion(session) {
    const nuevoId = session?.user?.id ?? null
    setUser(session?.user ?? null)
    if (!nuevoId) {
      userIdRef.current = null
      setProfile(null); setProfileError(null); setLoading(false)
      return
    }
    if (userIdRef.current !== nuevoId) {
      userIdRef.current = nuevoId
      setProfile(null)
      setLoading(true)   // la app espera el perfil antes de decidir qué mostrar
      fetchProfile(nuevoId)
    }
  }

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        // Token de refresco inválido/caducado → limpiar la sesión local para no
        // quedar en limbo (spinner infinito) ni repetir el error en cada carga.
        if (error) {
          supabase.auth.signOut({ scope: 'local' })
          aplicarSesion(null)
          return
        }
        aplicarSesion(session)
      })
      .catch(() => aplicarSesion(null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // La renovación del token (≈ cada hora) no cambia el perfil: no recargarlo
      if (event === 'TOKEN_REFRESHED') { setUser(session?.user ?? null); return }
      if (event === 'PASSWORD_RECOVERY') setRecuperando(true)
      if (event === 'SIGNED_OUT') setRecuperando(false)
      // Supabase recomienda no llamar a la API dentro de este callback (puede
      // bloquearse esperando el mismo candado de sesión): se difiere un tick.
      setTimeout(() => {
        if (event === 'USER_UPDATED' && session?.user?.id === userIdRef.current) fetchProfile(session.user.id)
        else aplicarSesion(session)
      }, 0)
    })

    return () => subscription.unsubscribe()
  // fetchProfile/aplicarSesion solo usan setters y refs estables
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = () => {
    clearQueryCache()
    return supabase.auth.signOut()
  }

  // Cambia la contraseña del usuario con sesión (también cierra el flujo de recuperación)
  const cambiarPassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (!error) setRecuperando(false)
    return { error }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, profileError, loading, signOut,
      recuperando, cambiarPassword,
      refreshProfile: () => fetchProfile(user?.id),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
