import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { invalidateQueryCache, useSupabaseQuery } from './useSupabaseQuery'
import { useMetodosPago } from './useCatalogos'
import { liberarOperacionId, obtenerOperacionId } from '../utils/operaciones'

export function useAhorros() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const [saving, setSaving] = useState(false)
  const operacionesRef = useRef(new Map())

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

  const metodos = useMetodosPago()

  // Último depósito de cada meta (para poder deshacerlo). Solo los hechos con
  // la función atómica quedan ligados a su meta (ahorro_id).
  const { data: depositos } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('transacciones')
      .select('id, monto, fecha, ahorro_id')
      .eq('user_id', uid).eq('origen', 'ahorro').not('ahorro_id', 'is', null)
      .order('id', { ascending: false })
      .limit(200)
    if (error) throw error
    return data ?? []
  }, [uid], `ahorros:depositos:${uid}`)
  const ultimoDeposito = {}
  for (const d of depositos ?? []) ultimoDeposito[d.ahorro_id] ??= d

  const totales = {
    meta:   ahorros?.reduce((s, a) => s + Number(a.monto_meta), 0) ?? 0,
    actual: ahorros?.reduce((s, a) => s + Number(a.monto_actual), 0) ?? 0,
  }

  const invalidateAhorros = () => invalidateQueryCache(['ahorros:', 'plan:'])
  const invalidateDeposito = () => invalidateQueryCache([
    'ahorros:',
    'tx:',
    'dash:',
    'tendencias:',
    'gastosVariables:',
    'plan:',
    'creditos:',
    'deudas:',
    'recordatorios:',
  ])

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
    const { error } = await supabase.from('ahorros').delete().eq('id', id)
    if (!error) invalidateAhorros()
    return { error }
  }

  const depositar = async (ahorro, { monto, metodo_pago_id, fecha }) => {
    setSaving(true)
    const datosOperacion = {
      monto: Number(monto),
      metodo_pago_id: metodo_pago_id ? Number(metodo_pago_id) : null,
      fecha,
    }
    const key = `depositar:${ahorro.id}`
    const operacionId = obtenerOperacionId(operacionesRef.current, key, datosOperacion)
    const { data, error } = await supabase.rpc('depositar_ahorro_atomico', {
      p_ahorro_id: ahorro.id,
      p_monto: datosOperacion.monto,
      p_metodo_pago_id: datosOperacion.metodo_pago_id,
      p_fecha: fecha,
      p_operacion_id: operacionId,
    })
    setSaving(false)
    if (error) return { error }
    liberarOperacionId(operacionesRef.current, key)
    invalidateDeposito()
    const fila = Array.isArray(data) ? data[0] : data
    return { error: null, transaccionId: fila?.transaccion_id ?? null }
  }

  // Revierte un depósito: resta del ahorro, borra su movimiento y, si se hizo
  // con tarjeta, devuelve el saldo de la tarjeta (supabase-deshacer.sql).
  const deshacerDeposito = async (transaccionId) => {
    setSaving(true)
    const { error } = await supabase.rpc('deshacer_deposito_ahorro', { p_transaccion_id: transaccionId })
    setSaving(false)
    if (!error) invalidateDeposito()
    return { error }
  }

  return { ahorros: ahorros ?? [], metodos, ultimoDeposito, deshacerDeposito, loading, error, refetch, saving, totales, agregar, actualizar, eliminar, depositar }
}
