// Cómo llegó el usuario a la app, leído de la URL ANTES de que Supabase la
// procese y la limpie. main.jsx importa este módulo primero que nada.
//
// Los enlaces de los correos de Supabase regresan a la app así:
//   recuperación  →  /#access_token=…&type=recovery
//   enlace vencido →  /#error=access_denied&error_code=otp_expired&…
const url = typeof window !== 'undefined' ? `${window.location.hash}&${window.location.search}` : ''

export const LLEGO_POR_RECUPERACION = /[#&?]access_token=/.test(url) && /[#&?]type=recovery(&|$)/.test(url)

export const LLEGO_CON_ENLACE_INVALIDO = /[#&?]error(_code)?=/.test(url)
