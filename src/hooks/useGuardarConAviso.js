import { useToast } from '../components/ui/Toast'

// Ejecuta una mutación de Supabase y avisa con un toast si falla.
// Devuelve true si salió bien. `mensajeDuplicado` se usa cuando la base de
// datos rechaza el guardado por nombre repetido (23505 = unique_violation).
export function useGuardarConAviso() {
  const toast = useToast()
  return async (consulta, mensajeError = 'No se pudo guardar. Intenta de nuevo.', mensajeDuplicado) => {
    const { error } = await consulta
    if (error) toast(error.code === '23505' && mensajeDuplicado ? mensajeDuplicado : mensajeError, 'error')
    return !error
  }
}
