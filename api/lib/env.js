export function getRequiredEnv(name) {
  const value = process.env[name]
  if (value == null || String(value).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

// Para logs: deja ver solo los últimos 4 dígitos de un teléfono (dato personal)
export function maskTelefono(telefono) {
  const t = String(telefono ?? '')
  return t.length > 4 ? `***${t.slice(-4)}` : '***'
}

export function envFlag(name, defaultValue = false) {
  const value = process.env[name]
  if (value == null || value === '') return defaultValue
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}
