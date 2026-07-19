import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { invalidateQueryCache, useSupabaseQuery } from './useSupabaseQuery'
import { finMesISO, inicioMesISO } from '../utils/fecha'
import {
  liberarOperacionId,
  obtenerOperacionId,
  rpcNoDisponible,
} from '../utils/operaciones'

const RPC_TRANSACCIONES = [
  'registrar_transaccion_atomica',
  'actualizar_transaccion_atomica',
  'eliminar_transaccion_atomica',
]

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

  const { data: categorias } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('categorias')
      .select('id, nombre, icono, clasificacion')
      .eq('user_id', user.id).eq('activa', true)
      .order('clasificacion').order('nombre')
    return data ?? []
  }, [uid], `categorias:${uid}`)

  const { data: metodos } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('metodos_pago')
      .select('id, nombre, tipo, credito_id').eq('user_id', user.id).eq('activo', true)
    return data ?? []
  }, [uid], `metodos:${uid}`)

  const actualizarSaldoCredito = (creditoId, delta) => {
    if (!creditoId) return Promise.resolve({ error: null })
    return supabase.rpc('update_saldo_credito', { p_credito_id: creditoId, p_delta: delta })
  }

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
    const operacionId = obtenerOperacionId(operacionesRef.current, 'crear', datos)
    const parametros = {
      p_descripcion: datos.descripcion,
      p_monto: Number(datos.monto),
      p_categoria_id: datos.categoria_id ?? null,
      p_clasificacion: datos.clasificacion,
      p_metodo_pago_id: datos.metodo_pago_id ?? null,
      p_fecha: datos.fecha,
      p_origen: datos.origen ?? 'web',
      p_msi_meses: datos.msi_meses ?? null,
      p_operacion_id: operacionId,
    }
    const { data, error } = await supabase.rpc('registrar_transaccion_atomica', parametros)

    let resultado
    if (!error) {
      resultado = { data: Array.isArray(data) ? data[0] : data, atomico: true }
    } else if (rpcNoDisponible(error, RPC_TRANSACCIONES)) {
      resultado = await agregarCompatibilidad(datos)
    } else {
      resultado = { error }
    }

    setSaving(false)
    if (!resultado.error) {
      liberarOperacionId(operacionesRef.current, 'crear')
      invalidateTransacciones()
    }
    return resultado
  }

  const agregarCompatibilidad = async (datos) => {
    const creditoId = metodos.find(m => m.id === Number(datos.metodo_pago_id))?.credito_id ?? null
    const { data, error } = await supabase
      .from('transacciones')
      .insert({ ...datos, user_id: user.id })
      .select()
      .single()
    if (error) return { error, atomico: false }

    const { error: errorSaldo } = await actualizarSaldoCredito(creditoId, Number(datos.monto))
    if (errorSaldo) {
      const { error: errorReversion } = await supabase.from('transacciones').delete().eq('id', data.id)
      return {
        error: errorReversion
          ? { code: 'OPERACION_REVERSION_INCOMPLETA', message: 'OPERACION_REVERSION_INCOMPLETA' }
          : errorSaldo,
        atomico: false,
      }
    }
    return { data, atomico: false }
  }

  const eliminarCompatibilidad = async (transaccion) => {
    if (['gastos_fijos', 'deuda', 'ahorro'].includes(transaccion.origen)) {
      return {
        error: { code: 'OPERACION_PROTEGIDA', message: 'OPERACION_PROTEGIDA' },
        atomico: false,
      }
    }
    const metodoId = transaccion.metodos_pago?.id ?? transaccion.metodo_pago_id
    const creditoId = metodos.find(m => m.id === metodoId)?.credito_id ?? null
    const [{ error }, { error: errorSaldo }] = await Promise.all([
      supabase.from('transacciones').delete().eq('id', transaccion.id),
      actualizarSaldoCredito(creditoId, -Number(transaccion.monto)),
    ])
    return { error: error || errorSaldo, atomico: false }
  }

  const eliminar = async (transaccion) => {
    const { error } = await supabase.rpc('eliminar_transaccion_atomica', {
      p_transaccion_id: transaccion.id,
    })
    const resultado = !error
      ? { atomico: true }
      : rpcNoDisponible(error, RPC_TRANSACCIONES)
      ? await eliminarCompatibilidad(transaccion)
      : { error }

    if (!resultado.error) invalidateTransacciones()
    return resultado
  }

  const actualizarCompatibilidad = async (id, nuevosDatos, transaccionOriginal) => {
    if (['gastos_fijos', 'deuda', 'ahorro'].includes(transaccionOriginal?.origen)) {
      return {
        error: { code: 'OPERACION_PROTEGIDA', message: 'OPERACION_PROTEGIDA' },
        atomico: false,
      }
    }
    const metodoAntId = transaccionOriginal?.metodos_pago?.id ?? transaccionOriginal?.metodo_pago_id
    const creditoAnt  = metodos.find(m => m.id === metodoAntId)?.credito_id ?? null
    const creditoNvo  = metodos.find(m => m.id === Number(nuevosDatos.metodo_pago_id))?.credito_id ?? null
    const montoAnt    = Number(transaccionOriginal?.monto ?? 0)
    const montoNvo    = Number(nuevosDatos.monto)

    const ajustes = []
    if (creditoAnt !== creditoNvo) {
      if (creditoAnt) ajustes.push(actualizarSaldoCredito(creditoAnt, -montoAnt))
      if (creditoNvo) ajustes.push(actualizarSaldoCredito(creditoNvo, +montoNvo))
    } else if (creditoNvo && montoAnt !== montoNvo) {
      ajustes.push(actualizarSaldoCredito(creditoNvo, montoNvo - montoAnt))
    }

    const [{ error }, ...resAjustes] = await Promise.all([
      supabase.from('transacciones').update(nuevosDatos).eq('id', id),
      ...ajustes,
    ])
    const errorAjuste = resAjustes.find(r => r?.error)?.error ?? null
    return { error: error || errorAjuste, atomico: false }
  }

  const actualizar = async (id, nuevosDatos, transaccionOriginal) => {
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
    const resultado = !error
      ? { atomico: true }
      : rpcNoDisponible(error, RPC_TRANSACCIONES)
      ? await actualizarCompatibilidad(id, nuevosDatos, transaccionOriginal)
      : { error }

    setSaving(false)
    if (!resultado.error) invalidateTransacciones()
    return resultado
  }

  const totales = {
    total:     transacciones?.reduce((s, t) => s + Number(t.monto), 0) ?? 0,
    necesidad: transacciones?.filter(t => t.clasificacion === 'necesidad').reduce((s, t) => s + Number(t.monto), 0) ?? 0,
    deseo:     transacciones?.filter(t => t.clasificacion === 'deseo').reduce((s, t) => s + Number(t.monto), 0) ?? 0,
    ahorro:    transacciones?.filter(t => t.clasificacion === 'ahorro').reduce((s, t) => s + Number(t.monto), 0) ?? 0,
  }

  return { transacciones: transacciones ?? [], categorias: categorias ?? [], metodos: metodos ?? [], loading, error, refetch, saving, totales, agregar, actualizar, eliminar }
}
