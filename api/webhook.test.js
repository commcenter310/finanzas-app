import crypto from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

const procesarMensaje = vi.hoisted(() => vi.fn())
vi.mock('./_lib/whatsapp.js', () => ({ procesarMensaje }))

const SECRETO = 'secreto-de-prueba'
const firmar = (cuerpo, secreto = SECRETO) => `sha256=${crypto.createHmac('sha256', secreto).update(cuerpo).digest('hex')}`

// Carga el webhook con las variables de entorno indicadas (se leen al importar)
async function cargar(env = {}) {
  vi.resetModules()
  vi.unstubAllEnvs()
  for (const [k, v] of Object.entries({ WHATSAPP_APP_SECRET: SECRETO, WHATSAPP_VERIFY_TOKEN: 'verifica', ...env })) vi.stubEnv(k, v)
  return import('./webhook.js')
}

function pedir(handler, { method = 'POST', cuerpo = '', headers = {}, query = {} } = {}) {
  const req = { method, headers, query, async *[Symbol.asyncIterator]() { yield Buffer.from(cuerpo) } }
  const res = { codigo: null, cuerpo: null, status(c) { this.codigo = c; return this }, send(b) { this.cuerpo = b; return this }, json(b) { this.cuerpo = b; return this } }
  return handler(req, res).then(() => res)
}

const lote = JSON.stringify({
  entry: [{
    changes: [
      { value: { statuses: [{ id: 'wamid.x', status: 'delivered' }] } },   // aviso de entrega: no es mensaje
      { value: { messages: [
        { from: '5216670000001', id: 'wamid.1', type: 'text', text: { body: '  89 café nu ' } },
        { from: '5216670000001', id: 'wamid.2', type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: 'metodo:3', title: 'Efectivo' } } },
        { from: '5216670000001', id: 'wamid.3', type: 'audio', audio: { id: 'media9' } },
        { from: '5216670000001', id: 'wamid.4', type: 'image', image: { id: 'img1' } },
        { from: '5216670000001', id: 'wamid.5', type: 'text', text: { body: '   ' } },   // vacío: se ignora
      ] } },
    ],
  }],
})

afterEach(() => { procesarMensaje.mockReset(); vi.unstubAllEnvs() })

describe('webhook de WhatsApp', () => {
  it('sin WHATSAPP_APP_SECRET no atiende nada (503)', async () => {
    const { default: handler } = await cargar({ WHATSAPP_APP_SECRET: '' })
    const res = await pedir(handler, { cuerpo: lote, headers: { 'x-hub-signature-256': firmar(lote) } })
    expect(res.codigo).toBe(503)
    expect(procesarMensaje).not.toHaveBeenCalled()
  })

  it('firma ausente o de otro secreto: 401 y no procesa', async () => {
    const { default: handler } = await cargar()
    expect((await pedir(handler, { cuerpo: lote })).codigo).toBe(401)
    expect((await pedir(handler, { cuerpo: lote, headers: { 'x-hub-signature-256': firmar(lote, 'otro') } })).codigo).toBe(401)
    expect((await pedir(handler, { cuerpo: lote + ' ', headers: { 'x-hub-signature-256': firmar(lote) } })).codigo).toBe(401)
    expect(procesarMensaje).not.toHaveBeenCalled()
  })

  it('firma válida: atiende todos los mensajes del lote, cada uno con su forma', async () => {
    const { default: handler } = await cargar()
    const res = await pedir(handler, { cuerpo: lote, headers: { 'x-hub-signature-256': firmar(lote) } })
    expect(res.codigo).toBe(200)
    expect(procesarMensaje.mock.calls.map(c => c[0])).toEqual([
      { telefono: '5216670000001', wamid: 'wamid.1', tipo: 'texto', texto: '89 café nu' },
      { telefono: '5216670000001', wamid: 'wamid.2', tipo: 'opcion', opcionId: 'metodo:3', texto: 'Efectivo' },
      { telefono: '5216670000001', wamid: 'wamid.3', tipo: 'audio', mediaId: 'media9' },
      { telefono: '5216670000001', wamid: 'wamid.4', tipo: 'otro' },
    ])
  })

  it('si un mensaje truena, sigue con los demás y responde 200', async () => {
    const { default: handler } = await cargar()
    procesarMensaje.mockRejectedValueOnce(new Error('boom'))
    const res = await pedir(handler, { cuerpo: lote, headers: { 'x-hub-signature-256': firmar(lote) } })
    expect(res.codigo).toBe(200)
    expect(procesarMensaje).toHaveBeenCalledTimes(4)
  })

  it('verificación de Meta (GET) solo con el token correcto', async () => {
    const { default: handler } = await cargar()
    const ok = await pedir(handler, { method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'verifica', 'hub.challenge': '12345' } })
    expect([ok.codigo, ok.cuerpo]).toEqual([200, '12345'])
    expect((await pedir(handler, { method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'mal' } })).codigo).toBe(403)
  })

  it('JSON inválido con firma válida: 400', async () => {
    const { default: handler } = await cargar()
    expect((await pedir(handler, { cuerpo: '{no json', headers: { 'x-hub-signature-256': firmar('{no json') } })).codigo).toBe(400)
  })
})
