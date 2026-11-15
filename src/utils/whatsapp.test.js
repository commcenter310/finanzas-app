import { describe, it, expect } from 'vitest'
import { resultadoVerificacion, soloCodigo } from './whatsapp'

describe('verificación del número de WhatsApp', () => {
  it('solo "ok" verifica; cada estado tiene su mensaje', () => {
    expect(resultadoVerificacion('ok')).toMatchObject({ ok: true })
    for (const estado of ['incorrecto', 'vencido', 'bloqueado', 'sin_codigo', 'sin_telefono']) {
      const r = resultadoVerificacion(estado)
      expect(r.ok).toBe(false)
      expect(r.mensaje.length).toBeGreaterThan(10)
    }
    expect(resultadoVerificacion('vencido').mensaje).not.toBe(resultadoVerificacion('incorrecto').mensaje)
  })
  it('estado desconocido (o función sin instalar): mensaje genérico, no verifica', () => {
    expect(resultadoVerificacion(undefined)).toEqual({ ok: false, mensaje: 'No pudimos verificar el código. Intenta de nuevo.' })
  })
  it('soloCodigo deja 6 dígitos', () => {
    expect(soloCodigo(' 48 29-13x9 ')).toBe('482913')
  })
})
