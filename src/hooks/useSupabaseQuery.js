import { useState, useEffect, useCallback } from 'react'
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

  const fetch = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const result = await queryFn()
      setData(result)
      setQueryCache(cacheKey, result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
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

  const refetch = useCallback(() => fetch(), [fetch])

  return { data, loading, error, refetch }
}
