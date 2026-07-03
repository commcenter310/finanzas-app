// WhatsApp México guarda los números como 521XXXXXXXXXX (13 dígitos):
// lada país 52 + el "1" de móvil + 10 dígitos. El usuario nunca debería
// tener que saber eso: en la UI se capturan solo los 10 dígitos y estas
// funciones convierten en ambas direcciones.

// "5216675078043" → "6675078043" (para mostrar en inputs)
export const telefonoA10 = (t) => {
  const d = (t ?? '').replace(/\D/g, '')
  if (d.length === 13 && d.startsWith('521')) return d.slice(3)
  if (d.length === 12 && d.startsWith('52'))  return d.slice(2)
  return d.length > 10 ? d.slice(-10) : d
}

// "6675078043" → "5216675078043" (para guardar) · null si no son 10 dígitos
export const telefonoAWhatsApp = (dies) => {
  const d = (dies ?? '').replace(/\D/g, '')
  return d.length === 10 ? `521${d}` : null
}

// Deja solo dígitos y máximo 10 (para onChange de inputs)
export const soloDiezDigitos = (v) => (v ?? '').replace(/\D/g, '').slice(0, 10)
