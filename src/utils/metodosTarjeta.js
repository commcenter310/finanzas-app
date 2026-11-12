import { supabase } from '../lib/supabase'

// Vincula (o crea) el método de pago de una tarjeta de crédito, para que los
// gastos hechos con ella sumen a su saldo. metodos_pago tiene
// UNIQUE(user_id, nombre): si ya existe un método con ese nombre (los default
// incluyen NU, Stori, etc.) solo se le cuelga el credito_id.
export async function vincularMetodoTarjeta(userId, nombreTarjeta, creditoId) {
  const nombre = String(nombreTarjeta ?? '').trim()
  const { data: existente, error: errorLectura } = await supabase.from('metodos_pago')
    .select('id').eq('user_id', userId).eq('nombre', nombre).maybeSingle()
  if (errorLectura) return { error: errorLectura }
  const { error } = existente
    ? await supabase.from('metodos_pago')
      .update({ credito_id: creditoId, tipo: 'credito', activo: true }).eq('id', existente.id)
    : await supabase.from('metodos_pago')
      .insert({ user_id: userId, nombre, tipo: 'credito', credito_id: creditoId })
  return { error }
}
