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
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
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
        id, descripcion, monto, clasificacion, fecha, created_at,
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

  // ── Queries del mes anterior (se cargan en paralelo, sin bloquear el skeleton principal) ──
  const { data: ingresosPrev } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('ingresos')
      .select('monto_actual')
      .eq('user_id', user.id).eq('mes', mesPrev).eq('anio', anioPrev)
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
  const totalTx       = transacciones?.reduce((s, t) => s + Number(t.monto), 0) ?? 0
  const totalGastos   = totalFijos + totalTx
  const porAsignar    = totalIngresos - totalGastos

  const necesidad = [
    ...gastosFijos?.filter(g => g.clasificacion === 'necesidad') ?? [],
    ...transacciones?.filter(t => t.clasificacion === 'necesidad') ?? []
  ].reduce((s, g) => s + Number(g.monto_actual ?? g.monto), 0)

  const deseo = [
    ...gastosFijos?.filter(g => g.clasificacion === 'deseo') ?? [],
    ...transacciones?.filter(t => t.clasificacion === 'deseo') ?? []
  ].reduce((s, g) => s + Number(g.monto_actual ?? g.monto), 0)

  const ahorro = [
    ...gastosFijos?.filter(g => g.clasificacion === 'ahorro') ?? [],
    ...transacciones?.filter(t => t.clasificacion === 'ahorro') ?? []
  ].reduce((s, g) => s + Number(g.monto_actual ?? g.monto), 0)

  const gastosPorCategoria = transacciones?.reduce((acc, t) => {
    const cat = t.categorias?.nombre ?? 'Sin categoría'
    acc[cat] = (acc[cat] ?? 0) + Number(t.monto)
    return acc
  }, {}) ?? {}

  const totalPresupuestado = presupuestos?.reduce((s, p) => s + Number(p.monto_limite ?? 0), 0) ?? 0

  // Saldo arrastrado del mes anterior: cuánto sobró (o se pasó) el mes pasado
  const saldoAnterior = (() => {
    const prevIng   = ingresosPrev?.reduce((s, i) => s + Number(i.monto_actual), 0) ?? 0
    const prevFijos = gastosFijosPrev?.reduce((s, g) => s + Number(g.monto_actual), 0) ?? 0
    const prevTx    = transaccionesPrev?.reduce((s, t) => s + Number(t.monto), 0) ?? 0
    // Solo emitir cuando los datos ya cargaron (evitar 0 engañoso al inicio)
    if (!ingresosPrev && !gastosFijosPrev && !transaccionesPrev) return null
    return prevIng - prevFijos - prevTx
  })()

  const umbral = profile?.umbral_hormiga ?? 100
  const hormigaTx = transacciones?.filter(t => Number(t.monto) <= umbral) ?? []
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
