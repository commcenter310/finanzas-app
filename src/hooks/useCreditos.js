import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useCreditos() {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  const { data: creditos, loading, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('creditos').select('*').eq('user_id', user.id).eq('activo', true)
      .order('nombre')
    if (error) throw error
    return data ?? []
  }, [user?.id])

  const agregar = async (datos) => {
    setSaving(true)
    const { error } = await supabase.from('creditos').insert({ ...datos, user_id: user.id })
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const actualizar = async (id, datos) => {
    setSaving(true)
    const { error } = await supabase.from('creditos').update(datos).eq('id', id)
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const eliminar = async (id) => {
    await supabase.from('creditos').update({ activo: false }).eq('id', id)
    refetch()
  }

  return { creditos: creditos ?? [], loading, saving, agregar, actualizar, eliminar }
}
