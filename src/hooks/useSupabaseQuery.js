import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getQueryCache,
  hasQueryCache,
  queryKeyMatchesTarget,
  setQueryCache,
  subscribeQueryInvalidation,
} from '../utils/queryCache'

export { clearQueryCache, invalidateQueryCache } from '../utils/queryCache'

// Cache module-level: sobrevive al desmontar componentes, asi navegar entre
// paginas y volver no vuelve a mostrar skeleton ni re-consultar desde cero.
// Patron stale-while-revalidate: pinta lo cacheado al instante y revalida en
// segundo plano. Solo se activa si se pasa un `cacheKey`; sin el, el hook se
// comporta exactamente como antes (sin cache).
//
// IMPORTANTE: el `cacheKey` debe incluir las mismas variables que `deps`
// (ej. `dash-ingresos-${mes}-${anio}`) para que cada combinacion tenga su
// propia entrada y al cambiar de mes no se mezclen datos.
export function useSupabaseQuery(queryFn, deps = [], cacheKey = null) {
  const tieneCache = hasQueryCache(cacheKey)
  const [data, setData] = useState(tieneCache ? getQueryCache(cacheKey) : null)
  const [loading, setLoading] = useState(!tieneCache)
  const [error, setError] = useState(null)
  // Id de la última petición lanzada: si el usuario cambia de mes rápido, una
  // respuesta vieja que llegue tarde no debe pisar los datos del mes nuevo.
  const ultimaPeticionRef = useRef(0)

  const fetch = useCallback(async ({ silent = false } = {}) => {
    const peticion = ++ultimaPeticionRef.current
    if (!silent) setLoading(true)
    setError(null)
    try {
      const result = await queryFn()
      // El cache se guarda siempre: la key corresponde a esta petición
      setQueryCache(cacheKey, result)
      if (peticion === ultimaPeticionRef.current) setData(result)
    } catch (err) {
      if (peticion === ultimaPeticionRef.current) setError(err.message)
    } finally {
      if (peticion === ultimaPeticionRef.current) setLoading(false)
    }
  // deps es dinamico por diseno (hook generico de consultas)
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, deps)

  useEffect(() => {
    if (hasQueryCache(cacheKey)) {
      // Hay dato cacheado para esta key: pintalo ya y revalida sin skeleton.
      // setState directo aqui es intencional: queremos pintar el cache al montar.
      /* eslint-disable react-hooks/set-state-in-effect */
      setData(getQueryCache(cacheKey))
      setLoading(false)
      /* eslint-enable react-hooks/set-state-in-effect */
      fetch({ silent: true })
    } else {
      fetch()
    }
  // cacheKey va de la mano con deps (se construye a partir de las mismas vars)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetch])

  useEffect(() => {
    if (cacheKey == null) return undefined
    return subscribeQueryInvalidation((target) => {
      if (queryKeyMatchesTarget(cacheKey, target)) fetch({ silent: true })
    })
  }, [cacheKey, fetch])

  // refetch({ silent: true }) actualiza en segundo plano, sin pasar por loading:
  // úsalo tras guardar algo, o la página cambiaría su contenido por el
  // skeleton un instante (el "flashazo"). Sin argumentos muestra la carga.
  // (Si se pasa como onClick llega un evento: su .silent es undefined → normal.)
  const refetch = useCallback((opciones) => fetch({ silent: Boolean(opciones?.silent) }), [fetch])

  return { data, loading, error, refetch }
}
