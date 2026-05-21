import { processMessage } from './lib/whatsapp.js'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN

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
    try {
      const entry   = req.body?.entry?.[0]
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
