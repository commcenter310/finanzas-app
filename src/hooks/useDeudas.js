import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { invalidateQueryCache, useSupabaseQuery } from './useSupabaseQuery'
import { ensureCategoria } from '../utils/categorias'
import { fechaLocalISO } from '../utils/fecha'
import { crearOperacionPago, prepararPago, rpcPagoNoDisponible } from '../utils/pagos'
import { montoMensualProgramado } from '../utils/pagosProgramados'

const pagoError = (code, message = code) => ({ code, message })
const valorBooleano = value => value === true || value === 'true'
const faltaColumnaFrecuencia = error =>
  ['PGRST204', '42703'].includes(error?.code)
  || String(error?.message ?? '').includes('frecuencia_pago')

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
    let { error } = await supabase.from('deudas').insert({ ...datos, user_id: user.id })
    if (faltaColumnaFrecuencia(error) && datos.frecuencia_pago !== 'quincenal') {
      const datosCompatibles = { ...datos }
      delete datosCompatibles.frecuencia_pago
      ;({ error } = await supabase.from('deudas').insert({ ...datosCompatibles, user_id: user.id }))
    }
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

  const obtenerOperacionPago = (key, monto) => {
    const lockKey = String(key)
    const firmaMonto = Number(monto).toFixed(2)
    const pendiente = operacionesPagoRef.current.get(lockKey)
    if (pendiente?.firmaMonto === firmaMonto) return pendiente.id

    const id = crearOperacionPago()
    operacionesPagoRef.current.set(lockKey, { id, firmaMonto })
    return id
  }

  const registrarPagoCompatibilidad = async ({ tipo, id, monto, notas = '' }) => {
    const esCredito = tipo === 'credito'
    const tablaCuenta = esCredito ? 'creditos' : 'deudas'
    const saldoCampo = esCredito ? 'saldo_utilizado' : 'saldo_actual'
    const tablaHistorial = esCredito ? 'pagos_credito' : 'abonos_deuda'
    const hoy = fechaLocalISO()

    let cuentaQuery = supabase.from(tablaCuenta)
      .select(`id, nombre, ${saldoCampo}`)
      .eq('id', id)
      .eq('user_id', user.id)
    if (esCredito) cuentaQuery = cuentaQuery.eq('activo', true)

    const { data: cuenta, error: errorCuenta } = await cuentaQuery.maybeSingle()
    if (errorCuenta) return { error: errorCuenta }
    if (!cuenta) return { error: pagoError('PAGO_NO_ENCONTRADO') }

    const pago = prepararPago(monto, cuenta[saldoCampo])
    if (pago.error) return pago

    const catId = await ensureCategoria(user.id, {
      nombre: 'Deudas',
      icono: '💳',
      clasificacion: 'necesidad',
    })
    const historialPayload = esCredito
      ? { credito_id: id, user_id: user.id, monto: pago.montoAplicado, fecha: hoy, notas: notas || null }
      : { deuda_id: id, monto: pago.montoAplicado, fecha: hoy, notas: notas || null }
    const { data: historial, error: errorHistorial } = await supabase
      .from(tablaHistorial)
      .insert(historialPayload)
      .select('id')
      .single()
    if (errorHistorial) return { error: errorHistorial }

    const saldoPayload = esCredito
      ? { saldo_utilizado: pago.saldoNuevo }
      : { saldo_actual: pago.saldoNuevo, liquidada: pago.liquida }
    const { data: cuentaActualizada, error: errorSaldo } = await supabase
      .from(tablaCuenta)
      .update(saldoPayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .eq(saldoCampo, pago.saldoAnterior)
      .select('id')
      .maybeSingle()

    if (errorSaldo || !cuentaActualizada) {
      await supabase.from(tablaHistorial).delete().eq('id', historial.id)
      return { error: errorSaldo || pagoError('PAGO_CONCURRENCIA') }
    }

    const { error: errorTransaccion } = await supabase.from('transacciones').insert({
      user_id: user.id,
      descripcion: `${esCredito ? 'Pago tarjeta' : 'Pago deuda'}: ${cuenta.nombre}`,
      monto: pago.montoAplicado,
      clasificacion: 'necesidad',
      categoria_id: catId,
      fecha: hoy,
      origen: 'deuda',
    })

    if (errorTransaccion) {
      const restaurarPayload = esCredito
        ? { saldo_utilizado: pago.saldoAnterior }
        : { saldo_actual: pago.saldoAnterior, liquidada: false }
      const [restauracion, borrado] = await Promise.all([
        supabase.from(tablaCuenta)
          .update(restaurarPayload)
          .eq('id', id)
          .eq('user_id', user.id)
          .eq(saldoCampo, pago.saldoNuevo)
          .select('id')
          .maybeSingle(),
        supabase.from(tablaHistorial).delete().eq('id', historial.id),
      ])
      if (restauracion.error || !restauracion.data || borrado.error) {
        return { error: pagoError('PAGO_REVERSION_INCOMPLETA') }
      }
      return { error: errorTransaccion }
    }

    if (esCredito) invalidateCreditos()
    else invalidateDeudas()
    return { ...pago, atomico: false }
  }

  const registrarPago = async ({ tipo, id, key, monto, notas }) => {
    const esCredito = tipo === 'credito'
    const operacionId = obtenerOperacionPago(key, monto)
    const parametros = esCredito
      ? { p_credito_id: id, p_monto: Number(monto), p_notas: notas || null, p_operacion_id: operacionId }
      : { p_deuda_id: id, p_monto: Number(monto), p_notas: notas || null, p_operacion_id: operacionId }
    const { data, error } = await supabase.rpc(
      esCredito ? 'registrar_pago_credito' : 'registrar_pago_deuda',
      parametros
    )

    let resultado
    if (!error) {
      if (esCredito) invalidateCreditos()
      else invalidateDeudas()
      resultado = normalizarResultadoRpc(data, monto)
    } else if (rpcPagoNoDisponible(error)) {
      resultado = await registrarPagoCompatibilidad({ tipo, id, monto, notas })
    } else {
      resultado = { error }
    }

    if (!resultado.error) operacionesPagoRef.current.delete(String(key))
    return resultado
  }

  const abonar = (deudaId, monto, notas = '') => ejecutarPagoBloqueado(
    deudaId,
    () => registrarPago({ tipo: 'deuda', id: deudaId, key: deudaId, monto, notas })
  )

  // El saldo, historial y gasto se escriben en una sola transacción cuando las RPC están instaladas.
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
    let { error } = await supabase.from('deudas').update(payload).eq('id', id)
    if (faltaColumnaFrecuencia(error) && payload.frecuencia_pago !== 'quincenal') {
      const payloadCompatible = { ...payload }
      delete payloadCompatible.frecuencia_pago
      ;({ error } = await supabase.from('deudas').update(payloadCompatible).eq('id', id))
    }
    setSaving(false)
    if (!error) invalidateDeudas()
    return { error }
  }

  const eliminar = async (id) => {
    await supabase.from('deudas').delete().eq('id', id)
    invalidateDeudas()
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
