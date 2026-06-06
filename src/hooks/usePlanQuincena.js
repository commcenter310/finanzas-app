import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useSupabaseQuery } from './useSupabaseQuery'
import { rangoQuincena, quincenaActual } from '../utils/constantes'

export function usePlanQuincena() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const [quincena, setQuincena] = useState(quincenaActual())
  const [saving, setSaving] = useState(false)

  const rango = rangoQuincena(mes, anio, quincena)

  // ── Ingresos de la quincena (automático por fecha_recepcion) ──────────────
  const { data: ingresos, loading: loadingIng } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('ingresos')
      .select('id, concepto, monto_presupuesto, monto_actual, fecha_recepcion')
      .eq('user_id', user.id)
      .gte('fecha_recepcion', rango.fechaInicio)
      .lte('fecha_recepcion', rango.fechaFin)
    if (error) throw error
    return data ?? []
  }, [user?.id, mes, anio, quincena])

  // ── Gastos fijos del mes (se filtran por dia_cobro en cliente) ────────────
  const { data: gastosFijos, loading: loadingGF } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('gastos_fijos')
      .select('id, concepto, monto_previsto, clasificacion, dia_cobro, pagado')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
    if (error) throw error
    return data ?? []
  }, [user?.id, mes, anio])

  // ── Deudas activas con pago mensual ───────────────────────────────────────
  const { data: deudas, loading: loadingD } = useSupabaseQuery(async () => {
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
      .from('ahorros')
      .select('id, concepto')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
    return data ?? []
  }, [user?.id, mes, anio])

  // ── Apartados persistidos de esta quincena ────────────────────────────────
  const { data: apartados, loading: loadingA, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('apartados')
      .select('*')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio).eq('quincena', quincena)
    if (error) throw error
    return data ?? []
  }, [user?.id, mes, anio, quincena])

  // ── Ingreso de la quincena ────────────────────────────────────────────────
  const ingresoEsperado = (ingresos ?? []).reduce(
    (s, i) => s + Number(i.monto_presupuesto || i.monto_actual || 0), 0)
  const ingresoRecibido = (ingresos ?? []).reduce(
    (s, i) => s + Number(i.monto_actual || 0), 0)

  // ── Busca el apartado que corresponde a una sugerencia (dedupe) ───────────
  const findApartado = (tipo, origenId) =>
    (apartados ?? []).find(a => a.tipo === tipo && a.origen_id === origenId)

  // ── Construir lista unificada de compromisos ──────────────────────────────
  const enRango = (dia) => dia != null && dia >= rango.diaInicio && dia <= rango.diaFin

  // Gastos fijos cuyo día de cobro cae en la quincena (o sin día → solo Q1)
  const itemsFijos = (gastosFijos ?? [])
    .filter(g => g.dia_cobro != null ? enRango(g.dia_cobro) : quincena === 1)
    .map(g => {
      const ap = findApartado('gasto_fijo', g.id)
      return {
        key: `gf-${g.id}`,
        tipo: 'gasto_fijo',
        origen_id: g.id,
        concepto: g.concepto,
        montoSugerido: Number(g.monto_previsto),
        dia_cobro: g.dia_cobro,
        sinFecha: g.dia_cobro == null,
        pagado: g.pagado,
        apartadoRow: ap ?? null,
      }
    })

  // Deudas con próximo pago en la quincena (o sin fecha → solo Q1)
  const diaDe = (fechaStr) => fechaStr ? Number(fechaStr.split('-')[2]) : null
  const itemsDeudas = (deudas ?? [])
    .filter(d => {
      const dia = diaDe(d.fecha_proximo_pago)
      return dia != null ? enRango(dia) : quincena === 1
    })
    .map(d => {
      const ap = findApartado('deuda', d.id)
      return {
        key: `de-${d.id}`,
        tipo: 'deuda',
        origen_id: d.id,
        concepto: d.nombre,
        montoSugerido: Number(d.pago_mensual),
        dia_cobro: diaDe(d.fecha_proximo_pago),
        sinFecha: d.fecha_proximo_pago == null,
        pagado: false,
        apartadoRow: ap ?? null,
      }
    })

  // Apartados manuales (ahorro / otro) que no provienen de una sugerencia
  const itemsManuales = (apartados ?? [])
    .filter(a => a.tipo === 'ahorro' || a.tipo === 'otro')
    .map(a => ({
      key: `ap-${a.id}`,
      tipo: a.tipo,
      origen_id: a.origen_id,
      concepto: a.concepto,
      montoSugerido: Number(a.monto),
      dia_cobro: null,
      sinFecha: true,
      pagado: false,
      apartadoRow: a,
    }))

  const compromisos = [...itemsFijos, ...itemsDeudas, ...itemsManuales]

  // ── Totales ───────────────────────────────────────────────────────────────
  // Para cada compromiso, el monto comprometido = monto apartado si existe, si no el sugerido
  const totalCompromisos = compromisos.reduce(
    (s, c) => s + Number(c.apartadoRow ? c.apartadoRow.monto : c.montoSugerido), 0)
  const totalApartado = (apartados ?? [])
    .filter(a => a.apartado)
    .reduce((s, a) => s + Number(a.monto), 0)
  const libreSiApartasTodo = ingresoEsperado - totalCompromisos
  const disponibleAhora    = ingresoEsperado - totalApartado
  const countApartados = (apartados ?? []).filter(a => a.apartado).length

  // ── Acciones ──────────────────────────────────────────────────────────────
  const apartar = async (item, montoOverride) => {
    setSaving(true)
    const monto = montoOverride != null ? Number(montoOverride) : Number(item.montoSugerido)
    const { error } = await supabase.from('apartados').insert({
      user_id: user.id,
      concepto: item.concepto,
      monto,
      tipo: item.tipo,
      origen_id: item.origen_id ?? null,
      mes, anio, quincena,
      apartado: true,
      fecha_apartado: new Date().toISOString().split('T')[0],
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
    const { error } = await supabase.from('apartados')
      .update({ monto: Number(monto) }).eq('id', apartadoId)
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const agregarManual = async ({ concepto, monto, tipo, origen_id }) => {
    setSaving(true)
    const { error } = await supabase.from('apartados').insert({
      user_id: user.id,
      concepto,
      monto: Number(monto),
      tipo: tipo ?? 'otro',
      origen_id: origen_id ?? null,
      mes, anio, quincena,
      apartado: true,
      fecha_apartado: new Date().toISOString().split('T')[0],
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
      user_id: user.id,
      concepto: c.concepto,
      monto: Number(c.montoSugerido),
      tipo: c.tipo,
      origen_id: c.origen_id ?? null,
      mes, anio, quincena,
      apartado: true,
      fecha_apartado: hoy,
    }))
    const { error } = await supabase.from('apartados').insert(filas)
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  return {
    quincena, setQuincena,
    loading: loadingIng || loadingGF || loadingD || loadingA,
    saving,
    ingresos: ingresos ?? [],
    ingresoEsperado, ingresoRecibido,
    compromisos,
    metasAhorro: metasAhorro ?? [],
    totalCompromisos, totalApartado, libreSiApartasTodo, disponibleAhora,
    countApartados,
    apartar, quitarApartado, editarMonto, agregarManual, apartarTodo,
  }
}
