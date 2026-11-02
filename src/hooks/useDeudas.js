import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { invalidateQueryCache, useSupabaseQuery } from './useSupabaseQuery'
import { liberarOperacionId, obtenerOperacionId } from '../utils/operaciones'
import { montoMensualProgramado } from '../utils/pagosProgramados'

const pagoError = (code, message = code) => ({ code, message })
const valorBooleano = value => value === true || value === 'true'

const normalizarResultadoRpc = (data, montoSolicitado) => {
  const resultado = Array.isArray(data) ? data[0] : data
  if (!resultado) return { error: pagoError('PAGO_RESPUESTA_INVALIDA') }
  return {
    montoAplicado: Number(resultado.monto_aplicado),
    saldo: resultado.saldo_anterior == null ? null : Number(resultado.saldo_anterior),
    saldoNuevo: Number(resultado.saldo_nuevo),
    recortado: valorBooleano(resultado.recortado) || Number(resultado.monto_aplicado) < Number(montoSolicitado),
    duplicado: valorBooleano(resultado.duplicado),
    atomico: true,
  }
}

export function useDeudas() {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [pagosEnCurso, setPagosEnCurso] = useState(new Set())
  const pagosEnCursoRef = useRef(new Set())
  const operacionesPagoRef = useRef(new Map())

  const uid = user?.id
  // ── Deudas manuales ──────────────────────────────────────────────────────
  const { data: deudas, loading, error, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('deudas')
      .select('*, abonos_deuda(*)')
      .eq('user_id', user.id).eq('liquidada', false)
      .order('saldo_actual', { ascending: false })
    if (error) throw error
    return data ?? []
  }, [uid], `deudas:${uid}`)

  // ── Tarjetas con saldo pendiente (se muestran automáticamente como deudas) ──
  const { data: creditosConSaldo } = useSupabaseQuery(async () => {
    const { data } = await supabase
      .from('creditos')
      .select('id, nombre, saldo_utilizado, limite_credito, fecha_pago, pagos_credito(*)')
      .eq('user_id', user.id)
      .eq('activo', true)
      .gt('saldo_utilizado', 0)
      .order('saldo_utilizado', { ascending: false })
    return data ?? []
  }, [uid], `deudas:creditos:${uid}`)

  // Mapear créditos al mismo "shape" que una deuda para unificar la lista
  const tarjetasComoDeuda = (creditosConSaldo ?? []).map(c => ({
    id:                 `credito_${c.id}`,   // ID sintético para no colisionar
    credito_id:         c.id,
    nombre:             c.nombre,
    saldo_original:     c.limite_credito ?? c.saldo_utilizado,
    saldo_actual:       Number(c.saldo_utilizado),
    pago_mensual:       null,
    frecuencia_pago:    'mensual',
    tasa_interes:       null,
    fecha_pago_dia:      c.fecha_pago,
    fecha_proximo_pago: c.fecha_pago ? `día ${c.fecha_pago}` : null,
    notas:              null,
    liquidada:          false,
    tipo:               'credito',           // flag que usa la UI
    // Reutilizamos el campo abonos_deuda para el historial de pagos de la TDC
    abonos_deuda:       (c.pagos_credito ?? []).map(p => ({
      id: p.id, monto: p.monto, fecha: p.fecha, notas: p.notas,
    })),
  }))

  // Lista unificada: deudas manuales primero, luego tarjetas
  const todasDeudas = [...(deudas ?? []), ...tarjetasComoDeuda]

  const invalidateDeudas = () => invalidateQueryCache([
    'deudas:',
    'recordatorios:',
    'dash:',
    'plan:',
    'proyeccion:',
    'tendencias:',
  ])

  const invalidateCreditos = () => invalidateQueryCache([
    'creditos:',
    'deudas:',
    'recordatorios:',
    'dash:',
    'plan:',
    'proyeccion:',
    'tendencias:',
  ])

  // ── CRUD deudas manuales ─────────────────────────────────────────────────
  const agregar = async (datos) => {
    setSaving(true)
    const { error } = await supabase.from('deudas').insert({ ...datos, user_id: user.id })
    setSaving(false)
    if (!error) invalidateDeudas()
    return { error }
  }

  const ejecutarPagoBloqueado = async (key, operacion) => {
    const lockKey = String(key)
    if (pagosEnCursoRef.current.has(lockKey)) return { bloqueado: true }

    pagosEnCursoRef.current.add(lockKey)
    setPagosEnCurso(new Set(pagosEnCursoRef.current))
    try {
      return await operacion()
    } catch (error) {
      return { error }
    } finally {
      pagosEnCursoRef.current.delete(lockKey)
      setPagosEnCurso(new Set(pagosEnCursoRef.current))
    }
  }

  // Las RPC registran saldo, historial y gasto en una sola transacción
  // (supabase-pagos-atomicos.sql). Reintentar el mismo monto reutiliza el
  // operacion_id, así un doble envío no duplica el pago.
  const registrarPago = async ({ tipo, id, key, monto, notas }) => {
    const esCredito = tipo === 'credito'
    const operacionId = obtenerOperacionId(operacionesPagoRef.current, key, Number(monto).toFixed(2))
    const parametros = esCredito
      ? { p_credito_id: id, p_monto: Number(monto), p_notas: notas || null, p_operacion_id: operacionId }
      : { p_deuda_id: id, p_monto: Number(monto), p_notas: notas || null, p_operacion_id: operacionId }
    const { data, error } = await supabase.rpc(
      esCredito ? 'registrar_pago_credito' : 'registrar_pago_deuda',
      parametros
    )

    if (error) return { error }

    if (esCredito) invalidateCreditos()
    else invalidateDeudas()
    const resultado = normalizarResultadoRpc(data, monto)
    if (!resultado.error) liberarOperacionId(operacionesPagoRef.current, key)
    return resultado
  }

  const abonar = (deudaId, monto, notas = '') => ejecutarPagoBloqueado(
    deudaId,
    () => registrarPago({ tipo: 'deuda', id: deudaId, key: deudaId, monto, notas })
  )

  const abonarCredito = (creditoId, monto, notas = '') => {
    const key = `credito_${creditoId}`
    return ejecutarPagoBloqueado(
      key,
      () => registrarPago({ tipo: 'credito', id: creditoId, key, monto, notas })
    )
  }

  const actualizar = async (id, datos) => {
    setSaving(true)
    const payload = {
      nombre:             datos.nombre,
      saldo_actual:       Number(datos.saldo_actual),
      saldo_original:     Number(datos.saldo_original) || null,
      pago_mensual:       Number(datos.pago_mensual)   || null,
      frecuencia_pago:    datos.frecuencia_pago === 'quincenal' ? 'quincenal' : 'mensual',
      tasa_interes:       Number(datos.tasa_interes)   || null,
      fecha_proximo_pago: datos.fecha_proximo_pago     || null,
      notas:              datos.notas                  || null,
    }
    const { error } = await supabase.from('deudas').update(payload).eq('id', id)
    setSaving(false)
    if (!error) invalidateDeudas()
    return { error }
  }

  const eliminar = async (id) => {
    const { error } = await supabase.from('deudas').delete().eq('id', id)
    if (!error) invalidateDeudas()
    return { error }
  }

  // ── Totales y calculadora (usando la lista unificada) ────────────────────
  const totalDeuda       = todasDeudas.reduce((s, d) => s + Number(d.saldo_actual), 0)
  const totalPagoMensual = todasDeudas.reduce(
    (s, d) => s + montoMensualProgramado(d.pago_mensual, d.frecuencia_pago),
    0
  )
  const snowball  = [...todasDeudas].sort((a, b) => Number(a.saldo_actual) - Number(b.saldo_actual))
  const avalanche = [...todasDeudas].sort((a, b) => Number(b.tasa_interes ?? 0) - Number(a.tasa_interes ?? 0))

  return {
    deudas: todasDeudas,
    loading,
    error,
    refetch,
    saving,
    pagosEnCurso,
    totalDeuda,
    totalPagoMensual,
    snowball,
    avalanche,
    agregar,
    actualizar,
    abonar,
    abonarCredito,
    eliminar,
  }
}
