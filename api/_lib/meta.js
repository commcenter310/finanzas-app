// Envío y descarga de mensajes por la API de WhatsApp Cloud (Meta).
import { getRequiredEnv, maskTelefono } from './env.js'

const GRAPH = `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION || 'v25.0'}`
const recortar = (texto, max) => (String(texto).length > max ? `${String(texto).slice(0, max - 1)}…` : String(texto))

async function leerJson(response) {
  const texto = await response.text()
  if (!texto) return null
  try { return JSON.parse(texto) } catch { return { raw: texto } }
}

async function enviar(telefono, contenido) {
  const token = getRequiredEnv('WHATSAPP_ACCESS_TOKEN')
  const numero = getRequiredEnv('WHATSAPP_PHONE_NUMBER_ID')
  const r = await fetch(`${GRAPH}/${numero}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: telefono, ...contenido }),
  })
  const data = await leerJson(r)
  if (!r.ok) throw new Error(`Meta WhatsApp ${r.status}: ${data?.error?.message ?? data?.raw ?? r.statusText}`)
  console.log('Mensaje enviado a', maskTelefono(telefono), '|', contenido.type)
}

export const enviarTexto = (telefono, texto) =>
  enviar(telefono, { type: 'text', text: { body: recortar(texto, 4096) } })

// Hasta 3 botones de respuesta rápida: [{ id, titulo }]
export const enviarBotones = (telefono, texto, botones) =>
  enviar(telefono, {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: recortar(texto, 1024) },
      action: { buttons: botones.slice(0, 3).map(b => ({ type: 'reply', reply: { id: b.id, title: recortar(b.titulo, 20) } })) },
    },
  })

// Lista desplegable de hasta 10 opciones: [{ id, titulo, descripcion? }]
export const enviarLista = (telefono, texto, textoBoton, opciones) =>
  enviar(telefono, {
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: recortar(texto, 1024) },
      action: {
        button: recortar(textoBoton, 20),
        sections: [{
          title: 'Opciones',
          rows: opciones.slice(0, 10).map(o => ({
            id: o.id,
            title: recortar(o.titulo, 24),
            ...(o.descripcion ? { description: recortar(o.descripcion, 72) } : {}),
          })),
        }],
      },
    },
  })

// Pregunta con opciones para tocar: botones si son pocas, lista si son más.
// Si Meta rechaza el mensaje interactivo, se manda como texto normal.
export async function enviarOpciones(telefono, texto, opciones, { textoBoton = 'Elegir' } = {}) {
  try {
    if (opciones.length > 0 && opciones.length <= 3) return await enviarBotones(telefono, texto, opciones)
    if (opciones.length > 3) return await enviarLista(telefono, texto, textoBoton, opciones)
  } catch (error) {
    console.warn('Mensaje interactivo rechazado, se envía como texto:', error.message)
  }
  const lista = opciones.map(o => `• ${o.titulo}`).join('\n')
  return enviarTexto(telefono, lista ? `${texto}\n\n${lista}` : texto)
}

// Descarga un audio (nota de voz) que mandó el usuario
const MAX_AUDIO_BYTES = 8 * 1024 * 1024
export async function descargarMedia(mediaId) {
  const token = getRequiredEnv('WHATSAPP_ACCESS_TOKEN')
  const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: { Authorization: `Bearer ${token}` } })
  const info = await leerJson(meta)
  if (!meta.ok || !info?.url) throw new Error(`Meta media ${meta.status}: ${info?.error?.message ?? 'sin url'}`)
  if (Number(info.file_size) > MAX_AUDIO_BYTES) throw new Error('AUDIO_MUY_LARGO')
  const archivo = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } })
  if (!archivo.ok) throw new Error(`Meta media descarga ${archivo.status}`)
  const buffer = Buffer.from(await archivo.arrayBuffer())
  if (buffer.length > MAX_AUDIO_BYTES) throw new Error('AUDIO_MUY_LARGO')
  return { buffer, mime: info.mime_type ?? 'audio/ogg' }
}
