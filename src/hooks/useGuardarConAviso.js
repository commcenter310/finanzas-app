import { useToast } from '../components/ui/Toast'

// Ejecuta una mutación de Supabase y avisa con un toast si falla.
// Devuelve true si salió bien.
export function useGuardarConAviso() {
  const toast = useToast()
  return async (consulta, mensajeError = 'No se pudo guardar. Intenta de nuevo.') => {
    const { error } = await consulta
    if (error) toast(mensajeError, 'error')
    return !error
  }
}
