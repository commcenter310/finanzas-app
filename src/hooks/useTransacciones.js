import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { invalidateQueryCache, useSupabaseQuery } from './useSupabaseQuery'
import { useCategorias, useMetodosPago } from './useCatalogos'
import { finMesISO, inicioMesISO } from '../utils/fecha'
import { sumarPorClasificacion } from '../utils/calculos'
import { liberarOperacionId, obtenerOperacionId } from '../utils/operaciones'

// Las altas, ediciones y bajas van por RPC (supabase-operaciones-atomicas.sql):
// la transacción y el saldo de la tarjeta vinculada se actualizan juntos en
// una sola transacción de la base de datos.

export function useTransacciones() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const [saving, setSaving] = useState(false)
  const operacionesRef = useRef(new Map())

  const inicioMes = inicioMesISO(mes, anio)
  const finMes = finMesISO(mes, anio)
  const uid = user?.id

  const { data: transacciones, loading, error, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('transacciones')
      .select(`
        id, descripcion, monto, categoria_id, metodo_pago_id, clasificacion, fecha, origen, msi_meses, created_at,
        categorias(id, nombre, icono, clasificacion),
        metodos_pago(id, nombre, credito_id)
      `)
      .eq('user_id', user.id)
      .gte('fecha', inicioMes).lte('fecha', finMes)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }, [uid, mes, anio], `tx:lista:${uid}:${mes}:${anio}`)

  const categorias = useCategorias()
  const metodos = useMetodosPago()

  const invalidateTransacciones = () => invalidateQueryCache([
    'tx:',
    'dash:',
    'tendencias:',
    'gastosVariables:',
    'creditos:',
    'deudas:',
    'recordatorios:',
  ])

  const agregar = async (datos) => {
    setSaving(true)
    // Reintentar el mismo envío reutiliza el operacion_id: no se duplica
    const operacionId = obtenerOperacionId(operacionesRef.current, 'crear', datos)
    const { data, error } = await supabase.rpc('registrar_transaccion_atomica', {
      p_descripcion: datos.descripcion,
      p_monto: Number(datos.monto),
      p_categoria_id: datos.categoria_id ?? null,
      p_clasificacion: datos.clasificacion,
      p_metodo_pago_id: datos.metodo_pago_id ?? null,
      p_fecha: datos.fecha,
      p_origen: datos.origen ?? 'web',
      p_msi_meses: datos.msi_meses ?? null,
      p_operacion_id: operacionId,
    })
    setSaving(false)
    if (error) return { error }

    liberarOperacionId(operacionesRef.current, 'crear')
    invalidateTransacciones()
    return { data: Array.isArray(data) ? data[0] : data }
  }

  const actualizar = async (id, nuevosDatos) => {
    setSaving(true)
    const { error } = await supabase.rpc('actualizar_transaccion_atomica', {
      p_transaccion_id: id,
      p_descripcion: nuevosDatos.descripcion,
      p_monto: Number(nuevosDatos.monto),
      p_categoria_id: nuevosDatos.categoria_id ?? null,
      p_clasificacion: nuevosDatos.clasificacion,
      p_metodo_pago_id: nuevosDatos.metodo_pago_id ?? null,
      p_fecha: nuevosDatos.fecha,
      p_msi_meses: nuevosDatos.msi_meses ?? null,
    })
    setSaving(false)
    if (!error) invalidateTransacciones()
    return { error }
  }

  const eliminar = async (transaccion) => {
    const { error } = await supabase.rpc('eliminar_transaccion_atomica', {
      p_transaccion_id: transaccion.id,
    })
    if (!error) invalidateTransacciones()
    return { error }
  }

  const totales = {
    total: transacciones?.reduce((s, t) => s + Number(t.monto), 0) ?? 0,
    ...sumarPorClasificacion(transacciones),
  }

  return { transacciones: transacciones ?? [], categorias, metodos, loading, error, refetch, saving, totales, agregar, actualizar, eliminar }
}
