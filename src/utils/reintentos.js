// Ejecuta `fn` (que devuelve { data, error }, como Supabase) y reintenta si
// falla, esperando cada valor de `esperasMs` entre intentos. Devuelve el
// último resultado: con data si algún intento salió bien, con error si no.
export async function conReintentos(fn, esperasMs = [500, 1500], dormir = ms => new Promise(r => setTimeout(r, ms))) {
  let resultado = await fn()
  for (const espera of esperasMs) {
    if (!resultado.error) break
    await dormir(espera)
    resultado = await fn()
  }
  return resultado
}
