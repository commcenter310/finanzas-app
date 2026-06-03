import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useIngresos() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const [saving, setSaving] = useState(false)

  const { data: ingresos, loading, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('ingresos')
      .select('*')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  }, [user?.id, mes, anio])

  const totales = {
    presupuesto: ingresos?.reduce((s, i) => s + Number(i.monto_presupuesto), 0) ?? 0,
    actual:      ingresos?.reduce((s, i) => s + Number(i.monto_actual), 0) ?? 0,
  }

  const agregar = async (datos) => {
    setSaving(true)
    // mes/anio pueden venir del form (cuando el usuario elige "Aplica en otro mes")
    // Si no vienen, se usa el mes/anio actualmente visible
    const { mes: mesDatos, anio: anioDatos, ...campos } = datos
    const { error } = await supabase.from('ingresos').insert({
      ...campos,
      user_id: user.id,
      mes:  mesDatos  ?? mes,
      anio: anioDatos ?? anio,
    })
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const actualizar = async (id, datos) => {
    setSaving(true)
    const { error } = await supabase.from('ingresos').update(datos).eq('id', id)
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const eliminar = async (id) => {
    const { error } = await supabase.from('ingresos').delete().eq('id', id)
    if (!error) refetch()
    return { error }
  }

  return { ingresos: ingresos ?? [], loading, saving, totales, agregar, actualizar, eliminar }
}
