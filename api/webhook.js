import crypto from 'node:crypto'
import { processMessage } from './lib/whatsapp.js'
import { envFlag } from './lib/env.js'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN
const APP_SECRET = process.env.WHATSAPP_APP_SECRET
const REQUIRE_SIGNATURE = envFlag('WHATSAPP_REQUIRE_SIGNATURE')

// bodyParser desactivado: la firma HMAC se calcula sobre el body crudo.
export const config = { api: { bodyParser: false } }

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

function verifySignature(rawBody, signatureHeader) {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const expected = crypto.createHmac('sha256', APP_SECRET).update(rawBody).digest()
  let received
  try { received = Buffer.from(signatureHeader.slice(7), 'hex') } catch { return false }
  if (expected.length !== received.length) return false
  return crypto.timingSafeEqual(expected, received)
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode']
    const token     = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verificado por Meta')
      return res.status(200).send(challenge)
    }
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (req.method === 'POST') {
    const rawBody = await readRawBody(req)

    if (APP_SECRET) {
      if (!verifySignature(rawBody, req.headers['x-hub-signature-256'])) {
        console.warn('Firma invalida: payload rechazado')
        return res.status(401).json({ error: 'Invalid signature' })
      }
    } else {
      console.warn('WHATSAPP_APP_SECRET no configurado: webhook sin verificacion de firma')
      if (REQUIRE_SIGNATURE) {
        return res.status(500).json({ error: 'Webhook signature secret not configured' })
      }
    }

    let body
    try {
      body = JSON.parse(rawBody.toString('utf8'))
    } catch (error) {
      console.error('Payload JSON invalido en webhook WhatsApp:', error)
      return res.status(400).json({ error: 'Invalid JSON' })
    }

    try {
      const entry   = body?.entry?.[0]
      const change  = entry?.changes?.[0]
      const message = change?.value?.messages?.[0]

      if (message && message.type === 'text') {
        const telefono = message.from
        const texto    = message.text.body.trim()

        console.log('Mensaje recibido de:', telefono, '| Texto:', texto)

        if (texto) {
          await processMessage(telefono, texto)
          console.log('processMessage completado')
        }
      }
    } catch (error) {
      console.error('Error procesando mensaje WhatsApp:', error)
    }

    return res.status(200).send('OK')
  }

  return res.status(405).json({ error: 'Method Not Allowed' })
}
