import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { invalidateQueryCache, useSupabaseQuery } from './useSupabaseQuery'
import { ensureCategoria } from '../utils/categorias'

export function useAhorros() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const [saving, setSaving] = useState(false)

  const uid = user?.id
  // Los fondos de ahorro son PERMANENTES: no dependen del mes. Una meta creada
  // en cualquier mes se ve siempre y su saldo (monto_actual) acumula en el tiempo.
  const { data: ahorros, loading, error, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('ahorros').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  }, [uid], `ahorros:${uid}`)

  const { data: metodos } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('metodos_pago')
      .select('id, nombre, tipo, credito_id').eq('user_id', user.id).eq('activo', true)
    return data ?? []
  }, [uid], `metodos:${uid}`)

  const totales = {
    meta:   ahorros?.reduce((s, a) => s + Number(a.monto_meta), 0) ?? 0,
    actual: ahorros?.reduce((s, a) => s + Number(a.monto_actual), 0) ?? 0,
  }

  const invalidateAhorros = () => invalidateQueryCache(['ahorros:', 'plan:'])
  const invalidateDeposito = () => invalidateQueryCache(['ahorros:', 'tx:', 'dash:', 'tendencias:', 'gastosVariables:', 'plan:'])

  const agregar = async (datos) => {
    setSaving(true)
    const { error } = await supabase.from('ahorros').insert({ ...datos, user_id: user.id, mes, anio })
    setSaving(false)
    if (!error) invalidateAhorros()
    return { error }
  }

  const actualizar = async (id, datos) => {
    setSaving(true)
    const { error } = await supabase.from('ahorros').update(datos).eq('id', id)
    setSaving(false)
    if (!error) invalidateAhorros()
    return { error }
  }

  const eliminar = async (id) => {
    await supabase.from('ahorros').delete().eq('id', id)
    invalidateAhorros()
  }

  const depositar = async (ahorro, { monto, metodo_pago_id, fecha }) => {
    setSaving(true)
    const montoNum = Number(monto)
    const catId = await ensureCategoria(user.id, { nombre: 'Ahorro', icono: '🐷', clasificacion: 'ahorro' })
    const [{ error: errTx }, { error: errAhorro }] = await Promise.all([
      supabase.from('transacciones').insert({
        user_id:        user.id,
        descripcion:    `Ahorro: ${ahorro.concepto}`,
        monto:          montoNum,
        clasificacion:  'ahorro',
        categoria_id:   catId,
        fecha,
        origen:         'ahorro',
        metodo_pago_id: metodo_pago_id ? Number(metodo_pago_id) : null,
      }),
      supabase.from('ahorros').update({
        monto_actual: Number(ahorro.monto_actual) + montoNum,
      }).eq('id', ahorro.id),
    ])
    setSaving(false)
    if (!errTx && !errAhorro) invalidateDeposito()
    return { error: errTx || errAhorro }
  }

  return { ahorros: ahorros ?? [], metodos: metodos ?? [], loading, error, refetch, saving, totales, agregar, actualizar, eliminar, depositar }
}
