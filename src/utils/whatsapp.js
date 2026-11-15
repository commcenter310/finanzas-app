// Respuesta de la RPC verificar_whatsapp (supabase-whatsapp.sql) → mensaje
// para el usuario. `ok` indica si el número quedó verificado.
const MENSAJES = {
  ok: 'Número verificado ✓ Ya puedes mandarle tus gastos al bot.',
  incorrecto: 'Ese código no coincide. Revísalo e intenta de nuevo.',
  vencido: 'El código venció. Mándale otro mensaje al bot para recibir uno nuevo.',
  bloqueado: 'Demasiados intentos. Mándale otro mensaje al bot para recibir un código nuevo.',
  sin_codigo: 'Aún no hay un código para este número. Mándale primero un mensaje al bot desde ese WhatsApp.',
  sin_telefono: 'Guarda primero tu número de WhatsApp.',
}

export const resultadoVerificacion = (estado) => ({
  ok: estado === 'ok',
  mensaje: MENSAJES[estado] ?? 'No pudimos verificar el código. Intenta de nuevo.',
})

export const soloCodigo = (texto) => String(texto ?? '').replace(/\D/g, '').slice(0, 6)
