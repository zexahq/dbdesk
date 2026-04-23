import type { EditorQueryBlock } from '@dbdesk/shared/types'

/**
 * Skip over a dollar-quoted string: $tag$...$tag$
 * Returns the index after the closing dollar-quote tag.
 */
function skipDollarQuotedString(text: string, start: number): number {
  // We are at a '$'. Read the tag up to and including the next '$'.
  let tagEnd = start + 1
  while (tagEnd < text.length && text[tagEnd] !== '$') {
    const ch = text[tagEnd]
    // Tag chars: letters, digits, underscore
    if (/[a-zA-Z0-9_]/.test(ch)) {
      tagEnd++
    } else {
      // Not a valid dollar-quote tag, treat '$' as a regular character
      return start + 1
    }
  }
  if (tagEnd >= text.length) return start + 1

  const tag = text.slice(start, tagEnd + 1) // e.g. "$tag$" or "$$"
  tagEnd++ // skip closing '$' of opening tag

  // Search for the matching closing tag
  const idx = tagEnd
  while (idx < text.length) {
    const pos = text.indexOf(tag, idx)
    if (pos === -1) return text.length // unterminated — consume rest
    return pos + tag.length
  }
  return text.length
}

/**
 * Split a single SQL text into individual statements on unquoted, uncommented semicolons.
 * Handles single-quoted strings, double-quoted identifiers, dollar-quoted strings,
 * single-line comments (--), and multi-line comments.
 */
function splitBySemicolons(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let i = 0

  while (i < sql.length) {
    const ch = sql[i]

    // Single-line comment
    if (ch === '-' && i + 1 < sql.length && sql[i + 1] === '-') {
      const end = sql.indexOf('\n', i)
      if (end === -1) {
        current += sql.slice(i)
        i = sql.length
      } else {
        current += sql.slice(i, end + 1)
        i = end + 1
      }
      continue
    }

    // Multi-line comment
    if (ch === '/' && i + 1 < sql.length && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2)
      if (end === -1) {
        current += sql.slice(i)
        i = sql.length
      } else {
        current += sql.slice(i, end + 2)
        i = end + 2
      }
      continue
    }

    // Single-quoted string
    if (ch === "'") {
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === "'") {
          j++
          if (j >= sql.length || sql[j] !== "'") break
          j++ // escaped quote ''
        } else {
          j++
        }
      }
      current += sql.slice(i, j)
      i = j
      continue
    }

    // Double-quoted identifier
    if (ch === '"') {
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === '"') {
          j++
          if (j >= sql.length || sql[j] !== '"') break
          j++ // escaped ""
        } else {
          j++
        }
      }
      current += sql.slice(i, j)
      i = j
      continue
    }

    // Dollar-quoted string
    if (ch === '$') {
      const end = skipDollarQuotedString(sql, i)
      current += sql.slice(i, end)
      i = end
      continue
    }

    // Semicolon — statement boundary
    if (ch === ';') {
      const trimmed = current.trim()
      if (trimmed.length > 0) {
        statements.push(trimmed)
      }
      current = ''
      i++
      continue
    }

    current += ch
    i++
  }

  const trimmed = current.trim()
  if (trimmed.length > 0) {
    statements.push(trimmed)
  }

  return statements
}

/**
 * Parse editor SQL text into query blocks.
 *
 * A block is a contiguous range of non-blank lines. Blank lines separate blocks.
 * Within each block, statements are split on semicolons (respecting strings & comments).
 *
 * Returns an array of EditorQueryBlock with 1-based line numbers.
 */
export function getEditorQueries(sql: string): EditorQueryBlock[] {
  const lines = sql.split('\n')
  const blocks: EditorQueryBlock[] = []

  let blockStart = -1
  let blockLines: string[] = []

  const flushBlock = () => {
    if (blockLines.length === 0) return

    const raw = blockLines.join('\n')
    const queries = splitBySemicolons(raw)

    if (queries.length > 0) {
      blocks.push({
        startLineNumber: blockStart + 1, // 1-based
        endLineNumber: blockStart + blockLines.length, // 1-based inclusive
        queries,
      })
    }
    blockLines = []
    blockStart = -1
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isBlank = line.trim().length === 0

    if (isBlank) {
      flushBlock()
    } else {
      if (blockStart === -1) blockStart = i
      blockLines.push(line)
    }
  }

  flushBlock()
  return blocks
}

/**
 * Check if any query in the list contains dangerous SQL keywords.
 */
const DANGEROUS_KEYWORDS = /\b(DELETE|UPDATE|INSERT|DROP|TRUNCATE|ALTER|RENAME)\b/i

export function hasDangerousSqlKeywords(query: string): boolean {
  // Strip strings, comments, and dollar-quotes before checking
  let stripped = ''
  let i = 0
  while (i < query.length) {
    const ch = query[i]

    if (ch === '-' && i + 1 < query.length && query[i + 1] === '-') {
      const end = query.indexOf('\n', i)
      i = end === -1 ? query.length : end + 1
      continue
    }

    if (ch === '/' && i + 1 < query.length && query[i + 1] === '*') {
      const end = query.indexOf('*/', i + 2)
      i = end === -1 ? query.length : end + 2
      continue
    }

    if (ch === "'") {
      let j = i + 1
      while (j < query.length) {
        if (query[j] === "'") {
          j++
          if (j >= query.length || query[j] !== "'") break
          j++
        } else {
          j++
        }
      }
      i = j
      continue
    }

    if (ch === '"') {
      let j = i + 1
      while (j < query.length) {
        if (query[j] === '"') {
          j++
          if (j >= query.length || query[j] !== '"') break
          j++
        } else {
          j++
        }
      }
      i = j
      continue
    }

    if (ch === '$') {
      const end = skipDollarQuotedString(query, i)
      if (end > i + 1) {
        i = end
        continue
      }
    }

    stripped += ch
    i++
  }

  return DANGEROUS_KEYWORDS.test(stripped)
}
