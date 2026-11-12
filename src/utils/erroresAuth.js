// Supabase Auth devuelve sus errores en inglés; aquí se traducen los que un
// usuario puede provocar. Lo desconocido cae en un mensaje genérico.
const TRADUCCIONES = [
  [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
  [/email not confirmed/i, 'Confirma tu correo antes de entrar: revisa tu bandeja (y spam).'],
  [/user already registered/i, 'Ya existe una cuenta con ese correo. Inicia sesión.'],
  [/password should be at least (\d+)/i, m => `La contraseña debe tener al menos ${m[1]} caracteres.`],
  [/new password should be different/i, 'La contraseña nueva debe ser distinta a la actual.'],
  [/password.*(weak|pwned|leaked|compromised)/i, 'Esa contraseña es muy débil o apareció en filtraciones. Elige otra.'],
  [/unable to validate email address|invalid email/i, 'El correo no es válido.'],
  [/(rate limit|too many requests|for security purposes)/i, 'Demasiados intentos. Espera un momento e intenta de nuevo.'],
  [/signups? (not allowed|disabled)/i, 'El registro de cuentas nuevas está desactivado.'],
  [/(session|token).*(missing|expired|invalid)|auth session missing/i, 'Tu sesión expiró. Vuelve a iniciar sesión.'],
  [/failed to fetch|network/i, 'Sin conexión. Revisa tu internet e intenta de nuevo.'],
]

export function traducirErrorAuth(error) {
  const mensaje = typeof error === 'string' ? error : (error?.message ?? '')
  for (const [patron, texto] of TRADUCCIONES) {
    const m = mensaje.match(patron)
    if (m) return typeof texto === 'function' ? texto(m) : texto
  }
  return 'No pudimos completar la operación. Intenta de nuevo.'
}

export const PASSWORD_MIN = 8

// Devuelve el problema de una contraseña nueva, o null si es válida.
export function validarPasswordNueva(nueva, confirmacion) {
  if (!nueva || nueva.length < PASSWORD_MIN) return `Usa al menos ${PASSWORD_MIN} caracteres.`
  if (nueva !== confirmacion) return 'Las contraseñas no coinciden.'
  return null
}
