import { lazy } from 'react'

// Envuelve React.lazy para recuperarse de "chunks viejos" tras un deploy nuevo.
//
// Problema: con lazy-loading + PWA, cuando se publica una versión nueva los
// archivos JS cambian de hash. Un navegador con el index.html viejo (cacheado
// por el Service Worker) pide un chunk que ya no existe → el server responde
// con index.html (MIME text/html) → el import() falla y la página no carga.
//
// Solución: si el import() falla, recargamos la página UNA sola vez para tomar
// el index.html nuevo con los nombres de chunk correctos. Un flag en
// sessionStorage evita un bucle de recargas si el fallo fuera por otra causa.
const RELOAD_KEY = 'chunk-reload-once'

export function lazyWithRetry(importFn) {
  return lazy(async () => {
    try {
      const mod = await importFn()
      sessionStorage.removeItem(RELOAD_KEY)
      return mod
    } catch (err) {
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1')
        window.location.reload()
        // Módulo vacío mientras el navegador recarga (no llega a renderizarse)
        return { default: () => null }
      }
      throw err
    }
  })
}
