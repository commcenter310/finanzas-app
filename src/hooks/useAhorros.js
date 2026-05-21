import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useAhorros() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const [saving, setSaving] = useState(false)

  const { data: ahorros, loading, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('ahorros').select('*')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  }, [user?.id, mes, anio])

  const totales = {
    meta:   ahorros?.reduce((s, a) => s + Number(a.monto_meta), 0) ?? 0,
    actual: ahorros?.reduce((s, a) => s + Number(a.monto_actual), 0) ?? 0,
  }

  const agregar = async (datos) => {
    setSaving(true)
    const { error } = await supabase.from('ahorros').insert({ ...datos, user_id: user.id, mes, anio })
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const actualizar = async (id, datos) => {
    setSaving(true)
    const { error } = await supabase.from('ahorros').update(datos).eq('id', id)
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const eliminar = async (id) => {
    await supabase.from('ahorros').delete().eq('id', id)
    refetch()
  }

  return { ahorros: ahorros ?? [], loading, saving, totales, agregar, actualizar, eliminar }
}
