import { describe, it, expect } from 'vitest'
import { leerUrlInicial, urlConservaToken } from './urlInicial'

describe('leerUrlInicial', () => {
  it('reconoce el enlace de recuperación de Supabase', () => {
    expect(leerUrlInicial('#access_token=abc&expires_in=3600&refresh_token=x&token_type=bearer&type=recovery'))
      .toEqual({ recuperacion: true, enlaceInvalido: false })
  })
  it('un inicio de sesión por enlace que no es de recuperación no cuenta', () => {
    expect(leerUrlInicial('#access_token=abc&type=signup').recuperacion).toBe(false)
    expect(leerUrlInicial('#type=recovery').recuperacion).toBe(false)   // sin token no hay sesión
    expect(leerUrlInicial('#access_token=abc&type=recovery_extra').recuperacion).toBe(false)
  })
  it('reconoce un enlace vencido, en el hash o en la query', () => {
    expect(leerUrlInicial('#error=access_denied&error_code=otp_expired').enlaceInvalido).toBe(true)
    expect(leerUrlInicial('', '?error_code=otp_expired').enlaceInvalido).toBe(true)
  })
  it('una URL normal no activa nada', () => {
    expect(leerUrlInicial('', '?mes=11')).toEqual({ recuperacion: false, enlaceInvalido: false })
    expect(leerUrlInicial()).toEqual({ recuperacion: false, enlaceInvalido: false })
  })
})

describe('urlConservaToken', () => {
  it('detecta si el token sigue en la URL (el enlace no sirvió)', () => {
    expect(urlConservaToken('#access_token=falso&type=recovery')).toBe(true)
    expect(urlConservaToken('')).toBe(false)
  })
})
