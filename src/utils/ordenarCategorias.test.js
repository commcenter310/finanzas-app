import { describe, expect, it } from 'vitest'
import { ordenarCategorias } from './ordenarCategorias'

const cats = [
  { nombre: 'Transporte', clasificacion: 'necesidad', gastado: 300, limite: 1000 },
  { nombre: 'antojos', clasificacion: 'deseo', gastado: 900, limite: 1000 },
  { nombre: 'Óptica', clasificacion: 'necesidad', gastado: 0, limite: 0 },
  { nombre: 'Niños', clasificacion: 'necesidad', gastado: 900, limite: 0 },
  { nombre: 'Ñoquis', clasificacion: 'deseo', gastado: 50, limite: 100 },
  { nombre: 'Ahorro', clasificacion: 'ahorro', gastado: 500, limite: 500 },
]
const nombres = lista => lista.map(c => c.nombre)

describe('ordenarCategorias', () => {
  it('por defecto ordena A–Z en español sin importar clasificación, acentos ni mayúsculas', () => {
    expect(nombres(ordenarCategorias(cats))).toEqual(['Ahorro', 'antojos', 'Niños', 'Ñoquis', 'Óptica', 'Transporte'])
  })

  it('mayor gasto primero; empates en orden alfabético', () => {
    expect(nombres(ordenarCategorias(cats, 'gasto'))).toEqual(['antojos', 'Niños', 'Ahorro', 'Transporte', 'Ñoquis', 'Óptica'])
  })

  it('mayor % usado primero; sin límite al final', () => {
    // Ahorro 100%, antojos 90%, Ñoquis 50%, Transporte 30%, luego sin límite (Niños, Óptica)
    expect(nombres(ordenarCategorias(cats, 'uso'))).toEqual(['Ahorro', 'antojos', 'Ñoquis', 'Transporte', 'Niños', 'Óptica'])
  })

  it('no modifica el arreglo original y tolera null', () => {
    const copia = [...cats]
    ordenarCategorias(cats)
    expect(cats).toEqual(copia)
    expect(ordenarCategorias(null)).toEqual([])
  })
})
