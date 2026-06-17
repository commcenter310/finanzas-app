import { supabase } from '../lib/supabase'

// Devuelve el id de una categoría por nombre; si no existe, la crea.
// Usada para categorizar automáticamente transacciones auto-generadas
// (pagos de deuda → "Deudas", depósitos de ahorro → "Ahorro").
export async function ensureCategoria(userId, { nombre, tipo_gasto = 'variable', clasificacion = 'necesidad', icono = '📦' }) {
  const buscar = () => supabase
    .from('categorias').select('id')
    .eq('user_id', userId).eq('nombre', nombre).maybeSingle()

  const { data: existente } = await buscar()
  if (existente) return existente.id

  const { data: creada, error } = await supabase
    .from('categorias')
    .insert({ user_id: userId, nombre, tipo_gasto, clasificacion, icono })
    .select('id').single()
  if (!error) return creada?.id ?? null

  // Posible carrera (unique user_id+nombre): vuelve a buscar
  const { data: again } = await buscar()
  return again?.id ?? null
}
