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

  // Sin cacheKey a propósito: el efecto de auto-copia de recurrentes depende de
  // datos frescos; cachear un mes vacío podría disparar inserts duplicados.
  const { data: gastos, loading, error, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('gastos_fijos')
      .select('*, categorias(nombre, icono)')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
      .order('dia_cobro', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
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

  const togglePagado = async (gasto) => {
    const hoy = new Date().toISOString().split('T')[0]
    if (!gasto.pagado) {
      // Marcar como pagado → crear transacción en Control de Gastos
      const { data: tx } = await supabase.from('transacciones').insert({
        user_id: user.id,
        descripcion: gasto.concepto,
        monto: Number(gasto.monto_previsto),
        clasificacion: gasto.clasificacion,
        categoria_id: gasto.categoria_id ?? null,
        fecha: hoy,
        origen: 'gastos_fijos',
      }).select('id').single()
      await supabase.from('gastos_fijos').update({
        pagado: true,
        monto_actual: gasto.monto_previsto,
        fecha_pago: hoy,
        transaccion_id: tx?.id ?? null,
      }).eq('id', gasto.id)
    } else {
      // Desmarcar → borrar la transacción vinculada
      if (gasto.transaccion_id) {
        await supabase.from('transacciones').delete().eq('id', gasto.transaccion_id)
      }
      await supabase.from('gastos_fijos').update({
        pagado: false,
        monto_actual: 0,
        fecha_pago: null,
        transaccion_id: null,
      }).eq('id', gasto.id)
    }
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
      .select('concepto, categoria_id, monto_previsto, clasificacion, es_recurrente, dia_cobro')
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

  return { gastos: gastos ?? [], categorias: categorias ?? [], loading, error, refetch, saving, totales, agregar, actualizar, togglePagado, eliminar, copiarRecurrentes, autoCopiadosCount }
}
