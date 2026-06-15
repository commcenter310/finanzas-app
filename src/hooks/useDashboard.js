import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useSupabaseQuery } from './useSupabaseQuery'
import {
  calcularTotalGastos, calcularSaldoAnterior, calcularSaldoArrastrado,
  calcularPorAsignar, calcularGastosHormiga, calcularIngresoEsperado, calcularProyeccion,
} from '../utils/calculos'

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

  const uid = user?.id
  const { data: ingresos, loading: loadingIngresos, error: errIngresos, refetch: refetchIngresos } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('ingresos')
      .select('monto_actual, monto_presupuesto')
      .eq('user_id', user.id)
      .eq('mes', mes)
      .eq('anio', anio)
    if (error) throw error
    return data || []
  }, [uid, mes, anio], `dash:ingresos:${uid}:${mes}:${anio}`)

  const { data: gastosFijos, loading: loadingFijos, error: errFijos, refetch: refetchFijos } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('gastos_fijos')
      .select('monto_previsto, monto_actual, clasificacion, pagado')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
    if (error) throw error
    return data || []
  }, [uid, mes, anio], `dash:fijos:${uid}:${mes}:${anio}`)

  const { data: transacciones, loading: loadingTx, error: errTx, refetch: refetchTx } = useSupabaseQuery(async () => {
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
  }, [uid, mes, anio], `dash:tx:${uid}:${mes}:${anio}`)

  // Gastos fijos pendientes de pago este mes (para aviso en Dashboard)
  const { data: fijosPendientes } = useSupabaseQuery(async () => {
    const { data } = await supabase
      .from('gastos_fijos')
      .select('id, concepto, monto_previsto, dia_cobro, clasificacion')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio).eq('pagado', false)
      .order('dia_cobro', { ascending: true, nullsFirst: false })
    return data ?? []
  }, [uid, mes, anio], `dash:fijosPend:${uid}:${mes}:${anio}`)

  // ── Queries del mes anterior (se cargan en paralelo, sin bloquear el skeleton principal) ──
  const { data: ingresosPrev } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('ingresos')
      .select('monto_actual')
      .eq('user_id', user.id)
      .eq('mes', mesPrev)
      .eq('anio', anioPrev)
    if (error) throw error
    return data || []
  }, [uid, mesPrev, anioPrev], `dash:ingresosPrev:${uid}:${mesPrev}:${anioPrev}`)

  const { data: gastosFijosPrev } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('gastos_fijos')
      .select('monto_actual')
      .eq('user_id', user.id).eq('mes', mesPrev).eq('anio', anioPrev)
    if (error) throw error
    return data || []
  }, [uid, mesPrev, anioPrev], `dash:fijosPrev:${uid}:${mesPrev}:${anioPrev}`)

  const { data: transaccionesPrev } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('transacciones')
      .select('monto, origen')
      .eq('user_id', user.id)
      .gte('fecha', inicioMesPrev).lte('fecha', finMesPrev)
    if (error) throw error
    return data || []
  }, [uid, mesPrev, anioPrev], `dash:txPrev:${uid}:${mesPrev}:${anioPrev}`)

  const { data: presupuestos } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('presupuestos')
      .select('monto_limite, categorias(nombre, icono, clasificacion)')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
    if (error) throw error
    return data || []
  }, [uid, mes, anio], `dash:presupuestos:${uid}:${mes}:${anio}`)

  // Nóminas configuradas → ingreso esperado del mes (para comparar vs registrado)
  const { data: nominas } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('nominas').select('*').eq('user_id', user.id)
    return data ?? []
  }, [uid], `nominas:${uid}`)

  const totalIngresos = ingresos?.reduce((s, i) => s + Number(i.monto_actual), 0) ?? 0
  const txSinFijos    = transacciones?.filter(t => t.origen !== 'gastos_fijos') ?? []
  const { totalFijos, totalTx, totalGastos } = calcularTotalGastos(gastosFijos, transacciones)

  const saldoAnterior   = calcularSaldoAnterior(ingresosPrev, gastosFijosPrev, transaccionesPrev)
  const saldoArrastrado = calcularSaldoArrastrado(saldoAnterior)
  const porAsignar      = calcularPorAsignar({ totalIngresos, totalGastos, saldoAnterior })

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

  // Ingreso esperado del mes según nóminas (null = sin nóminas configuradas)
  const ingresoEsperado = calcularIngresoEsperado(nominas, mes)

  // Proyección de fin de mes (extrapola gasto variable al ritmo actual)
  const proyeccion = calcularProyeccion({
    totalTx, totalFijos, totalIngresos, ingresoEsperado, saldoArrastrado, mes, anio,
  })


  const umbral = profile?.umbral_hormiga ?? 100
  const gastosHormiga = calcularGastosHormiga(transacciones, umbral)

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
    error: errIngresos || errFijos || errTx || null,
    refetch: () => { refetchIngresos(); refetchFijos(); refetchTx() },
    fijosPendientes: fijosPendientes ?? [],
    saldoAnterior,
    mesPrev,
    anioPrev,
    totalIngresos,
    ingresoEsperado,
    proyeccion,
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
