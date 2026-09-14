/**
 * Runs async work with a bounded number of in-flight tasks. This keeps large
 * schemas responsive instead of issuing an IPC request for every table at once.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let nextIndex = 0
  const workerCount = Math.min(Math.max(1, limit), items.length)

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++
        try {
          results[index] = { status: 'fulfilled', value: await mapper(items[index], index) }
        } catch (reason) {
          results[index] = { status: 'rejected', reason }
        }
      }
    })
  )

  return results
}
