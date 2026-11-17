import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { RUTAS_CUENTA, SECCIONES, rutaDeSeccion, seccionDeRuta } from './secciones'

// Rutas declaradas en App.jsx (se leen del archivo para que este test avise si
// se agrega una página y nadie la pone en la navegación)
const rutasApp = [...readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8')
  .matchAll(/<Route path="(\/[^"*]*)"/g)]
  .map(m => m[1])
  .filter(r => r !== '/auth')

describe('secciones', () => {
  it('cada ruta de App.jsx está en una sección o en el menú de cuenta', () => {
    expect(rutasApp.length).toBeGreaterThan(10)
    const cuenta = RUTAS_CUENTA.map(r => r.to)
    for (const ruta of rutasApp) {
      const ubicada = seccionDeRuta(ruta) !== null || cuenta.includes(ruta)
      expect(ubicada, ruta).toBe(true)
    }
  })

  it('ninguna ruta aparece dos veces', () => {
    const todas = [...SECCIONES.flatMap(s => s.rutas.map(r => r.to)), ...RUTAS_CUENTA.map(r => r.to)]
    expect(new Set(todas).size).toBe(todas.length)
  })

  it('agrupa las rutas en su sección', () => {
    expect(seccionDeRuta('/gastos-fijos').clave).toBe('gastos')
    expect(seccionDeRuta('/gastos-variables').clave).toBe('gastos')
    expect(seccionDeRuta('/creditos').clave).toBe('deudas')
    expect(seccionDeRuta('/simulador').clave).toBe('deudas')
    expect(seccionDeRuta('/proyeccion').clave).toBe('plan')
  })

  it('"/" solo coincide exacto', () => {
    expect(seccionDeRuta('/').clave).toBe('inicio')
    expect(seccionDeRuta('/perfil')).toBeNull()
    expect(seccionDeRuta('/no-existe')).toBeNull()
  })

  it('ignora query y barra final', () => {
    expect(seccionDeRuta('/control-gastos?nuevo=1').clave).toBe('gastos')
    expect(seccionDeRuta('/deudas/').clave).toBe('deudas')
  })

  it('el enlace de una sección lleva a su primera ruta', () => {
    expect(rutaDeSeccion(seccionDeRuta('/creditos'))).toBe('/deudas')
  })
})
