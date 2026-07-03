import crypto from 'node:crypto'
import { processMessage } from './lib/whatsapp.js'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN
// App Secret de Meta (Configuración de la app → Básica → Clave secreta).
// Firma cada payload del webhook; sin verificarla, cualquiera que conozca la
// URL puede suplantar mensajes de WhatsApp de cualquier número.
const APP_SECRET = process.env.WHATSAPP_APP_SECRET

// bodyParser desactivado: la firma HMAC se calcula sobre el body CRUDO byte a
// byte — si Vercel lo parsea y re-serializa, la verificación se vuelve inviable.
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
  // GET — Verificación de Meta (solo la primera vez que configuras el webhook)
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode']
    const token     = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verificado por Meta')
      return res.status(200).send(challenge)
    }
    return res.status(403).json({ error: 'Forbidden' })
  }

  // POST — Mensaje entrante de WhatsApp
  if (req.method === 'POST') {
    const rawBody = await readRawBody(req)

    // Verificación de firma. Si WHATSAPP_APP_SECRET aún no está configurado en
    // Vercel, se procesa con una advertencia para no tumbar el bot — pero debe
    // configurarse cuanto antes.
    if (APP_SECRET) {
      if (!verifySignature(rawBody, req.headers['x-hub-signature-256'])) {
        console.warn('🚫 Firma inválida — payload rechazado')
        return res.status(401).json({ error: 'Invalid signature' })
      }
    } else {
      console.warn('⚠️ WHATSAPP_APP_SECRET no configurado — webhook SIN verificación de firma')
    }

    try {
      const body    = JSON.parse(rawBody.toString('utf8'))
      const entry   = body?.entry?.[0]
      const change  = entry?.changes?.[0]
      const message = change?.value?.messages?.[0]

      // Solo procesar mensajes de texto (ignorar imágenes, stickers, etc.)
      if (message && message.type === 'text') {
        const telefono = message.from   // Ej: "5216681234567"
        const texto    = message.text.body.trim()

        console.log('📱 Mensaje recibido de:', telefono, '| Texto:', texto)

        if (texto) {
          await processMessage(telefono, texto)
          console.log('✅ processMessage completado')
        }
      }
    } catch (error) {
      console.error('Error procesando mensaje WhatsApp:', error)
    }

    // Responder 200 DESPUÉS de procesar (Meta espera hasta 20s)
    return res.status(200).send('OK')
  }

  return res.status(405).json({ error: 'Method Not Allowed' })
}
