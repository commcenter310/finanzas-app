import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { invalidateQueryCache, useSupabaseQuery } from './useSupabaseQuery'
import { ensureCategoria } from '../utils/categorias'
import {
  liberarOperacionId,
  obtenerOperacionId,
  rpcNoDisponible,
} from '../utils/operaciones'

const RPC_AHORROS = ['depositar_ahorro_atomico']

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
    await supabase.from('ahorros').delete().eq('id', id)
    invalidateAhorros()
  }

  const depositarCompatibilidad = async (ahorro, { monto, metodo_pago_id, fecha }) => {
    const montoNum = Number(monto)
    const catId = await ensureCategoria(user.id, { nombre: 'Ahorro', icono: '🐷', clasificacion: 'ahorro' })
    const { data: transaccion, error: errTx } = await supabase
      .from('transacciones')
      .insert({
        user_id:        user.id,
        descripcion:    `Ahorro: ${ahorro.concepto}`,
        monto:          montoNum,
        clasificacion:  'ahorro',
        categoria_id:   catId,
        fecha,
        origen:         'ahorro',
        metodo_pago_id: metodo_pago_id ? Number(metodo_pago_id) : null,
      })
      .select('id')
      .single()
    if (errTx) return { error: errTx, atomico: false }

    const { error: errAhorro } = await supabase
      .from('ahorros')
      .update({
        monto_actual: Number(ahorro.monto_actual) + montoNum,
      })
      .eq('id', ahorro.id)
    if (!errAhorro) return { atomico: false }

    const { error: errorReversion } = await supabase
      .from('transacciones')
      .delete()
      .eq('id', transaccion.id)
    return {
      error: errorReversion
        ? { code: 'OPERACION_REVERSION_INCOMPLETA', message: 'OPERACION_REVERSION_INCOMPLETA' }
        : errAhorro,
      atomico: false,
    }
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
    const { error } = await supabase.rpc('depositar_ahorro_atomico', {
      p_ahorro_id: ahorro.id,
      p_monto: datosOperacion.monto,
      p_metodo_pago_id: datosOperacion.metodo_pago_id,
      p_fecha: fecha,
      p_operacion_id: operacionId,
    })
    const resultado = !error
      ? { atomico: true }
      : rpcNoDisponible(error, RPC_AHORROS)
      ? await depositarCompatibilidad(ahorro, { monto, metodo_pago_id, fecha })
      : { error }

    setSaving(false)
    if (!resultado.error) {
      liberarOperacionId(operacionesRef.current, key)
      invalidateDeposito()
    }
    return resultado
  }

  return { ahorros: ahorros ?? [], metodos: metodos ?? [], loading, error, refetch, saving, totales, agregar, actualizar, eliminar, depositar }
}
