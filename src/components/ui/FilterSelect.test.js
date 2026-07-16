import { describe, expect, it } from 'vitest'
import { filtrarOpciones } from './filterSelectUtils'

const opciones = [
  { value: 1, label: 'Café', icon: '☕' },
  { value: 2, label: 'Mascotas', icon: '🐾' },
  { value: 3, label: 'Entretenimiento', icon: '🎬' },
]

describe('filtrarOpciones', () => {
  it('busca sin distinguir mayusculas ni acentos', () => {
    expect(filtrarOpciones(opciones, 'CAFE')).toEqual([opciones[0]])
  })

  it('encuentra coincidencias parciales', () => {
    expect(filtrarOpciones(opciones, 'mas')).toEqual([opciones[1]])
  })

  it('devuelve todas las opciones cuando no hay busqueda', () => {
    expect(filtrarOpciones(opciones, '')).toEqual(opciones)
  })
})
