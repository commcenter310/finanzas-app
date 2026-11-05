// Ordena las categorías de Presupuesto. Siempre devuelve un arreglo nuevo.
// - 'alfabetico': A–Z en español (acentos y mayúsculas no alteran el orden;
//   la ñ va después de la n).
// - 'gasto': mayor gasto primero.
// - 'uso': mayor % del límite usado primero; las que no tienen límite van al final.
// Los empates se resuelven alfabéticamente para que el orden sea estable.
const comparaNombre = new Intl.Collator('es', { sensitivity: 'base', numeric: true }).compare

export const CRITERIOS_ORDEN = ['alfabetico', 'gasto', 'uso']

const usoRelativo = c => (Number(c.limite) > 0 ? Number(c.gastado) / Number(c.limite) : -1)

export function ordenarCategorias(categorias, criterio = 'alfabetico') {
  const porNombre = (a, b) => comparaNombre(a.nombre ?? '', b.nombre ?? '')
  const comparar = {
    alfabetico: porNombre,
    gasto: (a, b) => Number(b.gastado) - Number(a.gastado) || porNombre(a, b),
    uso: (a, b) => usoRelativo(b) - usoRelativo(a) || porNombre(a, b),
  }[criterio] ?? porNombre
  return [...(categorias ?? [])].sort(comparar)
}
