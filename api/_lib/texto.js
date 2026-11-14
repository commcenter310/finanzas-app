// Utilidades de texto del bot. Funciones puras (sin red ni base de datos).

// "Café  NU!" → "cafe nu": minúsculas, sin acentos ni signos, espacios simples.
// Conserva dígitos, punto y coma (montos) y $.
export const normalizar = (s) => String(s ?? '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9ñ$.,\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

// Parte el mensaje en palabras, conservando la forma original de cada una
// (para la descripción) junto a su forma normalizada (para comparar).
export const tokenizar = (texto) => String(texto ?? '')
  .split(/\s+/)
  .map(orig => ({ orig: orig.replace(/^[¿¡"'(]+|[?!"'),;:]+$/g, ''), norm: normalizar(orig).replace(/[.,]+$/, '') }))
  .filter(t => t.norm !== '')

export const fmx = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

// "$1,200.50" → 1200.5 · "2k" → 2000 · "abc" → null
export function parsearMonto(token) {
  const m = /^\$?(\d{1,3}(?:,\d{3})+|\d+)(\.\d{1,2})?(k)?$/.exec(String(token ?? ''))
  if (!m) return null
  const valor = Number(m[1].replace(/,/g, '') + (m[2] ?? '')) * (m[3] ? 1000 : 1)
  return Number.isFinite(valor) ? valor : null
}

// Palabras que no distinguen un método/categoría de otro
const GENERICAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'tarjeta', 'credito', 'debito', 'banco', 'cuenta', 'card'])

// Busca en `normTokens` (palabras normalizadas del mensaje) el elemento de
// `lista` al que se refiere el usuario. Primero el nombre completo (gana el
// más largo); si no, una palabra que identifique a UN solo elemento
// ("bbva" → "BBVA Débito" cuando no hay otro BBVA).
// Devuelve { item, inicio, largo } (posición en normTokens) o null.
export function buscarPorNombre(lista, normTokens, campo = 'nombre') {
  const candidatos = (lista ?? [])
    .map(item => ({ item, palabras: normalizar(item[campo]).split(' ').filter(Boolean) }))
    .filter(c => c.palabras.length > 0)
    .sort((a, b) => b.palabras.length - a.palabras.length)

  for (const { item, palabras } of candidatos) {
    for (let i = 0; i + palabras.length <= normTokens.length; i++) {
      if (palabras.every((p, j) => normTokens[i + j] === p)) return { item, inicio: i, largo: palabras.length }
    }
  }

  for (let i = 0; i < normTokens.length; i++) {
    const palabra = normTokens[i]
    if (palabra.length < 2 || GENERICAS.has(palabra) || /^\d/.test(palabra)) continue
    const con = candidatos.filter(c => c.palabras.includes(palabra))
    if (con.length === 1) return { item: con[0].item, inicio: i, largo: 1 }
  }
  return null
}

// Igual que buscarPorNombre pero a partir de un texto libre
export const buscarEnTexto = (lista, texto, campo) =>
  buscarPorNombre(lista, normalizar(texto).split(' ').filter(Boolean), campo)?.item ?? null

export const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
