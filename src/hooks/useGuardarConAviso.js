import { useToast } from '../components/ui/Toast'

// Ejecuta una mutación de Supabase y avisa con un toast si falla.
// Devuelve true si salió bien. Sirve para cualquier cosa que resuelva a
// { error }: una consulta de Supabase o una mutación de un hook.
//   guardar(consulta, { error: 'mensaje si falla', duplicado: 'mensaje si el nombre ya existe' })
// `duplicado` se usa cuando la base de datos rechaza el guardado por un valor
// repetido (23505 = unique_violation).
const MENSAJE_POR_DEFECTO = 'No se pudo guardar. Intenta de nuevo.'

export function useGuardarConAviso() {
  const toast = useToast()
  return async (consulta, { error: mensajeError = MENSAJE_POR_DEFECTO, duplicado } = {}) => {
    const { error } = await consulta
    if (error) toast(error.code === '23505' && duplicado ? duplicado : mensajeError, 'error')
    return !error
  }
}
