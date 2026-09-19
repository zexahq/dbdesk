import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ introspectTable: vi.fn() }))

vi.mock('@renderer/shared/api/client', () => ({
  dbdeskClient: { introspectTable: mocks.introspectTable }
}))

import {
  getTableIntrospection,
  refreshTableIntrospection
} from '../src/renderer/src/features/sql-workspace/queries/schema'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('table introspection cache', () => {
  beforeEach(() => mocks.introspectTable.mockReset())

  it('forces a refresh without letting the stale request clear the new request', async () => {
    const stale = deferred<never>()
    const fresh = deferred<never>()
    mocks.introspectTable.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise)

    const staleRequest = getTableIntrospection('connection', 'public', 'users')
    const freshRequest = refreshTableIntrospection('connection', 'public', 'users')

    expect(mocks.introspectTable).toHaveBeenCalledTimes(2)

    stale.resolve({} as never)
    await staleRequest

    expect(getTableIntrospection('connection', 'public', 'users')).toBe(freshRequest)
    expect(mocks.introspectTable).toHaveBeenCalledTimes(2)

    fresh.resolve({} as never)
    await freshRequest
  })
})
