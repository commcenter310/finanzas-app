import crypto from 'node:crypto'
import { procesarMensaje } from './_lib/whatsapp.js'
import { envFlag, maskTelefono } from './_lib/env.js'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN
const APP_SECRET = process.env.WHATSAPP_APP_SECRET
// La firma de Meta es obligatoria: sin ella cualquiera que conozca esta URL
// podría registrar o borrar gastos haciéndose pasar por un número.
// Solo para pruebas locales se puede apagar con WHATSAPP_REQUIRE_SIGNATURE=false.
const EXIGIR_FIRMA = envFlag('WHATSAPP_REQUIRE_SIGNATURE', true)

// bodyParser desactivado: la firma HMAC se calcula sobre el body crudo.
export const config = { api: { bodyParser: false } }

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

export function firmaValida(rawBody, signatureHeader, secreto) {
  if (!secreto || !signatureHeader?.startsWith('sha256=')) return false
  const expected = crypto.createHmac('sha256', secreto).update(rawBody).digest()
  let received
  try { received = Buffer.from(signatureHeader.slice(7), 'hex') } catch { return false }
  if (expected.length !== received.length) return false
  return crypto.timingSafeEqual(expected, received)
}

// Mensaje de Meta → lo que entiende el bot. null = nada que atender.
export function leerMensaje(message) {
  if (!message?.from) return null
  const base = { telefono: message.from, wamid: message.id ?? null }
  if (message.type === 'text') {
    const texto = String(message.text?.body ?? '').trim()
    return texto ? { ...base, tipo: 'texto', texto } : null
  }
  if (message.type === 'interactive') {
    const r = message.interactive?.button_reply ?? message.interactive?.list_reply
    return r?.id ? { ...base, tipo: 'opcion', opcionId: String(r.id), texto: String(r.title ?? '') } : null
  }
  if (message.type === 'button') {
    const texto = String(message.button?.text ?? '').trim()
    return texto ? { ...base, tipo: 'texto', texto } : null
  }
  if (message.type === 'audio' && message.audio?.id) return { ...base, tipo: 'audio', mediaId: message.audio.id }
  return { ...base, tipo: 'otro' }
}

// Un webhook puede traer varios mensajes (y avisos de entrega, que no lo son)
export function mensajesDe(body) {
  return (body?.entry ?? [])
    .flatMap(entry => entry?.changes ?? [])
    .flatMap(change => change?.value?.messages ?? [])
    .map(leerMensaje)
    .filter(Boolean)
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode']
    const token     = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && VERIFY_TOKEN && token === VERIFY_TOKEN) {
      console.log('Webhook verificado por Meta')
      return res.status(200).send(challenge)
    }
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (req.method === 'POST') {
    const rawBody = await readRawBody(req)

    if (EXIGIR_FIRMA) {
      if (!APP_SECRET) {
        console.error('Falta WHATSAPP_APP_SECRET: el bot no atiende mensajes hasta configurarlo en Vercel')
        return res.status(503).json({ error: 'Webhook signature secret not configured' })
      }
      if (!firmaValida(rawBody, req.headers['x-hub-signature-256'], APP_SECRET)) {
        console.warn('Firma invalida: payload rechazado')
        return res.status(401).json({ error: 'Invalid signature' })
      }
    } else {
      console.warn('Webhook SIN verificacion de firma (WHATSAPP_REQUIRE_SIGNATURE=false)')
    }

    let body
    try {
      body = JSON.parse(rawBody.toString('utf8'))
    } catch (error) {
      console.error('Payload JSON invalido en webhook WhatsApp:', error)
      return res.status(400).json({ error: 'Invalid JSON' })
    }

    // Se responde 200 aunque un mensaje falle: si no, Meta reintenta el lote
    // completo. Cada mensaje maneja y registra su propio error.
    for (const mensaje of mensajesDe(body)) {
      try {
        // Sin el texto: contiene montos y conceptos de gasto del usuario
        console.log('Mensaje recibido de:', maskTelefono(mensaje.telefono), '| tipo:', mensaje.tipo)
        await procesarMensaje(mensaje)
      } catch (error) {
        console.error('Error procesando mensaje WhatsApp:', error)
      }
    }

    return res.status(200).send('OK')
  }

  return res.status(405).json({ error: 'Method Not Allowed' })
}
