/**
 * SQL parsing utilities for query detection and pagination
 */

export const normalizeQuery = (query: string): string => {
  return query.replace(/;+\s*$/, '')
}

export const skipQuotedString = (text: string, start: number, quoteChar: string): number => {
  let index = start
  if (text[index] !== quoteChar) return start

  index++ // skip opening quote
  while (index < text.length) {
    if (text[index] === quoteChar) {
      index++
      if (index >= text.length || text[index] !== quoteChar) {
        break // End of string/identifier
      }
      // Escaped quote, skip both
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
  index++ // skip opening paren

  while (index < text.length && depth > 0) {
    const char = text[index]
    if (char === "'") {
      index = skipQuotedString(text, index, "'")
    } else if (char === '"') {
      index = skipQuotedString(text, index, '"')
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
    } else if (char === '(') {
      index = skipParenthesizedSection(query, index)
    } else if (char === ';') {
      // Found a semicolon, check if there's anything after it
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
    while (index < length && /\s/.test(query[index])) {
      index++
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

  // Handle WITH clauses (CTEs)
  skipWhitespace()
  const firstWord = readWord().toLowerCase()
  if (firstWord !== 'with') {
    return firstWord || null
  }

  // Skip the CTE definitions
  while (index < length) {
    skipWhitespace()
    if (index >= length) break

    // Read the CTE name
    const cteName = readWord()
    if (!cteName) break

    skipWhitespace()
    if (index >= length || query[index] !== '(') {
      return null
    }

    index = skipParenthesizedSection(query, index)
    skipWhitespace()

    // Check for AS keyword
    const asWord = readWord().toLowerCase()
    if (asWord !== 'as') {
      return asWord || null
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
  const mainKeyword = readWord().toLowerCase()
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
