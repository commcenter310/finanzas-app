// Cómo llegó el usuario a la app, leído de la URL ANTES de que Supabase la
// procese y la limpie. main.jsx importa este módulo primero que nada.
//
// Los enlaces de los correos de Supabase regresan a la app así:
//   recuperación  →  /#access_token=…&type=recovery
//   enlace vencido →  /#error=access_denied&error_code=otp_expired&…
export const leerUrlInicial = (hash = '', search = '') => {
  const url = `${hash}&${search}`
  return {
    recuperacion: /[#&?]access_token=/.test(url) && /[#&?]type=recovery(&|$)/.test(url),
    enlaceInvalido: /[#&?]error(_code)?=/.test(url),
  }
}

// ¿La URL todavía trae el token del enlace? Supabase lo quita al iniciar la
// sesión; si sigue ahí, el enlace no sirvió (vencido, manipulado…).
export const urlConservaToken = (hash = '') => /[#&]access_token=/.test(hash)

const inicial = typeof window !== 'undefined'
  ? leerUrlInicial(window.location.hash, window.location.search)
  : leerUrlInicial()

export const LLEGO_POR_RECUPERACION = inicial.recuperacion

// El aviso de "enlace vencido" se muestra una sola vez: Auth lo olvida en
// cuanto el usuario intenta otra cosa, para que no reaparezca al volver.
let enlaceInvalidoPendiente = inicial.enlaceInvalido
export const hayEnlaceInvalido = () => enlaceInvalidoPendiente
export const olvidarEnlaceInvalido = () => { enlaceInvalidoPendiente = false }
