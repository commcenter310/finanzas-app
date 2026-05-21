import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useDeudas() {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  const { data: deudas, loading, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('deudas')
      .select('*, abonos_deuda(*)')
      .eq('user_id', user.id).eq('liquidada', false)
      .order('saldo_actual', { ascending: false })
    if (error) throw error
    return data ?? []
  }, [user?.id])

  const agregar = async (datos) => {
    setSaving(true)
    const { error } = await supabase.from('deudas').insert({ ...datos, user_id: user.id })
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const abonar = async (deuda_id, monto, notas = '') => {
    await supabase.from('abonos_deuda').insert({
      deuda_id, monto: Number(monto),
      fecha: new Date().toISOString().split('T')[0], notas
    })
    const deuda = deudas?.find(d => d.id === deuda_id)
    if (deuda) {
      const nuevo = Math.max(0, Number(deuda.saldo_actual) - Number(monto))
      await supabase.from('deudas').update({ saldo_actual: nuevo, liquidada: nuevo === 0 }).eq('id', deuda_id)
    }
    refetch()
  }

  const eliminar = async (id) => {
    await supabase.from('deudas').delete().eq('id', id)
    refetch()
  }

  const totalDeuda       = deudas?.reduce((s, d) => s + Number(d.saldo_actual), 0) ?? 0
  const totalPagoMensual = deudas?.reduce((s, d) => s + Number(d.pago_mensual ?? 0), 0) ?? 0
  const snowball  = [...(deudas ?? [])].sort((a, b) => Number(a.saldo_actual) - Number(b.saldo_actual))
  const avalanche = [...(deudas ?? [])].sort((a, b) => Number(b.tasa_interes ?? 0) - Number(a.tasa_interes ?? 0))

  return { deudas: deudas ?? [], loading, saving, totalDeuda, totalPagoMensual, snowball, avalanche, agregar, abonar, eliminar }
}
