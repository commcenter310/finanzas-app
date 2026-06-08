import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useIngresos() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const [saving, setSaving] = useState(false)

  // Filtrar por mes/anio: permite que una nómina del día 30 "aplique" al mes siguiente
  const { data: ingresos, loading, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('ingresos')
      .select('*')
      .eq('user_id', user.id)
      .eq('mes', mes)
      .eq('anio', anio)
      .order('fecha_recepcion', { ascending: true })
    if (error) throw error
    return data ?? []
  }, [user?.id, mes, anio])

  const totales = {
    presupuesto: ingresos?.reduce((s, i) => s + Number(i.monto_presupuesto), 0) ?? 0,
    actual:      ingresos?.reduce((s, i) => s + Number(i.monto_actual), 0) ?? 0,
  }

  const agregar = async (datos) => {
    setSaving(true)
    const hoy = new Date().toISOString().split('T')[0]
    const fecha = datos.fecha_recepcion || hoy
    // Derivar mes/anio de la fecha solo como fallback; respetar lo que venga del form
    const [anioFecha, mesFecha] = fecha.split('-').map(Number)
    const mesAplicar  = datos.mes  != null ? datos.mes  : mesFecha
    const anioAplicar = datos.anio != null ? datos.anio : anioFecha
    const { mes: _mes, anio: _anio, ...campos } = datos
    const { error } = await supabase.from('ingresos').insert({
      ...campos,
      user_id: user.id,
      fecha_recepcion: fecha,
      mes: mesAplicar,
      anio: anioAplicar,
    })
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const actualizar = async (id, datos) => {
    setSaving(true)
    const updates = { ...datos }
    // Solo auto-derivar mes/anio si NO vienen explícitamente del form (para no pisar la selección manual)
    if (datos.fecha_recepcion && datos.mes == null && datos.anio == null) {
      const [anioFecha, mesFecha] = datos.fecha_recepcion.split('-').map(Number)
      updates.mes = mesFecha
      updates.anio = anioFecha
    }
    const { error } = await supabase.from('ingresos').update(updates).eq('id', id)
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
