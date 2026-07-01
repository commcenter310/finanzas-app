import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useSupabaseQuery } from './useSupabaseQuery'
import { rangoQuincena, quincenaActual, calcNomina } from '../utils/constantes'

export function usePlanQuincena() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  // modo: 'q1' | 'q2' | 'mes'
  const [modo, setModo] = useState(`q${quincenaActual()}`)
  const [saving, setSaving] = useState(false)

  const esMes = modo === 'mes'
  const quincenaSel = modo === 'q2' ? 2 : 1
  const ultimoDia = new Date(anio, mes, 0).getDate()
  const mm = String(mes).padStart(2, '0')

  const rango = esMes
    ? { diaInicio: 1, diaFin: ultimoDia, fechaInicio: `${anio}-${mm}-01`, fechaFin: `${anio}-${mm}-${String(ultimoDia).padStart(2, '0')}` }
    : rangoQuincena(mes, anio, quincenaSel)

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
  }, [user?.id, mes, anio, modo])

  // ── Gastos fijos del mes ──────────────────────────────────────────────────
  const { data: gastosFijos, loading: loadingGF, refetch: refetchGF } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('gastos_fijos')
      .select('id, concepto, monto_previsto, clasificacion, dia_cobro, pagado')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
    if (error) throw error
    return data ?? []
  }, [user?.id, mes, anio])

  // ── Deudas activas con pago mensual ───────────────────────────────────────
  const { data: deudas, loading: loadingD, refetch: refetchD } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('deudas')
      .select('id, nombre, pago_mensual, fecha_proximo_pago')
      .eq('user_id', user.id).eq('liquidada', false)
      .gt('pago_mensual', 0)
    if (error) throw error
    return data ?? []
  }, [user?.id])

  // ── Metas de ahorro (para el form manual) ─────────────────────────────────
  const { data: metasAhorro } = useSupabaseQuery(async () => {
    const { data } = await supabase
      .from('ahorros').select('id, concepto')
      .eq('user_id', user.id)
    return data ?? []
  }, [user?.id])

  // ── Nómina principal (para estimar ingreso si no hay ingresos registrados) ─
  const { data: nominaPrincipal } = useSupabaseQuery(async () => {
    const { data } = await supabase
      .from('nominas').select('*')
      .eq('user_id', user.id)
      .order('es_principal', { ascending: false })
      .limit(1)
    return data?.[0] ?? null
  }, [user?.id])

  // ── Apartados persistidos del periodo ─────────────────────────────────────
  const { data: apartados, loading: loadingA, refetch } = useSupabaseQuery(async () => {
    let q = supabase.from('apartados').select('*')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
    if (!esMes) q = q.eq('quincena', quincenaSel)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  }, [user?.id, mes, anio, modo])

  // ── Ingreso del periodo ───────────────────────────────────────────────────
  const ingresoRegistrado = (ingresos ?? []).reduce(
    (s, i) => s + Number(i.monto_presupuesto || i.monto_actual || 0), 0)
  const ingresoRecibido = (ingresos ?? []).reduce(
    (s, i) => s + Number(i.monto_actual || 0), 0)

  // Estimado desde nómina principal (ordinario, sin prestaciones extraordinarias)
  const ordinarioMensual = nominaPrincipal ? calcNomina(nominaPrincipal).ingresoOrdinarioAnual / 12 : 0
  const ingresoEstimado = esMes ? ordinarioMensual : ordinarioMensual / 2

  const usandoEstimado = ingresoRegistrado === 0 && ingresoEstimado > 0
  const ingresoEsperado = ingresoRegistrado > 0 ? ingresoRegistrado : ingresoEstimado

  // ── Helpers de rango / quincena destino ───────────────────────────────────
  const diaDe = (fechaStr) => fechaStr ? Number(fechaStr.split('-')[2]) : null
  const quincenaDeDia = (dia) => dia != null ? (dia <= 15 ? 1 : 2) : quincenaActual()
  const quincenaManual = esMes ? quincenaActual() : quincenaSel

  const incluirPorDia = (dia) => {
    if (esMes) return true
    if (dia == null) return quincenaSel === 1
    return dia >= rango.diaInicio && dia <= rango.diaFin
  }

  const findApartado = (tipo, origenId) =>
    (apartados ?? []).find(a => a.tipo === tipo && a.origen_id === origenId)

  // ── Construir lista unificada de compromisos ──────────────────────────────
  const itemsFijos = (gastosFijos ?? [])
    .filter(g => incluirPorDia(g.dia_cobro))
    .map(g => ({
      key: `gf-${g.id}`, tipo: 'gasto_fijo', origen_id: g.id,
      concepto: g.concepto, montoSugerido: Number(g.monto_previsto),
      dia_cobro: g.dia_cobro, sinFecha: g.dia_cobro == null,
      pagado: g.pagado, apartadoRow: findApartado('gasto_fijo', g.id) ?? null,
    }))

  const itemsDeudas = (deudas ?? [])
    .filter(d => incluirPorDia(diaDe(d.fecha_proximo_pago)))
    .map(d => ({
      key: `de-${d.id}`, tipo: 'deuda', origen_id: d.id,
      concepto: d.nombre, montoSugerido: Number(d.pago_mensual),
      dia_cobro: diaDe(d.fecha_proximo_pago), sinFecha: d.fecha_proximo_pago == null,
      pagado: false, apartadoRow: findApartado('deuda', d.id) ?? null,
    }))

  const itemsManuales = (apartados ?? [])
    .filter(a => a.tipo === 'ahorro' || a.tipo === 'otro')
    .map(a => ({
      key: `ap-${a.id}`, tipo: a.tipo, origen_id: a.origen_id,
      concepto: a.concepto, montoSugerido: Number(a.monto),
      dia_cobro: null, sinFecha: true, pagado: false, apartadoRow: a,
    }))

  const compromisos = [...itemsFijos, ...itemsDeudas, ...itemsManuales]

  // ── Totales ───────────────────────────────────────────────────────────────
  const totalCompromisos = compromisos.reduce(
    (s, c) => s + Number(c.apartadoRow ? c.apartadoRow.monto : c.montoSugerido), 0)
  const totalApartado = (apartados ?? []).filter(a => a.apartado).reduce((s, a) => s + Number(a.monto), 0)
  const libreSiApartasTodo = ingresoEsperado - totalCompromisos
  const disponibleAhora    = ingresoEsperado - totalApartado
  const countApartados = (apartados ?? []).filter(a => a.apartado).length

  // ── Acciones ──────────────────────────────────────────────────────────────
  const apartar = async (item, montoOverride) => {
    setSaving(true)
    const monto = montoOverride != null ? Number(montoOverride) : Number(item.montoSugerido)
    const { error } = await supabase.from('apartados').insert({
      user_id: user.id, concepto: item.concepto, monto,
      tipo: item.tipo, origen_id: item.origen_id ?? null,
      mes, anio, quincena: quincenaDeDia(item.dia_cobro),
      apartado: true, fecha_apartado: new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const quitarApartado = async (apartadoId) => {
    setSaving(true)
    const { error } = await supabase.from('apartados').delete().eq('id', apartadoId)
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const editarMonto = async (apartadoId, monto) => {
    setSaving(true)
    const { error } = await supabase.from('apartados').update({ monto: Number(monto) }).eq('id', apartadoId)
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const agregarManual = async ({ concepto, monto, tipo, origen_id }) => {
    setSaving(true)
    const { error } = await supabase.from('apartados').insert({
      user_id: user.id, concepto, monto: Number(monto),
      tipo: tipo ?? 'otro', origen_id: origen_id ?? null,
      mes, anio, quincena: quincenaManual,
      apartado: true, fecha_apartado: new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const apartarTodo = async () => {
    const pendientes = compromisos.filter(c => !c.apartadoRow)
    if (pendientes.length === 0) return
    setSaving(true)
    const hoy = new Date().toISOString().split('T')[0]
    const filas = pendientes.map(c => ({
      user_id: user.id, concepto: c.concepto, monto: Number(c.montoSugerido),
      tipo: c.tipo, origen_id: c.origen_id ?? null,
      mes, anio, quincena: quincenaDeDia(c.dia_cobro),
      apartado: true, fecha_apartado: hoy,
    }))
    const { error } = await supabase.from('apartados').insert(filas)
    setSaving(false)
    if (!error) refetch()
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
