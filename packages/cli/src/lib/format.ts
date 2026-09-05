/** Minimal ASCII table renderer for human-readable CLI output. */
export function formatTable(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '(empty)'

  const keys = Object.keys(data[0] as Record<string, unknown>)
  const widths = keys.map((k) =>
    Math.max(k.length, ...data.map((r) => String(r[k] ?? '').length))
  )

  const header =
    keys.map((k, i) => k.padEnd(widths[i] as number)).join('  ') +
    '\n' +
    widths.map((w) => '-'.repeat(w)).join('  ')

  const body = data
    .map((row) => keys.map((k, i) => String(row[k] ?? '').padEnd(widths[i] as number)).join('  '))
    .join('\n')

  return header + '\n' + body
}
