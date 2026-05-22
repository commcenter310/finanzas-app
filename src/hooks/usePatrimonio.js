import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSupabaseQuery } from './useSupabaseQuery'

export function usePatrimonio() {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  const { data: activos, loading: loadingActivos, refetch: refetchActivos } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('activos').select('*').eq('user_id', user.id).eq('activo', true)
      .order('tipo').order('nombre')
    if (error) throw error
    return data ?? []
  }, [user?.id])

  const { data: creditos, loading: loadingCreditos } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('creditos').select('id, nombre, saldo_utilizado, limite_credito')
      .eq('user_id', user.id).eq('activo', true).order('nombre')
    if (error) throw error
    return data ?? []
  }, [user?.id])

  const { data: snapshots, loading: loadingSnaps, refetch: refetchSnaps } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('patrimonio_snapshots').select('*').eq('user_id', user.id)
      .order('anio').order('mes').limit(24)
    if (error) throw error
    return data ?? []
  }, [user?.id])

  const totalActivos   = activos?.reduce((s, a) => s + Number(a.monto), 0) ?? 0
  const totalDeudas    = creditos?.reduce((s, c) => s + Number(c.saldo_utilizado ?? 0), 0) ?? 0
  const patrimonioNeto = totalActivos - totalDeudas

  const agregar = async (datos) => {
    setSaving(true)
    const { error } = await supabase.from('activos').insert({ ...datos, user_id: user.id })
    setSaving(false)
    if (!error) refetchActivos()
    return { error }
  }

  const actualizar = async (id, datos) => {
    setSaving(true)
    const { error } = await supabase.from('activos').update(datos).eq('id', id)
    setSaving(false)
    if (!error) refetchActivos()
    return { error }
  }

  const eliminar = async (id) => {
    await supabase.from('activos').update({ activo: false }).eq('id', id)
    refetchActivos()
  }

  const guardarSnapshot = async () => {
    const now = new Date()
    setSaving(true)
    const { error } = await supabase.from('patrimonio_snapshots').upsert({
      user_id: user.id,
      mes: now.getMonth() + 1,
      anio: now.getFullYear(),
      total_activos:   totalActivos,
      total_deudas:    totalDeudas,
      patrimonio_neto: patrimonioNeto,
    }, { onConflict: 'user_id,mes,anio' })
    setSaving(false)
    if (!error) refetchSnaps()
    return { error }
  }

  return {
    loading: loadingActivos || loadingCreditos || loadingSnaps,
    saving,
    activos:  activos  ?? [],
    creditos: creditos ?? [],
    snapshots: snapshots ?? [],
    totalActivos,
    totalDeudas,
    patrimonioNeto,
    agregar,
    actualizar,
    eliminar,
    guardarSnapshot,
  }
}
