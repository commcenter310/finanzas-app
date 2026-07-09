import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { invalidateQueryCache, useSupabaseQuery } from './useSupabaseQuery'

export function useNominas() {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const uid = user?.id

  const { data: nominas, loading } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('nominas')
      .select('*')
      .eq('user_id', user.id)
      .order('es_principal', { ascending: false })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  }, [uid], `nominas:${uid}`)

  const invalidateNominas = () => invalidateQueryCache(['nominas:', 'dash:', 'plan:', 'proyeccion:'])

  // Si la nueva/editada nómina es principal, desmarca las demás
  const limpiarOtrosPrincipales = async (exceptoId = null) => {
    let q = supabase.from('nominas').update({ es_principal: false }).eq('user_id', user.id)
    if (exceptoId) q = q.neq('id', exceptoId)
    await q
  }

  const agregar = async (datos) => {
    setSaving(true)
    if (datos.es_principal) await limpiarOtrosPrincipales()
    const { error } = await supabase.from('nominas').insert({ ...datos, user_id: user.id })
    setSaving(false)
    if (!error) invalidateNominas()
    return { error }
  }

  const actualizar = async (id, datos) => {
    setSaving(true)
    if (datos.es_principal) await limpiarOtrosPrincipales(id)
    const { error } = await supabase.from('nominas').update(datos).eq('id', id)
    setSaving(false)
    if (!error) invalidateNominas()
    return { error }
  }

  const eliminar = async (id) => {
    const { error } = await supabase.from('nominas').delete().eq('id', id)
    if (!error) invalidateNominas()
    return { error }
  }

  return { nominas: nominas ?? [], loading, saving, agregar, actualizar, eliminar }
}
