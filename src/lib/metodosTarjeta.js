import { supabase } from './supabase'

const sufijoCredito = nombre => `${nombre} (crédito)`

// Vincula (o crea) el método de pago de una tarjeta de crédito, para que los
// gastos hechos con ella sumen a su saldo.
//
// metodos_pago tiene UNIQUE(user_id, nombre). Un método que ya existe con ese
// nombre solo se reutiliza si es de crédito y está libre (sin tarjeta, o ya es
// de esta): convertir uno de débito —los default traen "BBVA", "Santander"…—
// haría que los gastos pagados con débito se sumaran a la deuda de la tarjeta.
// Si el nombre está ocupado se crea "<nombre> (crédito)".
export async function vincularMetodoTarjeta(userId, nombreTarjeta, creditoId) {
  const nombre = String(nombreTarjeta ?? '').trim()
  const candidatos = [nombre, sufijoCredito(nombre)]
  const { data: existentes, error: errorLectura } = await supabase.from('metodos_pago')
    .select('id, nombre, tipo, credito_id').eq('user_id', userId).in('nombre', candidatos)
  if (errorLectura) return { error: errorLectura }

  for (const candidato of candidatos) {
    const existente = (existentes ?? []).find(m => m.nombre === candidato)
    if (!existente) {
      const { error } = await supabase.from('metodos_pago')
        .insert({ user_id: userId, nombre: candidato, tipo: 'credito', credito_id: creditoId })
      return { error }
    }
    const libre = existente.tipo === 'credito' && (existente.credito_id == null || existente.credito_id === creditoId)
    if (libre) {
      const { error } = await supabase.from('metodos_pago')
        .update({ credito_id: creditoId, activo: true }).eq('id', existente.id)
      return { error }
    }
  }
  return { error: { code: 'METODO_NOMBRE_OCUPADO', message: 'Ya existe un método de pago con ese nombre' } }
}
