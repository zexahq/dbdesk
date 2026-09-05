/**
 * SQL parsing utilities for query detection and pagination
 */

export const normalizeQuery = (query: string): string => {
  return query.replace(/;+\s*$/, '')
}

const DOLLAR_QUOTE_TAG_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

const getDollarQuoteTag = (text: string, start: number): string | null => {
  if (text[start] !== '$') {
    return null
  }

  let index = start + 1
  while (index < text.length && /[A-Za-z0-9_]/.test(text[index])) {
    index++
  }

  if (index >= text.length || text[index] !== '$') {
    return null
  }

  const tagBody = text.slice(start + 1, index)
  if (tagBody !== '' && !DOLLAR_QUOTE_TAG_PATTERN.test(tagBody)) {
    return null
  }

  return text.slice(start, index + 1)
}

export const skipDollarQuotedString = (text: string, start: number): number => {
  const tag = getDollarQuoteTag(text, start)
  if (!tag) {
    return start
  }

  const closingIndex = text.indexOf(tag, start + tag.length)
  return closingIndex === -1 ? text.length : closingIndex + tag.length
}

export const skipLineComment = (text: string, start: number): number => {
  if (text[start] !== '-' || text[start + 1] !== '-') {
    return start
  }

  let index = start + 2
  while (index < text.length && text[index] !== '\n') {
    index++
  }

  return index
}

export const skipBlockComment = (text: string, start: number): number => {
  if (text[start] !== '/' || text[start + 1] !== '*') {
    return start
  }

  let index = start + 2
  let depth = 1

  while (index < text.length && depth > 0) {
    if (text[index] === '/' && text[index + 1] === '*') {
      depth++
      index += 2
    } else if (text[index] === '*' && text[index + 1] === '/') {
      depth--
      index += 2
    } else if (text[index] === "'") {
      index = skipQuotedString(text, index, "'")
    } else if (text[index] === '"') {
      index = skipQuotedString(text, index, '"')
    } else if (text[index] === '$') {
      const nextIndex = skipDollarQuotedString(text, index)
      index = nextIndex === index ? index + 1 : nextIndex
    } else {
      index++
    }
  }

  return index
}

export const skipQuotedString = (text: string, start: number, quoteChar: string): number => {
  let index = start
  if (text[index] !== quoteChar) return start

  index++
  while (index < text.length) {
    if (text[index] === quoteChar) {
      index++
      if (index >= text.length || text[index] !== quoteChar) {
        break
      }
      index++
    } else {
      index++
    }
  }
  return index
}

export const skipParenthesizedSection = (text: string, start: number): number => {
  let index = start
  if (text[index] !== '(') return start

  let depth = 1
  index++

  while (index < text.length && depth > 0) {
    const char = text[index]
    if (char === "'") {
      index = skipQuotedString(text, index, "'")
    } else if (char === '"') {
      index = skipQuotedString(text, index, '"')
    } else if (char === '$') {
      const nextIndex = skipDollarQuotedString(text, index)
      index = nextIndex === index ? index + 1 : nextIndex
    } else if (char === '-' && text[index + 1] === '-') {
      index = skipLineComment(text, index)
    } else if (char === '/' && text[index + 1] === '*') {
      index = skipBlockComment(text, index)
    } else if (char === '(') {
      depth++
      index++
    } else if (char === ')') {
      depth--
      index++
    } else {
      index++
    }
  }
  return index
}

export const hasAdditionalStatements = (query: string): boolean => {
  let index = 0
  const length = query.length

  while (index < length) {
    const char = query[index]

    if (char === "'") {
      index = skipQuotedString(query, index, "'")
    } else if (char === '"') {
      index = skipQuotedString(query, index, '"')
    } else if (char === '$') {
      const nextIndex = skipDollarQuotedString(query, index)
      index = nextIndex === index ? index + 1 : nextIndex
    } else if (char === '-' && query[index + 1] === '-') {
      index = skipLineComment(query, index)
    } else if (char === '/' && query[index + 1] === '*') {
      index = skipBlockComment(query, index)
    } else if (char === '(') {
      index = skipParenthesizedSection(query, index)
    } else if (char === ';') {
      const afterSemicolon = query.substring(index + 1).trim()
      return afterSemicolon.length > 0
    } else {
      index++
    }
  }

  return false
}

export const getInitialStatementKeyword = (query: string): string | null => {
  let index = 0
  const length = query.length

  const skipWhitespace = () => {
    while (index < length) {
      if (/\s/.test(query[index])) {
        index++
        continue
      }

      if (query[index] === '-' && query[index + 1] === '-') {
        index = skipLineComment(query, index)
        continue
      }

      if (query[index] === '/' && query[index + 1] === '*') {
        index = skipBlockComment(query, index)
        continue
      }

      break
    }
  }

  const readWord = (): string => {
    skipWhitespace()
    let word = ''
    while (index < length && /[a-zA-Z_]/.test(query[index])) {
      word += query[index]
      index++
    }
    return word
  }

  const readWordLower = () => readWord().toLowerCase()

  const tryReadWord = (expected: string): boolean => {
    const start = index
    const word = readWordLower()
    if (word === expected) {
      return true
    }

    index = start
    return false
  }

  skipWhitespace()
  const firstWord = readWordLower()
  if (firstWord !== 'with') {
    return firstWord || null
  }

  tryReadWord('recursive')

  while (index < length) {
    skipWhitespace()
    if (index >= length) break

    const cteName = readWord()
    if (!cteName) break

    skipWhitespace()
    if (index < length && query[index] === '(') {
      index = skipParenthesizedSection(query, index)
    }

    skipWhitespace()

    if (!tryReadWord('as')) {
      return null
    }

    skipWhitespace()
    if (tryReadWord('not')) {
      if (!tryReadWord('materialized')) {
        return null
      }
    } else {
      tryReadWord('materialized')
    }

    skipWhitespace()
    if (index >= length || query[index] !== '(') {
      return null
    }

    index = skipParenthesizedSection(query, index)
    skipWhitespace()

    if (index < length && query[index] === ',') {
      index += 1
      skipWhitespace()
      continue
    }

    break
  }

  skipWhitespace()
  const mainKeyword = readWordLower()
  return mainKeyword || null
}

export const isSelectableQuery = (query: string): boolean => {
  const trimmed = query.trim()
  if (trimmed === '') {
    return false
  }

  const normalized = normalizeQuery(trimmed)
  if (normalized === '') {
    return false
  }

  if (hasAdditionalStatements(normalized)) {
    return false
  }

  const keyword = getInitialStatementKeyword(normalized)
  if (!keyword) {
    return false
  }

  return keyword === 'select'
}

/**
 * Returns true if the query is safe to run on a read-only connection:
 * a single statement whose leading keyword (after any WITH-CTE) is
 * SELECT or SHOW. EXPLAIN is intentionally excluded because
 * `EXPLAIN ANALYZE <dml>` executes the underlying statement in Postgres.
 */
export const isReadOnlyQuery = (query: string): boolean => {
  const trimmed = query.trim()
  if (trimmed === '') return false

  const normalized = normalizeQuery(trimmed)
  if (normalized === '') return false

  if (hasAdditionalStatements(normalized)) return false

  const keyword = getInitialStatementKeyword(normalized)
  if (!keyword) return false

  return keyword === 'select' || keyword === 'show'
}
