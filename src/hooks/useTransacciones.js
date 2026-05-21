import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useTransacciones() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const [saving, setSaving] = useState(false)

  const inicioMes = `${anio}-${String(mes).padStart(2,'0')}-01`
  const finMes = new Date(anio, mes, 0).toISOString().split('T')[0]

  const { data: transacciones, loading, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('transacciones')
      .select(`
        id, descripcion, monto, clasificacion, fecha, origen, created_at,
        categorias(id, nombre, icono, clasificacion),
        metodos_pago(id, nombre)
      `)
      .eq('user_id', user.id)
      .gte('fecha', inicioMes).lte('fecha', finMes)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }, [user?.id, mes, anio])

  const { data: categorias } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('categorias')
      .select('id, nombre, icono, clasificacion')
      .eq('user_id', user.id).eq('activa', true)
      .order('clasificacion').order('nombre')
    return data ?? []
  }, [user?.id])

  const { data: metodos } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('metodos_pago')
      .select('id, nombre, tipo').eq('user_id', user.id).eq('activo', true)
    return data ?? []
  }, [user?.id])

  const agregar = async (datos) => {
    setSaving(true)
    const { data, error } = await supabase.from('transacciones')
      .insert({ ...datos, user_id: user.id }).select().single()
    setSaving(false)
    if (!error) refetch()
    return { data, error }
  }

  const eliminar = async (id) => {
    await supabase.from('transacciones').delete().eq('id', id)
    refetch()
  }

  const actualizar = async (id, datos) => {
    setSaving(true)
    const { error } = await supabase.from('transacciones').update(datos).eq('id', id)
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const totales = {
    total:     transacciones?.reduce((s, t) => s + Number(t.monto), 0) ?? 0,
    necesidad: transacciones?.filter(t => t.clasificacion === 'necesidad').reduce((s, t) => s + Number(t.monto), 0) ?? 0,
    deseo:     transacciones?.filter(t => t.clasificacion === 'deseo').reduce((s, t) => s + Number(t.monto), 0) ?? 0,
    ahorro:    transacciones?.filter(t => t.clasificacion === 'ahorro').reduce((s, t) => s + Number(t.monto), 0) ?? 0,
  }

  return { transacciones: transacciones ?? [], categorias: categorias ?? [], metodos: metodos ?? [], loading, saving, totales, agregar, actualizar, eliminar }
}
