// Capturas de todas las pantallas con datos ficticios (no toca Supabase real).
//
//   1. Levanta la app apuntando al Supabase simulado:
//        VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_ANON_KEY=x npm run dev
//   2. En otra terminal:
//        node scripts/capturas/capturar.mjs <etiqueta> [pantallas] [variantes]
//      Ejemplos:
//        node scripts/capturas/capturar.mjs antes
//        node scripts/capturas/capturar.mjs v1 inicio,movimientos escritorio,movil
//   Deja los PNG en scripts/capturas/salida/ (ignorada por git).
//
// Requiere Playwright con Chromium. No es dependencia del proyecto: usa el que
// tenga el entorno, o indica su ruta con PLAYWRIGHT_PATH=/ruta/a/playwright.
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { instalarMock } from './mock.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? 'playwright')

const BASE = process.env.APP_URL ?? 'http://localhost:5173'
const SALIDA = fileURLToPath(new URL('./salida/', import.meta.url))
const [, , etiqueta = 'captura', filtroPantallas = '', filtroVariantes = ''] = process.argv

const PANTALLAS = [
  ['inicio', '/'], ['movimientos', '/control-gastos'], ['plan', '/plan-quincena'],
  ['ingresos', '/ingresos'], ['fijos', '/gastos-fijos'], ['presupuesto', '/gastos-variables'],
  ['ahorros', '/ahorros'], ['creditos', '/creditos'], ['deudas', '/deudas'],
  ['tendencias', '/tendencias'], ['proyeccion', '/proyeccion'], ['simulador', '/simulador'],
  ['whatsapp', '/whatsapp'], ['perfil', '/perfil'],
]
const VARIANTES = [
  ['escritorio', 'light', { width: 1440, height: 900 }],
  ['oscuro', 'dark', { width: 1440, height: 900 }],
  ['laptop', 'light', { width: 1280, height: 720 }],
  ['movil', 'light', { width: 390, height: 844 }],
]
const incluye = (filtro, nombre) => !filtro || filtro.split(',').includes(nombre)

mkdirSync(SALIDA, { recursive: true })
const browser = await chromium.launch()

for (const [variante, tema, viewport] of VARIANTES) {
  if (!incluye(filtroVariantes, variante)) continue
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  // Fecha fija (los datos ficticios son de nov 2026); los temporizadores siguen corriendo
  await ctx.clock.setFixedTime(new Date('2026-11-15T12:00:00'))
  await instalarMock(ctx, { tema })
  const page = await ctx.newPage()
  page.on('pageerror', error => console.log('ERROR EN PÁGINA', variante, error.message))
  for (const [nombre, ruta] of PANTALLAS) {
    if (!incluye(filtroPantallas, nombre)) continue
    await page.goto(BASE + ruta, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1800) // deja terminar la animación de las gráficas
    // "pliegue": lo que se ve sin hacer scroll (sirve para medir densidad)
    await page.screenshot({ path: `${SALIDA}${etiqueta}-${variante}-${nombre}-pliegue.png` })
    await page.screenshot({ path: `${SALIDA}${etiqueta}-${variante}-${nombre}.png`, fullPage: true })
    const alto = await page.evaluate(() => document.documentElement.scrollHeight)
    console.log(`${variante.padEnd(10)} ${nombre.padEnd(12)} alto total: ${alto}px`)
  }
  await ctx.close()
}

if (incluye(filtroPantallas, 'auth')) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await instalarMock(ctx, { vacio: true })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${SALIDA}${etiqueta}-escritorio-auth.png` })
  await ctx.close()
}

await browser.close()
