import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { invalidateQueryCache } from './useSupabaseQuery'
import { useNominasLista } from './useCatalogos'

export function useNominas() {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const { nominas, loading } = useNominasLista()

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

  return { nominas, loading, saving, agregar, actualizar, eliminar }
}
