import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useWhatsappLog() {
  const { user } = useAuth()

  const { data: logs, loading } = useSupabaseQuery(async () => {
    // Solo puede ver logs de su número
    const { data: profile } = await supabase.from('profiles').select('telefono').eq('id', user.id).single()
    if (!profile?.telefono) return []

    const { data, error } = await supabase
      .from('whatsapp_log')
      .select('*, transacciones(descripcion, monto)')
      .eq('telefono', profile.telefono)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data ?? []
  }, [user?.id])

  return { logs: logs ?? [], loading }
}
