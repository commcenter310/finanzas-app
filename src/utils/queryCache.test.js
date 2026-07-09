import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearQueryCache,
  getQueryCache,
  invalidateQueryCache,
  queryKeyMatchesTarget,
  setQueryCache,
  subscribeQueryInvalidation,
} from './queryCache'

describe('queryCache', () => {
  beforeEach(() => {
    clearQueryCache()
  })

  it('matches prefixes, arrays and custom matchers', () => {
    expect(queryKeyMatchesTarget('dash:tx:user:7:2026', 'dash:')).toBe(true)
    expect(queryKeyMatchesTarget('creditos:user', ['dash:', 'creditos:'])).toBe(true)
    expect(queryKeyMatchesTarget('recordatorios:gastos:user', key => key.includes('gastos'))).toBe(true)
    expect(queryKeyMatchesTarget('deudas:user', 'dash:')).toBe(false)
  })

  it('invalidates matching cache entries and notifies listeners', () => {
    const notifications = []
    const unsubscribe = subscribeQueryInvalidation((target, keys) => {
      notifications.push({ target, keys })
    })

    setQueryCache('dash:tx:user:7:2026', ['tx'])
    setQueryCache('recordatorios:gastos:user:7:2026', ['rem'])
    setQueryCache('creditos:user', ['card'])

    const invalidated = invalidateQueryCache(['dash:', 'recordatorios:'])

    expect(invalidated).toEqual(['dash:tx:user:7:2026', 'recordatorios:gastos:user:7:2026'])
    expect(getQueryCache('dash:tx:user:7:2026')).toBeUndefined()
    expect(getQueryCache('recordatorios:gastos:user:7:2026')).toBeUndefined()
    expect(getQueryCache('creditos:user')).toEqual(['card'])
    expect(notifications).toHaveLength(1)

    unsubscribe()
  })
})
