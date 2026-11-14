import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { invalidateQueryCache, useSupabaseQuery } from './useSupabaseQuery'
import { finMesISO, inicioMesISO } from '../utils/fecha'
import { filaIngreso } from '../utils/ingresos'

export function useIngresos() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const [saving, setSaving] = useState(false)

  // Página Ingresos: filtra por fecha_recepcion (cuándo llegó el dinero)
  // → siempre puedes encontrar un ingreso en el mes en que lo recibiste
  // → el "mes de aplicación" (mes/anio) lo maneja el Dashboard por separado
  const inicioMes = inicioMesISO(mes, anio)
  const finMes    = finMesISO(mes, anio)
  const uid = user?.id

  const { data: ingresos, loading, error, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('ingresos')
      .select('*')
      .eq('user_id', user.id)
      .gte('fecha_recepcion', inicioMes)
      .lte('fecha_recepcion', finMes)
      .order('fecha_recepcion', { ascending: true })
    if (error) throw error
    return data ?? []
  }, [uid, mes, anio], `ingresos:lista:${uid}:${mes}:${anio}`)

  const totales = {
    presupuesto: ingresos?.reduce((s, i) => s + Number(i.monto_presupuesto), 0) ?? 0,
    actual:      ingresos?.reduce((s, i) => s + Number(i.monto_actual), 0) ?? 0,
  }

  const invalidateIngresos = () => invalidateQueryCache(['ingresos:', 'dash:', 'plan:', 'tendencias:'])

  // `datos` es el formulario (utils/ingresos.js); filaIngreso lo convierte en fila
  const agregar = async (datos) => {
    setSaving(true)
    const { error } = await supabase.from('ingresos').insert({ ...filaIngreso(datos), user_id: user.id })
    setSaving(false)
    if (!error) invalidateIngresos()
    return { error }
  }

  const actualizar = async (id, datos) => {
    setSaving(true)
    const { error } = await supabase.from('ingresos').update(filaIngreso(datos)).eq('id', id)
    setSaving(false)
    if (!error) invalidateIngresos()
    return { error }
  }

  const eliminar = async (id) => {
    const { error } = await supabase.from('ingresos').delete().eq('id', id)
    if (!error) invalidateIngresos()
    return { error }
  }

  return { ingresos: ingresos ?? [], loading, error, refetch, saving, totales, agregar, actualizar, eliminar }
}
