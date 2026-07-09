const cache = new Map()
const listeners = new Set()

export function hasQueryCache(cacheKey) {
  return cacheKey != null && cache.has(cacheKey)
}

export function getQueryCache(cacheKey) {
  return cache.get(cacheKey)
}

export function setQueryCache(cacheKey, value) {
  if (cacheKey != null) cache.set(cacheKey, value)
}

export function clearQueryCache() {
  cache.clear()
}

export function queryKeyMatchesTarget(queryKey, target = null) {
  if (target == null) return true
  if (Array.isArray(target)) return target.some(item => queryKeyMatchesTarget(queryKey, item))
  if (typeof target === 'function') return target(queryKey)
  return String(queryKey).startsWith(String(target))
}

export function invalidateQueryCache(target = null) {
  const invalidatedKeys = []

  for (const key of cache.keys()) {
    if (queryKeyMatchesTarget(key, target)) {
      cache.delete(key)
      invalidatedKeys.push(key)
    }
  }

  listeners.forEach(listener => listener(target, invalidatedKeys))
  return invalidatedKeys
}

export function subscribeQueryInvalidation(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
