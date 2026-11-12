import { describe, expect, it } from 'vitest'
import { traducirErrorAuth, validarPasswordNueva } from './erroresAuth'

describe('traducirErrorAuth', () => {
  it('traduce los errores comunes de Supabase', () => {
    expect(traducirErrorAuth({ message: 'Invalid login credentials' })).toBe('Correo o contraseña incorrectos.')
    expect(traducirErrorAuth({ message: 'Email not confirmed' })).toContain('Confirma tu correo')
    expect(traducirErrorAuth({ message: 'User already registered' })).toContain('Ya existe una cuenta')
    expect(traducirErrorAuth({ message: 'Password should be at least 6 characters.' })).toBe('La contraseña debe tener al menos 6 caracteres.')
    expect(traducirErrorAuth({ message: 'New password should be different from the old password.' })).toContain('distinta')
    expect(traducirErrorAuth('For security purposes, you can only request this after 30 seconds.')).toContain('Demasiados intentos')
    expect(traducirErrorAuth({ message: 'Failed to fetch' })).toContain('Sin conexión')
  })
  it('usa un mensaje genérico para lo desconocido', () => {
    expect(traducirErrorAuth({ message: 'weird internal thing' })).toBe('No pudimos completar la operación. Intenta de nuevo.')
    expect(traducirErrorAuth(null)).toBe('No pudimos completar la operación. Intenta de nuevo.')
  })
})

describe('validarPasswordNueva', () => {
  it('exige longitud mínima y que coincidan', () => {
    expect(validarPasswordNueva('corta', 'corta')).toContain('al menos 8')
    expect(validarPasswordNueva('', '')).toContain('al menos 8')
    expect(validarPasswordNueva('suficiente1', 'distinta12')).toBe('Las contraseñas no coinciden.')
    expect(validarPasswordNueva('suficiente1', 'suficiente1')).toBeNull()
  })
})
