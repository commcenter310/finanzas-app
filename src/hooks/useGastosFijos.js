import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { invalidateQueryCache, useSupabaseQuery } from './useSupabaseQuery'
import { useCategorias, useMetodosPago } from './useCatalogos'
import { fechaLocalISO, mesAnterior } from '../utils/fecha'
import { liberarOperacionId, obtenerOperacionId } from '../utils/operaciones'
import { totalesGastosFijos } from '../utils/calculos'

export function useGastosFijos() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const [saving, setSaving] = useState(false)
  const [autoCopiadosCount, setAutoCopiadosCount] = useState(0)
  // Ref para evitar auto-copiar más de una vez por mes/año
  const autoCopiadoKeyRef = useRef(null)
  const operacionesPagoRef = useRef(new Map())

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

  const categorias = useCategorias()
  const metodos = useMetodosPago()

  const totales = totalesGastosFijos(gastos)

  const invalidateGastosFijos = () => invalidateQueryCache([
    'dash:',
    'recordatorios:',
    'plan:',
    'proyeccion:',
    'tendencias:',
  ])

  const invalidatePagoGastoFijo = () => invalidateQueryCache([
    'dash:',
    'recordatorios:',
    'plan:',
    'proyeccion:',
    'tendencias:',
    'tx:',
    'creditos:',
    'deudas:',
    'gastosVariables:',
  ])

  const agregar = async (datos) => {
    setSaving(true)
    const { error } = await supabase.from('gastos_fijos').insert({ ...datos, user_id: user.id, mes, anio })
    setSaving(false)
    if (!error) {
      refetch({ silent: true })   // sin skeleton: evita el "flashazo" tras guardar
      invalidateGastosFijos()
    }
    return { error }
  }

  const actualizar = async (id, datos) => {
    setSaving(true)
    const { error } = await supabase.from('gastos_fijos').update(datos).eq('id', id)
    setSaving(false)
    if (!error) {
      refetch({ silent: true })   // sin skeleton: evita el "flashazo" tras guardar
      invalidateGastosFijos()
    }
    return { error }
  }

  // Pagar crea la transacción en Control de Gastos (con el método del gasto
  // fijo: si es tarjeta, suma a su saldo) y marca el gasto; desmarcar lo
  // revierte. Ambas van por RPC en una sola transacción de la base de datos.
  // opciones: { monto, fecha } — monto/fecha REALES del pago (si difieren de lo previsto)
  const togglePagado = async (gasto, opciones = {}) => {
    setSaving(true)
    let error

    if (!gasto.pagado) {
      const monto = opciones.monto != null && opciones.monto !== ''
        ? Number(opciones.monto)
        : Number(gasto.monto_previsto)
      const fecha = opciones.fecha || fechaLocalISO()
      const key = `pagar:${gasto.id}`
      const operacionId = obtenerOperacionId(operacionesPagoRef.current, key, {
        monto,
        fecha,
        metodo_pago_id: gasto.metodo_pago_id ?? null,
      })
      ;({ error } = await supabase.rpc('pagar_gasto_fijo_atomico', {
        p_gasto_id: gasto.id,
        p_monto: monto,
        p_fecha: fecha,
        p_operacion_id: operacionId,
      }))
      if (!error) liberarOperacionId(operacionesPagoRef.current, key)
    } else {
      ;({ error } = await supabase.rpc('desmarcar_gasto_fijo_atomico', { p_gasto_id: gasto.id }))
    }

    setSaving(false)
    if (!error) {
      refetch({ silent: true })   // sin skeleton: evita el "flashazo" tras guardar
      invalidatePagoGastoFijo()
    }
    return { error }
  }

  // Antes de borrar siempre se desmarca (RPC): si estaba pagado, eso borra su
  // movimiento en Control de Gastos y devuelve el cargo a la tarjeta; si no lo
  // estaba, no hace nada. Se pregunta a la base de datos y no a la lista en
  // pantalla, que puede estar desactualizada (pagado desde otro dispositivo).
  const eliminar = async (id) => {
    let { error } = await supabase.rpc('desmarcar_gasto_fijo_atomico', { p_gasto_id: id })
    if (!error) ({ error } = await supabase.from('gastos_fijos').delete().eq('id', id))
    refetch({ silent: true })
    invalidatePagoGastoFijo()
    return { error }
  }

  const copiarRecurrentes = async () => {
    const prev = mesAnterior(mes, anio)

    const { data: recurrentes, error: errorLectura } = await supabase
      .from('gastos_fijos')
      .select('concepto, categoria_id, monto_previsto, clasificacion, es_recurrente, dia_cobro, metodo_pago_id')
      .eq('user_id', user.id).eq('mes', prev.mes).eq('anio', prev.anio).eq('es_recurrente', true)

    if (errorLectura) return { copiados: 0, error: errorLectura }
    if (!recurrentes?.length) return { copiados: 0 }

    const nuevos = recurrentes.map(r => ({ ...r, user_id: user.id, mes, anio, pagado: false, monto_actual: 0 }))
    const { error } = await supabase.from('gastos_fijos').insert(nuevos)
    if (error) return { copiados: 0, error }
    refetch({ silent: true })
    invalidateGastosFijos()
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

  return { gastos: gastos ?? [], categorias, metodos, loading, error, refetch, saving, totales, agregar, actualizar, togglePagado, eliminar, copiarRecurrentes, autoCopiadosCount }
}
