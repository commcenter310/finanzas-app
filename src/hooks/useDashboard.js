import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useDashboard() {
  const { user, profile } = useAuth()
  const { mes, anio } = useMes()

  const inicioMes = `${anio}-${String(mes).padStart(2,'0')}-01`
  const finMes = new Date(anio, mes, 0).toISOString().split('T')[0]

  // Mes anterior (para calcular saldo arrastrado)
  const mesPrev  = mes === 1 ? 12 : mes - 1
  const anioPrev = mes === 1 ? anio - 1 : anio
  const inicioMesPrev = `${anioPrev}-${String(mesPrev).padStart(2,'0')}-01`
  const finMesPrev    = new Date(anioPrev, mesPrev, 0).toISOString().split('T')[0]

  const { data: ingresos, loading: loadingIngresos } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('ingresos')
      .select('monto_actual, monto_presupuesto')
      .eq('user_id', user.id)
      .gte('fecha_recepcion', inicioMes)
      .lte('fecha_recepcion', finMes)
    if (error) throw error
    return data || []
  }, [user?.id, mes, anio])

  const { data: gastosFijos, loading: loadingFijos } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('gastos_fijos')
      .select('monto_previsto, monto_actual, clasificacion, pagado')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
    if (error) throw error
    return data || []
  }, [user?.id, mes, anio])

  const { data: transacciones, loading: loadingTx } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('transacciones')
      .select(`
        id, descripcion, monto, clasificacion, fecha, origen, created_at,
        categorias(nombre, icono),
        metodos_pago(nombre)
      `)
      .eq('user_id', user.id)
      .gte('fecha', inicioMes).lte('fecha', finMes)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }, [user?.id, mes, anio])

  // Gastos fijos pendientes de pago este mes (para aviso en Dashboard)
  const { data: fijosPendientes } = useSupabaseQuery(async () => {
    const { data } = await supabase
      .from('gastos_fijos')
      .select('id, concepto, monto_previsto, dia_cobro, clasificacion')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio).eq('pagado', false)
      .order('dia_cobro', { ascending: true, nullsFirst: false })
    return data ?? []
  }, [user?.id, mes, anio])

  // ── Queries del mes anterior (se cargan en paralelo, sin bloquear el skeleton principal) ──
  const { data: ingresosPrev } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('ingresos')
      .select('monto_actual')
      .eq('user_id', user.id)
      .gte('fecha_recepcion', inicioMesPrev)
      .lte('fecha_recepcion', finMesPrev)
    if (error) throw error
    return data || []
  }, [user?.id, mesPrev, anioPrev])

  const { data: gastosFijosPrev } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('gastos_fijos')
      .select('monto_actual')
      .eq('user_id', user.id).eq('mes', mesPrev).eq('anio', anioPrev)
    if (error) throw error
    return data || []
  }, [user?.id, mesPrev, anioPrev])

  const { data: transaccionesPrev } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('transacciones')
      .select('monto')
      .eq('user_id', user.id)
      .gte('fecha', inicioMesPrev).lte('fecha', finMesPrev)
    if (error) throw error
    return data || []
  }, [user?.id, mesPrev, anioPrev])

  const { data: presupuestos } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('presupuestos')
      .select('monto_limite, categorias(nombre, icono, clasificacion)')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
    if (error) throw error
    return data || []
  }, [user?.id, mes, anio])

  const totalIngresos = ingresos?.reduce((s, i) => s + Number(i.monto_actual), 0) ?? 0
  const totalFijos    = gastosFijos?.reduce((s, g) => s + Number(g.monto_actual), 0) ?? 0
  // Excluir transacciones auto-generadas por gastos_fijos (ya contadas en totalFijos)
  const txSinFijos    = transacciones?.filter(t => t.origen !== 'gastos_fijos') ?? []
  const totalTx       = txSinFijos.reduce((s, t) => s + Number(t.monto), 0)
  const totalGastos   = totalFijos + totalTx

  // Saldo arrastrado del mes anterior
  const saldoAnterior = (() => {
    const prevIng   = ingresosPrev?.reduce((s, i) => s + Number(i.monto_actual), 0) ?? 0
    const prevFijos = gastosFijosPrev?.reduce((s, g) => s + Number(g.monto_actual), 0) ?? 0
    // También excluir gastos_fijos del mes anterior para evitar doble conteo
    const prevTxFilt = transaccionesPrev?.filter(t => t.origen !== 'gastos_fijos') ?? []
    const prevTx    = prevTxFilt.reduce((s, t) => s + Number(t.monto), 0)
    if (!ingresosPrev && !gastosFijosPrev && !transaccionesPrev) return null
    return prevIng - prevFijos - prevTx
  })()

  // Solo arrastramos saldo positivo (no deudas del mes anterior)
  const saldoArrastrado = saldoAnterior !== null && saldoAnterior > 0 ? saldoAnterior : 0
  // Si no hay ingresos ni saldo anterior, porAsignar = null para evitar negativo engañoso
  const sinDatos = totalIngresos === 0 && saldoAnterior === null
  const porAsignar = sinDatos ? null : saldoArrastrado + totalIngresos - totalGastos

  const necesidad = [
    ...gastosFijos?.filter(g => g.clasificacion === 'necesidad') ?? [],
    ...txSinFijos.filter(t => t.clasificacion === 'necesidad'),
  ].reduce((s, g) => s + Number(g.monto_actual ?? g.monto), 0)

  const deseo = [
    ...gastosFijos?.filter(g => g.clasificacion === 'deseo') ?? [],
    ...txSinFijos.filter(t => t.clasificacion === 'deseo'),
  ].reduce((s, g) => s + Number(g.monto_actual ?? g.monto), 0)

  const ahorro = [
    ...gastosFijos?.filter(g => g.clasificacion === 'ahorro') ?? [],
    ...txSinFijos.filter(t => t.clasificacion === 'ahorro'),
  ].reduce((s, g) => s + Number(g.monto_actual ?? g.monto), 0)

  const gastosPorCategoria = transacciones?.reduce((acc, t) => {
    const cat = t.categorias?.nombre ?? 'Sin categoría'
    acc[cat] = (acc[cat] ?? 0) + Number(t.monto)
    return acc
  }, {}) ?? {}

  const totalPresupuestado = presupuestos?.reduce((s, p) => s + Number(p.monto_limite ?? 0), 0) ?? 0


  const umbral = profile?.umbral_hormiga ?? 100
  // Solo cuentan como "hormiga" los gastos de deseo: una medicina de $50 no es hormiga, un café sí
  const hormigaTx = transacciones?.filter(t =>
    Number(t.monto) <= umbral && t.clasificacion === 'deseo'
  ) ?? []
  const gastosHormiga = {
    count: hormigaTx.length,
    total: hormigaTx.reduce((s, t) => s + Number(t.monto), 0),
    umbral,
  }

  const categoriasEnRiesgo = presupuestos
    ?.map(p => {
      const gastado = gastosPorCategoria[p.categorias?.nombre] ?? 0
      const pct = p.monto_limite > 0 ? (gastado / p.monto_limite) * 100 : 0
      return { nombre: p.categorias?.nombre, icono: p.categorias?.icono, monto_limite: p.monto_limite, gastado, pct }
    })
    .filter(p => p.pct >= 70)
    .sort((a, b) => b.pct - a.pct) ?? []

  return {
    loading: loadingIngresos || loadingFijos || loadingTx,
    fijosPendientes: fijosPendientes ?? [],
    saldoAnterior,
    mesPrev,
    anioPrev,
    totalIngresos,
    totalGastos,
    porAsignar,
    necesidad,
    deseo,
    ahorro,
    gastosPorCategoria,
    transacciones: transacciones ?? [],
    presupuestos: presupuestos ?? [],
    totalPresupuestado,
    categoriasEnRiesgo,
    gastosHormiga,
    reglas: profile
      ? { regla_necesidad: profile.regla_necesidad ?? 0.5, regla_deseo: profile.regla_deseo ?? 0.3, regla_ahorro: profile.regla_ahorro ?? 0.2 }
      : { regla_necesidad: 0.5, regla_deseo: 0.3, regla_ahorro: 0.2 },
  }
}
