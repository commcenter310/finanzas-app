import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useGastosVariables() {
  const { user } = useAuth()
  const { mes, anio } = useMes()

  const inicioMes = `${anio}-${String(mes).padStart(2,'0')}-01`
  const finMes = new Date(anio, mes, 0).toISOString().split('T')[0]

  const { data: categorias, loading: loadingCats } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user.id).eq('tipo_gasto', 'variable').eq('activa', true)
      .order('clasificacion').order('nombre')
    if (error) throw error
    return data ?? []
  }, [user?.id])

  const { data: presupuestos, loading: loadingPresu, refetch: refetchPresu } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('presupuestos')
      .select('*')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio)
    if (error) throw error
    return data ?? []
  }, [user?.id, mes, anio])

  const { data: gastosPorCat, loading: loadingGastos } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('transacciones')
      .select('monto, categoria_id')
      .eq('user_id', user.id).gte('fecha', inicioMes).lte('fecha', finMes)
    if (error) throw error
    const agrupado = {}
    data?.forEach(t => {
      agrupado[t.categoria_id] = (agrupado[t.categoria_id] ?? 0) + Number(t.monto)
    })
    return agrupado
  }, [user?.id, mes, anio])

  const actualizarPresupuesto = async (categoria_id, monto_limite) => {
    await supabase.from('presupuestos').upsert({
      user_id: user.id, categoria_id, monto_limite, mes, anio
    }, { onConflict: 'user_id,categoria_id,mes,anio' })
    refetchPresu()
  }

  const copiarDelMesAnterior = async () => {
    const mesAnt  = mes === 1 ? 12 : mes - 1
    const anioAnt = mes === 1 ? anio - 1 : anio
    const { data: anterior } = await supabase
      .from('presupuestos').select('categoria_id, monto_limite')
      .eq('user_id', user.id).eq('mes', mesAnt).eq('anio', anioAnt)
    if (!anterior?.length) return { copiados: 0 }
    await supabase.from('presupuestos').upsert(
      anterior.map(p => ({ ...p, mes, anio, user_id: user.id })),
      { onConflict: 'user_id,categoria_id,mes,anio' }
    )
    refetchPresu()
    return { copiados: anterior.length }
  }

  const categoriasConDatos = categorias?.map(cat => {
    const presupuesto = presupuestos?.find(p => p.categoria_id === cat.id)
    const gastado = gastosPorCat?.[cat.id] ?? 0
    const limite  = presupuesto?.monto_limite ?? 0
    const pct     = limite > 0 ? Math.min((gastado / limite) * 100, 100) : 0
    return { ...cat, gastado, limite, pct, sobre: gastado > limite && limite > 0 }
  }) ?? []

  const diasTranscurridos = new Date().getDate()
  const diasDelMes = new Date(anio, mes, 0).getDate()
  const totalGastado = categoriasConDatos.reduce((s, c) => s + c.gastado, 0)
  const factorProyeccion = diasTranscurridos > 0 ? diasDelMes / diasTranscurridos : 1
  const proyeccionTotal = totalGastado * factorProyeccion

  return {
    loading: loadingCats || loadingPresu || loadingGastos,
    categorias: categoriasConDatos,
    actualizarPresupuesto,
    copiarDelMesAnterior,
    proyeccionTotal,
    diasTranscurridos,
    diasDelMes,
  }
}
