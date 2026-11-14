// Inteligencia artificial (Groq): solo para lo que el intérprete local no
// entiende (frases largas o ambiguas), para sugerir categoría y para
// transcribir notas de voz. El bot funciona sin ella para lo básico.
import { getRequiredEnv } from './env.js'

const API = 'https://api.groq.com/openai/v1'
// Groq retira modelos con frecuencia (el anterior, llama-3.3-70b-versatile,
// se apagó el 16-ago-2026): se puede cambiar con variables de entorno sin
// tocar código. Ver https://console.groq.com/docs/deprecations
const MODELO = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
const MODELO_VOZ = process.env.GROQ_MODEL_VOZ || 'whisper-large-v3-turbo'

async function leerJson(response) {
  const texto = await response.text()
  if (!texto) return null
  try { return JSON.parse(texto) } catch { return { raw: texto } }
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function instrucciones({ hoy, categorias, metodos }) {
  const [a, m, d] = hoy.split('-').map(Number)
  const dia = DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]
  return `Eres el intérprete de un bot de finanzas personales en México. Lees UN mensaje en español y respondes SOLO un objeto JSON, sin explicación.

Hoy es ${dia} ${hoy}.
CATEGORÍAS del usuario: ${categorias.map(c => c.nombre).join(', ') || '(ninguna)'}
MÉTODOS DE PAGO del usuario: ${metodos.map(x => x.nombre).join(', ') || '(ninguno)'}

Campos del JSON (usa null cuando el mensaje no lo diga; nunca inventes):
- "tipo": "gasto" | "ingreso" | "pago" | "comando" | "desconocido"
- "monto": número positivo en pesos
- "descripcion": concepto breve, con mayúscula inicial (ej. "Gasolina Costco")
- "categoria": EXACTAMENTE una de las CATEGORÍAS, la que mejor aplique, o null
- "clasificacion": "necesidad" (transporte, súper, salud, servicios, hogar, educación) | "deseo" (restaurantes, café, entretenimiento, ropa, regalos) | "ahorro"
- "metodo_pago": EXACTAMENTE uno de los MÉTODOS DE PAGO, solo si el mensaje lo menciona; si no, null
- "fecha": "AAAA-MM-DD" solo si el mensaje dice cuándo fue (ayer, el lunes, el 3 de noviembre); nunca futura; si no, null
- "msi_meses": número de meses si fue una compra a meses; si no, null
- "comando": "resumen" | "deudas" | "creditos" | "ultimos" | "deshacer" | "pendientes" | "presupuesto" | "ayuda" (solo con tipo "comando")
- "objetivo": con tipo "pago", qué se pagó (un gasto fijo, una deuda o una tarjeta); con comando "presupuesto", la categoría

Cómo elegir "tipo":
- "gasto": compró o pagó algo nuevo. Ej. "le di 300 a mi hermano para la comida" → {"tipo":"gasto","monto":300,"descripcion":"Comida hermano","categoria":null,"clasificacion":"deseo"}
- "ingreso": recibió dinero. Ej. "me cayó la quincena, 6500" → {"tipo":"ingreso","monto":6500,"descripcion":"Quincena"}
- "pago": pagó un recibo recurrente, abonó a una deuda o pagó una tarjeta. Ej. "ya quedó la luz, fueron 470" → {"tipo":"pago","objetivo":"Luz","monto":470}
- "comando": pide información. Ej. "¿cuánto llevo gastado?" → {"tipo":"comando","comando":"resumen"}
- "desconocido": cualquier otra cosa, o si falta el monto de un gasto o ingreso.`
}

// Devuelve el JSON del modelo, o { error, detalle } si algo falló
export async function interpretarConIA(mensaje, contexto) {
  let apiKey
  try { apiKey = getRequiredEnv('GROQ_API_KEY') } catch (error) { return { error: 'ia_sin_configurar', detalle: error.message } }

  let response
  try {
    response = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODELO,
        messages: [
          { role: 'system', content: instrucciones(contexto) },
          { role: 'user', content: String(mensaje).slice(0, 1000) },
        ],
        temperature: 0.1,
        // Modelo con razonamiento: se pide el mínimo y no se devuelve
        reasoning_effort: 'low',
        include_reasoning: false,
        max_completion_tokens: 1024,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (error) {
    return { error: 'ia_no_disponible', detalle: error.message }
  }

  const data = await leerJson(response)
  if (!response.ok) return { error: 'ia_error', detalle: data?.error?.message ?? data?.raw ?? response.statusText }

  const contenido = data?.choices?.[0]?.message?.content
  if (!contenido) return { error: 'ia_respuesta_vacia' }
  try { return JSON.parse(contenido) } catch (error) { return { error: 'ia_respuesta_invalida', detalle: error.message } }
}

// Nota de voz → texto. Devuelve { texto } o { error, detalle }
export async function transcribirAudio(buffer, mime = 'audio/ogg') {
  let apiKey
  try { apiKey = getRequiredEnv('GROQ_API_KEY') } catch (error) { return { error: 'ia_sin_configurar', detalle: error.message } }

  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mime }), `nota.${mime.includes('mpeg') ? 'mp3' : mime.includes('mp4') ? 'm4a' : 'ogg'}`)
  form.append('model', MODELO_VOZ)
  form.append('language', 'es')
  form.append('response_format', 'json')

  let response
  try {
    response = await fetch(`${API}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(20_000),
    })
  } catch (error) {
    return { error: 'ia_no_disponible', detalle: error.message }
  }
  const data = await leerJson(response)
  if (!response.ok) return { error: 'ia_error', detalle: data?.error?.message ?? data?.raw ?? response.statusText }
  const texto = String(data?.text ?? '').trim()
  return texto ? { texto } : { error: 'ia_respuesta_vacia' }
}
