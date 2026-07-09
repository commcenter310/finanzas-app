import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { invalidateQueryCache, useSupabaseQuery } from './useSupabaseQuery'
import { fechaLocalISO } from '../utils/fecha'

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

  const { data: metodos } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('metodos_pago')
      .select('id, nombre, tipo, credito_id')
      .eq('user_id', user.id).eq('activo', true)
    return data ?? []
  }, [user?.id], `metodos:${user?.id}`)

  // Ajuste atómico del saldo de la tarjeta cuando el gasto fijo se paga con TDC
  const ajustarSaldoCredito = (metodoPagoId, delta) => {
    const creditoId = metodos?.find(m => m.id === Number(metodoPagoId))?.credito_id
    if (!creditoId) return Promise.resolve()
    return supabase.rpc('update_saldo_credito', { p_credito_id: creditoId, p_delta: delta })
  }

  const totales = {
    previsto: gastos?.reduce((s, g) => s + Number(g.monto_previsto), 0) ?? 0,
    actual:   gastos?.reduce((s, g) => s + Number(g.monto_actual), 0) ?? 0,
    pagados:  gastos?.filter(g => g.pagado).length ?? 0,
  }

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
      refetch()
      invalidateGastosFijos()
    }
    return { error }
  }

  const actualizar = async (id, datos) => {
    setSaving(true)
    const { error } = await supabase.from('gastos_fijos').update(datos).eq('id', id)
    setSaving(false)
    if (!error) {
      refetch()
      invalidateGastosFijos()
    }
    return { error }
  }

  // opciones: { monto, fecha } — monto/fecha REALES del pago (si difieren de lo previsto)
  const togglePagado = async (gasto, opciones = {}) => {
    const hoy = fechaLocalISO()
    if (!gasto.pagado) {
      const montoReal = opciones.monto != null && opciones.monto !== '' ? Number(opciones.monto) : Number(gasto.monto_previsto)
      const fechaReal = opciones.fecha || hoy
      // Marcar como pagado → crear transacción en Control de Gastos
      // (con el método del gasto fijo: si es tarjeta, alimenta su ciclo de corte)
      const txPayload = {
        user_id: user.id,
        descripcion: gasto.concepto,
        monto: montoReal,
        clasificacion: gasto.clasificacion,
        categoria_id: gasto.categoria_id ?? null,
        fecha: fechaReal,
        origen: 'gastos_fijos',
      }
      if (gasto.metodo_pago_id) txPayload.metodo_pago_id = gasto.metodo_pago_id
      const [{ data: tx }] = await Promise.all([
        supabase.from('transacciones').insert(txPayload).select('id').single(),
        ajustarSaldoCredito(gasto.metodo_pago_id, montoReal),
      ])
      await supabase.from('gastos_fijos').update({
        pagado: true,
        monto_actual: montoReal,
        fecha_pago: fechaReal,
        transaccion_id: tx?.id ?? null,
      }).eq('id', gasto.id)
    } else {
      // Desmarcar → borrar la transacción vinculada y revertir el saldo de la TDC
      await Promise.all([
        gasto.transaccion_id
          ? supabase.from('transacciones').delete().eq('id', gasto.transaccion_id)
          : Promise.resolve(),
        ajustarSaldoCredito(gasto.metodo_pago_id, -Number(gasto.monto_actual || 0)),
      ])
      await supabase.from('gastos_fijos').update({
        pagado: false,
        monto_actual: 0,
        fecha_pago: null,
        transaccion_id: null,
      }).eq('id', gasto.id)
    }
    refetch()
    invalidatePagoGastoFijo()
  }

  const eliminar = async (id) => {
    await supabase.from('gastos_fijos').delete().eq('id', id)
    refetch()
    invalidateGastosFijos()
  }

  const copiarRecurrentes = async () => {
    const mesAnterior  = mes === 1 ? 12 : mes - 1
    const anioAnterior = mes === 1 ? anio - 1 : anio

    const { data: recurrentes } = await supabase
      .from('gastos_fijos')
      .select('concepto, categoria_id, monto_previsto, clasificacion, es_recurrente, dia_cobro, metodo_pago_id')
      .eq('user_id', user.id).eq('mes', mesAnterior).eq('anio', anioAnterior).eq('es_recurrente', true)

    if (!recurrentes?.length) return { copiados: 0 }

    const nuevos = recurrentes.map(r => ({ ...r, user_id: user.id, mes, anio, pagado: false, monto_actual: 0 }))
    await supabase.from('gastos_fijos').insert(nuevos)
    refetch()
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

  return { gastos: gastos ?? [], categorias: categorias ?? [], metodos: metodos ?? [], loading, error, refetch, saving, totales, agregar, actualizar, togglePagado, eliminar, copiarRecurrentes, autoCopiadosCount }
}
