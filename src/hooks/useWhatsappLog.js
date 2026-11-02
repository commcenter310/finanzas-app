import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useWhatsappLog() {
  const { profile } = useAuth()
  // Solo puede ver los logs de su número (el perfil ya trae el teléfono)
  const telefono = profile?.telefono

  const { data: logs, loading } = useSupabaseQuery(async () => {
    if (!telefono) return []
    const { data, error } = await supabase
      .from('whatsapp_log')
      .select('*, transacciones(descripcion, monto)')
      .eq('telefono', telefono)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data ?? []
  }, [telefono])

  return { logs: logs ?? [], loading }
}
