import { describe, expect, it } from 'vitest'
import { plural } from './texto'

describe('plural', () => {
  it('usa singular solo con 1', () => {
    expect(plural(1, 'gasto hormiga', 'gastos hormiga')).toBe('1 gasto hormiga')
    expect(plural(0, 'gasto hormiga', 'gastos hormiga')).toBe('0 gastos hormiga')
    expect(plural(3, 'categoría visible', 'categorías visibles')).toBe('3 categorías visibles')
  })
  it('por defecto agrega "s"', () => {
    expect(plural(2, 'límite copiado', 'límites copiados')).toBe('2 límites copiados')
    expect(plural(1, 'registro')).toBe('1 registro')
    expect(plural(5, 'registro')).toBe('5 registros')
  })
})
