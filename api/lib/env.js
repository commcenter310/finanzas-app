export function getRequiredEnv(name) {
  const value = process.env[name]
  if (value == null || String(value).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function envFlag(name, defaultValue = false) {
  const value = process.env[name]
  if (value == null || value === '') return defaultValue
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}
