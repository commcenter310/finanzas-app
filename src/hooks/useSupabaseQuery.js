import { useState, useEffect, useCallback } from 'react'

// Cache module-level: sobrevive al desmontar componentes, así navegar entre
// páginas y volver no vuelve a mostrar skeleton ni re-consultar desde cero.
// Patrón stale-while-revalidate: pinta lo cacheado al instante y revalida en
// segundo plano. Solo se activa si se pasa un `cacheKey`; sin él, el hook se
// comporta exactamente como antes (sin cache).
//
// IMPORTANTE: el `cacheKey` debe incluir las mismas variables que `deps`
// (ej. `dash-ingresos-${mes}-${anio}`) para que cada combinación tenga su
// propia entrada y al cambiar de mes no se mezclen datos.
const cache = new Map()

export function useSupabaseQuery(queryFn, deps = [], cacheKey = null) {
  const tieneCache = cacheKey != null && cache.has(cacheKey)
  const [data, setData] = useState(tieneCache ? cache.get(cacheKey) : null)
  const [loading, setLoading] = useState(!tieneCache)
  const [error, setError] = useState(null)

  const fetch = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const result = await queryFn()
      setData(result)
      if (cacheKey != null) cache.set(cacheKey, result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (cacheKey != null && cache.has(cacheKey)) {
      // Hay dato cacheado para esta key → píntalo ya y revalida sin skeleton
      setData(cache.get(cacheKey))
      setLoading(false)
      fetch({ silent: true })
    } else {
      fetch()
    }
  }, [fetch])

  const refetch = useCallback(() => fetch(), [fetch])

  return { data, loading, error, refetch }
}
