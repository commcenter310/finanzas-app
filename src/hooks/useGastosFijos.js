import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useGastosFijos() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const [saving, setSaving] = useState(false)
  const [autoCopiadosCount, setAutoCopiadosCount] = useState(0)
  // Ref para evitar auto-copiar más de una vez por mes/año
  const autoCopiadoKeyRef = useRef(null)

  const { data: gastos, loading, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('gastos_fijos')
      .select('*, categorias(nombre, icono)')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  }, [user?.id, mes, anio])

  const totales = {
    previsto: gastos?.reduce((s, g) => s + Number(g.monto_previsto), 0) ?? 0,
    actual:   gastos?.reduce((s, g) => s + Number(g.monto_actual), 0) ?? 0,
    pagados:  gastos?.filter(g => g.pagado).length ?? 0,
  }

  const agregar = async (datos) => {
    setSaving(true)
    const { error } = await supabase.from('gastos_fijos').insert({ ...datos, user_id: user.id, mes, anio })
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const actualizar = async (id, datos) => {
    setSaving(true)
    const { error } = await supabase.from('gastos_fijos').update(datos).eq('id', id)
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const togglePagado = async (id, pagado, monto_previsto) => {
    await supabase.from('gastos_fijos').update({
      pagado: !pagado,
      monto_actual: !pagado ? monto_previsto : 0,
      fecha_pago: !pagado ? new Date().toISOString().split('T')[0] : null,
    }).eq('id', id)
    refetch()
  }

  const eliminar = async (id) => {
    await supabase.from('gastos_fijos').delete().eq('id', id)
    refetch()
  }

  const copiarRecurrentes = async () => {
    const mesAnterior  = mes === 1 ? 12 : mes - 1
    const anioAnterior = mes === 1 ? anio - 1 : anio

    const { data: recurrentes } = await supabase
      .from('gastos_fijos')
      .select('concepto, categoria_id, monto_previsto, clasificacion, es_recurrente')
      .eq('user_id', user.id).eq('mes', mesAnterior).eq('anio', anioAnterior).eq('es_recurrente', true)

    if (!recurrentes?.length) return { copiados: 0 }

    const nuevos = recurrentes.map(r => ({ ...r, user_id: user.id, mes, anio, pagado: false, monto_actual: 0 }))
    await supabase.from('gastos_fijos').insert(nuevos)
    refetch()
    return { copiados: recurrentes.length }
  }

  // Auto-copiar recurrentes cuando el mes está vacío (solo una vez por mes/año)
  useEffect(() => {
    const key = `${mes}-${anio}`
    if (loading) return
    if (gastos === null) return
    if (gastos.length > 0) return                    // ya tiene datos, no copiar
    if (autoCopiadoKeyRef.current === key) return    // ya se intentó para este mes
    autoCopiadoKeyRef.current = key
    copiarRecurrentes().then(({ copiados }) => {
      if (copiados > 0) setAutoCopiadosCount(copiados)
    })
  }, [loading, gastos, mes, anio]) // eslint-disable-line

  return { gastos: gastos ?? [], loading, saving, totales, agregar, actualizar, togglePagado, eliminar, copiarRecurrentes, autoCopiadosCount }
}
