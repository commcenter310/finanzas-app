import { useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useSupabaseQuery } from './useSupabaseQuery'
import { formatMXN } from '../utils/constantes'
import {
  diasEnMes,
  diffDias,
  estadoPorDias,
  fechaPorDia,
  inicioDia,
  resolverVencimientoMensual,
} from '../utils/pagosProgramados'

export const formatoFechaRecordatorio = (fecha) =>
  fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

export const textoDiasRecordatorio = (dias) => {
  if (dias < 0) return `Hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  return `En ${dias} días`
}

export function useRecordatorios() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const uid = user?.id
  const hoyBase = new Date()
  const hoyKey = `${hoyBase.getFullYear()}-${hoyBase.getMonth() + 1}-${hoyBase.getDate()}`

  const { data: gastos, loading: loadingGastos, error: errorGastos, refetch: refetchGastos } = useSupabaseQuery(async () => {
    if (!uid) return []
    const { data, error } = await supabase
      .from('gastos_fijos')
      .select('id, concepto, monto_previsto, monto_actual, pagado, dia_cobro, categorias(nombre, icono)')
      .eq('user_id', uid)
      .eq('mes', mes)
      .eq('anio', anio)
      .order('dia_cobro', { ascending: true, nullsFirst: false })
    if (error) throw error
    return data ?? []
  }, [uid, mes, anio], `recordatorios:gastos:${uid}:${mes}:${anio}`)

  const { data: deudas, loading: loadingDeudas, error: errorDeudas, refetch: refetchDeudas } = useSupabaseQuery(async () => {
    if (!uid) return []
    const { data, error } = await supabase
      .from('deudas')
      .select('id, nombre, saldo_actual, pago_mensual, fecha_proximo_pago, abonos_deuda(id, monto, fecha)')
      .eq('user_id', uid)
      .eq('liquidada', false)
    if (error) throw error
    return data ?? []
  }, [uid], `recordatorios:deudas:${uid}`)

  const { data: creditos, loading: loadingCreditos, error: errorCreditos, refetch: refetchCreditos } = useSupabaseQuery(async () => {
    if (!uid) return []
    const { data, error } = await supabase
      .from('creditos')
      .select('id, nombre, saldo_utilizado, limite_credito, fecha_pago, pagos_credito(id, monto, fecha)')
      .eq('user_id', uid)
      .eq('activo', true)
    if (error) throw error
    return data ?? []
  }, [uid], `recordatorios:creditos:${uid}`)

  const calculado = useMemo(() => {
    const hoyPartes = hoyKey.split('-').map(Number)
    const hoy = new Date(hoyPartes[0], hoyPartes[1] - 1, hoyPartes[2])
    const esMesActual = mes === hoy.getMonth() + 1 && anio === hoy.getFullYear()
    const inicioMes = fechaPorDia(anio, mes, 1)
    const finMes = fechaPorDia(anio, mes, diasEnMes(anio, mes))

    const enRango = (fecha) => {
      const f = inicioDia(fecha)
      if (f >= inicioMes && f <= finMes) return true
      return esMesActual && f < inicioDia(hoy)
    }

    const recordatorios = [
      ...(gastos ?? [])
        .filter(g => !g.pagado && g.dia_cobro)
        .map(g => {
          const fecha = fechaPorDia(anio, mes, g.dia_cobro)
          const dias = diffDias(fecha, hoy)
          return {
            id: `fijo-${g.id}`,
            tipo: 'fijo',
            titulo: g.concepto,
            monto: Number(g.monto_actual ?? g.monto_previsto ?? 0),
            fecha,
            dias,
            estado: estadoPorDias(dias),
            detalle: g.categorias ? `${g.categorias.icono ?? ''} ${g.categorias.nombre}`.trim() : null,
            to: '/gastos-fijos',
            action: 'Pagar',
          }
        }),
      ...(deudas ?? [])
        .filter(d => Number(d.saldo_actual ?? 0) > 0 && d.fecha_proximo_pago)
        .map(d => {
          const vencimiento = resolverVencimientoMensual({
            fechaBaseISO: d.fecha_proximo_pago,
            pagos: d.abonos_deuda,
            montoObjetivo: d.pago_mensual,
            saldoActual: d.saldo_actual,
            hoy,
          })
          const fecha = vencimiento?.fecha
          const dias = vencimiento?.dias
          return {
            id: `deuda-${d.id}`,
            tipo: 'deuda',
            titulo: d.nombre,
            monto: Number(d.pago_mensual ?? d.saldo_actual ?? 0),
            fecha,
            dias,
            estado: vencimiento?.estado,
            detalle: `Saldo actual: ${formatMXN(d.saldo_actual)}`,
            to: '/deudas',
            action: 'Abonar',
          }
        }),
      ...(creditos ?? [])
        .filter(c => Number(c.saldo_utilizado ?? 0) > 0 && c.fecha_pago)
        .map(c => {
          const vencimiento = resolverVencimientoMensual({
            diaPago: c.fecha_pago,
            mes,
            anio,
            pagos: c.pagos_credito,
            hoy,
            ventanaInicio: 'mes',
          })
          const fecha = vencimiento?.fecha
          const dias = vencimiento?.dias
          const uso = Number(c.limite_credito) > 0
            ? (Number(c.saldo_utilizado ?? 0) / Number(c.limite_credito)) * 100
            : null
          return {
            id: `credito-${c.id}`,
            tipo: 'credito',
            titulo: c.nombre,
            monto: Number(c.saldo_utilizado ?? 0),
            fecha,
            dias,
            estado: vencimiento?.estado,
            detalle: uso != null ? `Uso de línea: ${uso.toFixed(0)}%` : 'Saldo utilizado pendiente',
            to: '/creditos',
            action: 'Ver tarjeta',
          }
        }),
    ]
      .filter(item => item.fecha && enRango(item.fecha))
      .sort((a, b) => a.dias - b.dias || b.monto - a.monto)

    const sinFecha = [
      ...(gastos ?? [])
        .filter(g => !g.pagado && !g.dia_cobro)
        .map(g => ({ id: `fijo-sin-${g.id}`, tipo: 'fijo', titulo: g.concepto, to: '/gastos-fijos' })),
      ...(deudas ?? [])
        .filter(d => Number(d.saldo_actual ?? 0) > 0 && !d.fecha_proximo_pago)
        .map(d => ({ id: `deuda-sin-${d.id}`, tipo: 'deuda', titulo: d.nombre, to: '/deudas' })),
      ...(creditos ?? [])
        .filter(c => Number(c.saldo_utilizado ?? 0) > 0 && !c.fecha_pago)
        .map(c => ({ id: `credito-sin-${c.id}`, tipo: 'credito', titulo: c.nombre, to: '/creditos' })),
    ]

    const vencidos = recordatorios.filter(r => r.dias < 0)
    const proximos = recordatorios.filter(r => r.dias >= 0 && r.dias <= 7)
    const inmediatos = recordatorios.filter(r => r.dias <= 7)
    const masTarde = recordatorios.filter(r => r.dias > 7)
    const montoPendiente = recordatorios.reduce((s, r) => s + Number(r.monto ?? 0), 0)

    return {
      recordatorios,
      sinFecha,
      vencidos,
      proximos,
      inmediatos,
      masTarde,
      montoPendiente,
      totalPendientes: recordatorios.length,
      totalAcciones: recordatorios.length + sinFecha.length,
    }
  }, [anio, creditos, deudas, gastos, hoyKey, mes])

  const refetch = useCallback(
    () => Promise.all([refetchGastos(), refetchDeudas(), refetchCreditos()]),
    [refetchCreditos, refetchDeudas, refetchGastos]
  )

  return {
    ...calculado,
    loading: loadingGastos || loadingDeudas || loadingCreditos,
    error: errorGastos || errorDeudas || errorCreditos,
    refetch,
  }
}
