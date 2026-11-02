import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSupabaseQuery } from './useSupabaseQuery'

// Catálogos del usuario que varias pantallas necesitan. Viven aquí para que
// cada uno tenga UNA sola consulta y UNA sola cacheKey: todas las páginas
// comparten el mismo dato y una invalidación ('categorias:', 'metodos:',
// 'nominas:') las refresca a todas.

// Categorías activas (todas, fijas y variables), ordenadas para selectores.
export function useCategorias() {
  const { user } = useAuth()
  const uid = user?.id
  const { data } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('categorias')
      .select('id, nombre, icono, clasificacion')
      .eq('user_id', uid).eq('activa', true)
      .order('clasificacion').order('nombre')
    if (error) throw error
    return data ?? []
  }, [uid], `categorias:${uid}`)
  return data ?? []
}

// Métodos de pago activos; `credito_id` vincula un método con su tarjeta.
export function useMetodosPago() {
  const { user } = useAuth()
  const uid = user?.id
  const { data } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('metodos_pago')
      .select('id, nombre, tipo, credito_id')
      .eq('user_id', uid).eq('activo', true)
    if (error) throw error
    return data ?? []
  }, [uid], `metodos:${uid}`)
  return data ?? []
}

// Nóminas configuradas; la principal va primero.
export function useNominasLista() {
  const { user } = useAuth()
  const uid = user?.id
  const { data, loading } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('nominas')
      .select('*')
      .eq('user_id', uid)
      .order('es_principal', { ascending: false })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  }, [uid], `nominas:${uid}`)
  return { nominas: data ?? [], loading }
}
