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

  const { data: metodos, refetch: refetchMetodos } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('metodos_pago')
      .select('id, nombre, tipo, credito_id')
      .eq('user_id', user.id).eq('activo', true)
    return data ?? []
  }, [user?.id])

  const agregar = async (datos) => {
    setSaving(true)
    const { data, error } = await supabase.from('creditos')
      .insert({ ...datos, user_id: user.id }).select().single()
    setSaving(false)
    if (!error) refetch()
    return { data, error }
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

  const vincularMetodo = async (creditoId, metodoId) => {
    await supabase.from('metodos_pago').update({ credito_id: null })
      .eq('credito_id', creditoId).eq('user_id', user.id)
    if (metodoId) {
      await supabase.from('metodos_pago').update({ credito_id: creditoId })
        .eq('id', metodoId).eq('user_id', user.id)
    }
    refetchMetodos()
  }

  return { creditos: creditos ?? [], metodos: metodos ?? [], loading, saving, agregar, actualizar, eliminar, vincularMetodo }
}
