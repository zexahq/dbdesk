import type { EditorQueryBlock } from '@dbdesk/shared/types'

type StatementSpan = {
  query: string
  startLineNumber: number
  endLineNumber: number
}

const DANGEROUS_SQL_KEYWORDS = ['DELETE', 'UPDATE', 'INSERT', 'DROP', 'TRUNCATE', 'ALTER', 'RENAME']
const DOLLAR_QUOTE_TAG_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

const readDollarQuoteTag = (text: string, start: number): string | null => {
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

const extractStatementSpans = (sql: string): StatementSpan[] => {
  const statements: StatementSpan[] = []
  let currentQuery = ''
  let statementStartLine: number | null = null
  let statementEndLine = 1
  let lineNumber = 1
  let lineComment = false
  let blockCommentDepth = 0
  let singleQuote = false
  let doubleQuote = false
  let dollarQuoteTag: string | null = null

  const appendText = (text: string, marksStatement = true) => {
    if (marksStatement && statementStartLine === null && text.trim()) {
      statementStartLine = lineNumber
    }

    currentQuery += text

    if (marksStatement && text.trim()) {
      statementEndLine = lineNumber
    }
  }

  const appendSpace = () => {
    if (currentQuery.length > 0 && !/\s$/.test(currentQuery)) {
      currentQuery += ' '
    }
  }

  const appendNewline = () => {
    if (currentQuery.length > 0 && !currentQuery.endsWith('\n')) {
      currentQuery += '\n'
    }
  }

  const flushStatement = () => {
    const query = currentQuery.trim()
    if (query && statementStartLine !== null) {
      statements.push({
        query,
        startLineNumber: statementStartLine,
        endLineNumber: statementEndLine
      })
    }

    currentQuery = ''
    statementStartLine = null
    statementEndLine = lineNumber
  }

  for (let index = 0; index < sql.length; index++) {
    const char = sql[index]
    const nextChar = sql[index + 1]

    if (lineComment) {
      if (char === '\n') {
        lineComment = false
        appendNewline()
        lineNumber++
      }
      continue
    }

    if (blockCommentDepth > 0) {
      if (char === '/' && nextChar === '*') {
        blockCommentDepth++
        index++
        continue
      }

      if (char === '*' && nextChar === '/') {
        blockCommentDepth--
        index++
        continue
      }

      if (char === '\n') {
        appendNewline()
        lineNumber++
      }
      continue
    }

    if (dollarQuoteTag) {
      if (sql.startsWith(dollarQuoteTag, index)) {
        appendText(dollarQuoteTag)
        index += dollarQuoteTag.length - 1
        dollarQuoteTag = null
        continue
      }

      appendText(char)
      if (char === '\n') {
        lineNumber++
      }
      continue
    }

    if (singleQuote) {
      appendText(char)
      if (char === "'") {
        if (nextChar === "'") {
          appendText(nextChar)
          index++
        } else {
          singleQuote = false
        }
      } else if (char === '\n') {
        lineNumber++
      }
      continue
    }

    if (doubleQuote) {
      appendText(char)
      if (char === '"') {
        if (nextChar === '"') {
          appendText(nextChar)
          index++
        } else {
          doubleQuote = false
        }
      } else if (char === '\n') {
        lineNumber++
      }
      continue
    }

    if (char === '-' && nextChar === '-') {
      appendSpace()
      lineComment = true
      index++
      continue
    }

    if (char === '/' && nextChar === '*') {
      appendSpace()
      blockCommentDepth = 1
      index++
      continue
    }

    if (char === "'") {
      singleQuote = true
      appendText(char)
      continue
    }

    if (char === '"') {
      doubleQuote = true
      appendText(char)
      continue
    }

    if (char === '$') {
      const tag = readDollarQuoteTag(sql, index)
      if (tag) {
        dollarQuoteTag = tag
        appendText(tag)
        index += tag.length - 1
        continue
      }
    }

    if (char === ';') {
      flushStatement()
      continue
    }

    if (char === '\n') {
      appendNewline()
      lineNumber++
      continue
    }

    if (currentQuery.length === 0 && /\s/.test(char)) {
      continue
    }

    appendText(char)
  }

  flushStatement()

  return statements
}

const expandBlockStartLine = (lines: string[], startLineNumber: number): number => {
  let index = startLineNumber - 1

  while (index > 0 && lines[index - 1]?.trim() !== '') {
    index--
  }

  return index + 1
}

const expandBlockEndLine = (lines: string[], endLineNumber: number): number => {
  let index = endLineNumber - 1

  while (index < lines.length - 1 && lines[index + 1]?.trim() !== '') {
    index++
  }

  return index + 1
}

const hasBlankSeparator = (lines: string[], fromLineNumber: number, toLineNumber: number): boolean => {
  for (let lineIndex = fromLineNumber; lineIndex < toLineNumber - 1; lineIndex++) {
    if (lines[lineIndex]?.trim() === '') {
      return true
    }
  }

  return false
}

const stripQuotedAndCommentedSql = (sql: string): string => {
  let sanitized = ''
  let lineComment = false
  let blockCommentDepth = 0
  let singleQuote = false
  let doubleQuote = false
  let dollarQuoteTag: string | null = null

  for (let index = 0; index < sql.length; index++) {
    const char = sql[index]
    const nextChar = sql[index + 1]

    if (lineComment) {
      if (char === '\n') {
        lineComment = false
        sanitized += '\n'
      }
      continue
    }

    if (blockCommentDepth > 0) {
      if (char === '/' && nextChar === '*') {
        blockCommentDepth++
        index++
        continue
      }

      if (char === '*' && nextChar === '/') {
        blockCommentDepth--
        index++
        continue
      }

      if (char === '\n') {
        sanitized += '\n'
      }
      continue
    }

    if (dollarQuoteTag) {
      if (sql.startsWith(dollarQuoteTag, index)) {
        index += dollarQuoteTag.length - 1
        dollarQuoteTag = null
      }
      continue
    }

    if (singleQuote) {
      if (char === "'") {
        if (nextChar === "'") {
          index++
        } else {
          singleQuote = false
        }
      } else if (char === '\n') {
        sanitized += '\n'
      }
      continue
    }

    if (doubleQuote) {
      if (char === '"') {
        if (nextChar === '"') {
          index++
        } else {
          doubleQuote = false
        }
      } else if (char === '\n') {
        sanitized += '\n'
      }
      continue
    }

    if (char === '-' && nextChar === '-') {
      lineComment = true
      index++
      continue
    }

    if (char === '/' && nextChar === '*') {
      blockCommentDepth = 1
      index++
      continue
    }

    if (char === "'") {
      singleQuote = true
      continue
    }

    if (char === '"') {
      doubleQuote = true
      continue
    }

    if (char === '$') {
      const tag = readDollarQuoteTag(sql, index)
      if (tag) {
        dollarQuoteTag = tag
        index += tag.length - 1
        continue
      }
    }

    sanitized += char
  }

  return sanitized
}

export const splitQueryBySemicolons = (sql: string): string[] => {
  return extractStatementSpans(sql).map((statement) => statement.query)
}

export const getEditorQueries = (sql: string): EditorQueryBlock[] => {
  const statements = extractStatementSpans(sql)
  if (statements.length === 0) {
    return []
  }

  const lines = sql.split(/\r?\n/)
  const blocks: EditorQueryBlock[] = []
  let currentQueries = [statements[0].query]
  let currentStartLine = statements[0].startLineNumber
  let currentEndLine = statements[0].endLineNumber

  for (let index = 1; index < statements.length; index++) {
    const statement = statements[index]
    if (hasBlankSeparator(lines, currentEndLine, statement.startLineNumber)) {
      blocks.push({
        startLineNumber: expandBlockStartLine(lines, currentStartLine),
        endLineNumber: expandBlockEndLine(lines, currentEndLine),
        queries: currentQueries
      })

      currentQueries = [statement.query]
      currentStartLine = statement.startLineNumber
      currentEndLine = statement.endLineNumber
      continue
    }

    currentQueries.push(statement.query)
    currentEndLine = statement.endLineNumber
  }

  blocks.push({
    startLineNumber: expandBlockStartLine(lines, currentStartLine),
    endLineNumber: expandBlockEndLine(lines, currentEndLine),
    queries: currentQueries
  })

  return blocks
}

export const hasDangerousSqlKeywords = (query: string): boolean => {
  const sanitizedQuery = stripQuotedAndCommentedSql(query)
  const dangerousKeywordPattern = new RegExp(`\\b(?:${DANGEROUS_SQL_KEYWORDS.join('|')})\\b`, 'i')
  return dangerousKeywordPattern.test(sanitizedQuery)
}
