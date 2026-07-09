import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { invalidateQueryCache, useSupabaseQuery } from './useSupabaseQuery'
import { fechaLocalISO } from '../utils/fecha'

export function useCreditos() {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  const uid = user?.id
  const { data: creditos, loading, error, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('creditos').select('*, pagos_credito(id, monto, fecha)').eq('user_id', user.id).eq('activo', true)
      .order('nombre')
    if (error) throw error
    return data ?? []
  }, [uid], `creditos:${uid}`)

  const { data: metodos } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('metodos_pago')
      .select('id, nombre, tipo, credito_id')
      .eq('user_id', user.id).eq('activo', true)
    return data ?? []
  }, [uid], `metodos:${uid}`)

  // Compras hechas con tarjetas (métodos vinculados a un crédito) — últimos 26
  // meses para cubrir planes MSI largos. Alimenta el ciclo de corte por tarjeta.
  const { data: comprasTarjeta } = useSupabaseQuery(async () => {
    const desde = new Date()
    desde.setMonth(desde.getMonth() - 26)
    const { data } = await supabase.from('transacciones')
      .select('monto, fecha, msi_meses, metodos_pago!inner(credito_id)')
      .eq('user_id', user.id)
      .not('metodos_pago.credito_id', 'is', null)
      .gte('fecha', fechaLocalISO(desde))
    return data ?? []
  }, [uid], `creditos:compras:${uid}`)

  const invalidateCreditos = () => invalidateQueryCache([
    'creditos:',
    'deudas:',
    'recordatorios:',
    'tendencias:',
  ])

  const invalidateMetodosCredito = () => invalidateQueryCache([
    'metodos:',
    'creditos:',
    'deudas:',
    'recordatorios:',
    'tx:',
    'dash:',
    'tendencias:',
  ])

  const agregar = async (datos) => {
    setSaving(true)
    const { data, error } = await supabase.from('creditos')
      .insert({ ...datos, user_id: user.id }).select().single()
    setSaving(false)
    if (!error) invalidateCreditos()
    return { data, error }
  }

  const actualizar = async (id, datos) => {
    setSaving(true)
    const { error } = await supabase.from('creditos').update(datos).eq('id', id)
    setSaving(false)
    if (!error) invalidateCreditos()
    return { error }
  }

  const eliminar = async (id) => {
    await supabase.from('creditos').update({ activo: false }).eq('id', id)
    invalidateCreditos()
  }

  const vincularMetodo = async (creditoId, metodoId) => {
    await supabase.from('metodos_pago').update({ credito_id: null })
      .eq('credito_id', creditoId).eq('user_id', user.id)
    if (metodoId) {
      await supabase.from('metodos_pago').update({ credito_id: creditoId })
        .eq('id', metodoId).eq('user_id', user.id)
    }
    invalidateMetodosCredito()
  }

  return { creditos: creditos ?? [], metodos: metodos ?? [], comprasTarjeta: comprasTarjeta ?? [], loading, error, refetch, saving, agregar, actualizar, eliminar, vincularMetodo }
}
