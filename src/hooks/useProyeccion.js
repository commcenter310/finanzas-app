import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useSupabaseQuery } from './useSupabaseQuery'
import { useNominasLista } from './useCatalogos'
import { proyectarMeses } from '../utils/planificacion'

// Proyección hacia adelante de ingresos vs compromisos por mes (y quincena).
export function useProyeccion(horizonte = 12) {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const uid = user?.id

  const { nominas, loading: loadingN } = useNominasLista()

  // Plantilla de gastos fijos recurrentes (se repiten cada mes)
  const { data: fijosRec, loading: loadingF } = useSupabaseQuery(async () => {
    const { data } = await supabase
      .from('gastos_fijos')
      .select('concepto, monto_previsto, dia_cobro')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio).eq('es_recurrente', true)
    return data ?? []
  }, [uid, mes, anio], `proyeccion:fijos:${uid}:${mes}:${anio}`)

  const { data: deudas, loading: loadingD } = useSupabaseQuery(async () => {
    const { data } = await supabase
      .from('deudas')
      .select('*')
      .eq('user_id', user.id).eq('liquidada', false).gt('pago_mensual', 0)
    return data ?? []
  }, [uid], `proyeccion:deudas:${uid}`)

  const loading = loadingN || loadingF || loadingD
  const proyeccion = proyectarMeses({
    nominas,
    fijosRecurrentes: fijosRec ?? [],
    deudas: deudas ?? [],
    mes, anio, horizonte,
  })

  return {
    loading,
    ...proyeccion,
    sinDatos: nominas.length === 0,
  }
}
