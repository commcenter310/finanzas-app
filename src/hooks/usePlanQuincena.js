import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { invalidateQueryCache, useSupabaseQuery } from './useSupabaseQuery'
import { useNominasLista } from './useCatalogos'
import { quincenaActual } from '../utils/constantes'
import { fechaLocalISO } from '../utils/fecha'
import { construirPlanQuincena, rangoPeriodo } from '../utils/planificacion'

export function usePlanQuincena() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const uid = user?.id
  // modo: 'q1' | 'q2' | 'mes'
  const [modo, setModo] = useState(`q${quincenaActual()}`)
  const [saving, setSaving] = useState(false)

  const esMes = modo === 'mes'
  const quincenaSel = modo === 'q2' ? 2 : 1
  const rango = rangoPeriodo(modo, mes, anio)

  // ── Ingresos del periodo (automático por fecha_recepcion) ─────────────────
  const { data: ingresos, loading: loadingIng, error: errIng, refetch: refetchIng } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('ingresos')
      .select('id, concepto, monto_presupuesto, monto_actual, fecha_recepcion')
      .eq('user_id', user.id)
      .gte('fecha_recepcion', rango.fechaInicio)
      .lte('fecha_recepcion', rango.fechaFin)
    if (error) throw error
    return data ?? []
  }, [uid, mes, anio, modo], `plan:ingresos:${uid}:${mes}:${anio}:${modo}`)

  // ── Gastos fijos del mes ──────────────────────────────────────────────────
  const { data: gastosFijos, loading: loadingGF, refetch: refetchGF } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('gastos_fijos')
      .select('id, concepto, monto_previsto, clasificacion, dia_cobro, pagado')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
    if (error) throw error
    return data ?? []
  }, [uid, mes, anio], `plan:fijos:${uid}:${mes}:${anio}`)

  // ── Deudas activas con pago mensual ───────────────────────────────────────
  const { data: deudas, loading: loadingD, refetch: refetchD } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('deudas')
      .select('*')
      .eq('user_id', user.id).eq('liquidada', false)
      .gt('pago_mensual', 0)
    if (error) throw error
    return data ?? []
  }, [uid], `plan:deudas:${uid}`)

  // ── Metas de ahorro (para el form manual) ─────────────────────────────────
  const { data: metasAhorro } = useSupabaseQuery(async () => {
    const { data } = await supabase
      .from('ahorros').select('id, concepto')
      .eq('user_id', user.id)
    return data ?? []
  }, [uid], `plan:ahorros:${uid}`)

  // ── Nómina principal (para estimar ingreso si no hay ingresos registrados) ─
  // La lista viene ordenada con la principal primero
  const { nominas } = useNominasLista()
  const nominaPrincipal = nominas[0] ?? null

  // ── Apartados persistidos del periodo ─────────────────────────────────────
  const { data: apartados, loading: loadingA, refetch } = useSupabaseQuery(async () => {
    let q = supabase.from('apartados').select('*')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
    if (!esMes) q = q.eq('quincena', quincenaSel)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  }, [uid, mes, anio, modo], `plan:apartados:${uid}:${mes}:${anio}:${modo}`)

  const invalidateApartados = () => invalidateQueryCache(['plan:', 'dash:'])

  // ── Compromisos y totales del periodo (lógica pura en utils/planificacion) ─
  const {
    ingresoEsperado, ingresoRecibido, ingresoEstimado, usandoEstimado,
    quincenaDeDia, quincenaManual,
    compromisos, totalCompromisos, totalApartado, libreSiApartasTodo, disponibleAhora, countApartados,
  } = construirPlanQuincena({
    modo, mes, anio,
    ingresos: ingresos ?? [],
    gastosFijos: gastosFijos ?? [],
    deudas: deudas ?? [],
    apartados: apartados ?? [],
    nominaPrincipal,
  })

  // ── Acciones ──────────────────────────────────────────────────────────────
  const apartar = async (item, montoOverride) => {
    setSaving(true)
    const monto = montoOverride != null ? Number(montoOverride) : Number(item.montoSugerido)
    const { error } = await supabase.from('apartados').insert({
      user_id: user.id, concepto: item.concepto, monto,
      tipo: item.tipo, origen_id: item.origen_id ?? null,
      mes, anio, quincena: quincenaDeDia(item.dia_cobro),
      apartado: true, fecha_apartado: fechaLocalISO(),
    })
    setSaving(false)
    if (!error) invalidateApartados()
    return { error }
  }

  const quitarApartado = async (apartadoId) => {
    setSaving(true)
    const { error } = await supabase.from('apartados').delete().eq('id', apartadoId)
    setSaving(false)
    if (!error) invalidateApartados()
    return { error }
  }

  const editarMonto = async (apartadoId, monto) => {
    setSaving(true)
    const { error } = await supabase.from('apartados').update({ monto: Number(monto) }).eq('id', apartadoId)
    setSaving(false)
    if (!error) invalidateApartados()
    return { error }
  }

  const agregarManual = async ({ concepto, monto, tipo, origen_id }) => {
    setSaving(true)
    const { error } = await supabase.from('apartados').insert({
      user_id: user.id, concepto, monto: Number(monto),
      tipo: tipo ?? 'otro', origen_id: origen_id ?? null,
      mes, anio, quincena: quincenaManual,
      apartado: true, fecha_apartado: fechaLocalISO(),
    })
    setSaving(false)
    if (!error) invalidateApartados()
    return { error }
  }

  const apartarTodo = async () => {
    const pendientes = compromisos.filter(c => !c.apartadoRow)
    if (pendientes.length === 0) return { error: null }
    setSaving(true)
    const hoy = fechaLocalISO()
    const filas = pendientes.map(c => ({
      user_id: user.id, concepto: c.concepto, monto: Number(c.montoSugerido),
      tipo: c.tipo, origen_id: c.origen_id ?? null,
      mes, anio, quincena: quincenaDeDia(c.dia_cobro),
      apartado: true, fecha_apartado: hoy,
    }))
    const { error } = await supabase.from('apartados').insert(filas)
    setSaving(false)
    if (!error) invalidateApartados()
    return { error }
  }

  return {
    modo, setModo, esMes, rango,
    loading: loadingIng || loadingGF || loadingD || loadingA,
    error: errIng || null,
    recargar: () => { refetchIng(); refetchGF(); refetchD(); refetch() },
    saving,
    ingresos: ingresos ?? [],
    ingresoEsperado, ingresoRecibido, ingresoEstimado, usandoEstimado,
    compromisos,
    metasAhorro: metasAhorro ?? [],
    totalCompromisos, totalApartado, libreSiApartasTodo, disponibleAhora, countApartados,
    apartar, quitarApartado, editarMonto, agregarManual, apartarTodo,
  }
}
