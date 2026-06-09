import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useIngresos() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const [saving, setSaving] = useState(false)

  // Página Ingresos: filtra por fecha_recepcion (cuándo llegó el dinero)
  // → siempre puedes encontrar un ingreso en el mes en que lo recibiste
  // → el "mes de aplicación" (mes/anio) lo maneja el Dashboard por separado
  const inicioMes = `${anio}-${String(mes).padStart(2, '0')}-01`
  const finMes    = new Date(anio, mes, 0).toISOString().split('T')[0]

  const { data: ingresos, loading, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('ingresos')
      .select('*')
      .eq('user_id', user.id)
      .gte('fecha_recepcion', inicioMes)
      .lte('fecha_recepcion', finMes)
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
    // Extraer y forzar mes/anio como enteros explícitamente
    const { mes: mesForm, anio: anioForm, ...campos } = datos
    const fecha = datos.fecha_recepcion
    const [anioFecha, mesFecha] = fecha ? fecha.split('-').map(Number) : [anioForm, mesForm]
    const updates = {
      ...campos,
      mes:  mesForm  != null ? Number(mesForm)  : mesFecha,
      anio: anioForm != null ? Number(anioForm) : anioFecha,
    }
    const { error } = await supabase
      .from('ingresos')
      .update(updates)
      .eq('id', id)
      .select()
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
