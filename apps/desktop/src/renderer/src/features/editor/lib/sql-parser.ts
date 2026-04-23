/**
 * SQL parsing utilities for the renderer process.
 *
 * Handles:
 *   - Single-line comments (--)
 *   - Multi-line C-style comments
 *   - Dollar-quoted strings ($tag$...$tag$)
 *   - Standard quoted strings (' ', " ") with escapes
 *
 * Inspired by patterns used in similar database tools to reliably split
 * semicolon-separated statements while respecting PostgreSQL-specific syntax.
 */

import type { EditorQueryBlock } from '@dbdesk/shared/types'

/** Regex that detects the start of a dollar-quoted string: $tag$ */
const DOLLAR_QUOTE_START_REGEX = /\$(\w*)\$/g

interface DollarQuoteMatch {
  tag: string
  index: number
}

/**
 * Find all dollar-quote starts in a line and return them sorted by position.
 */
function findDollarQuoteStarts(line: string): DollarQuoteMatch[] {
  const matches: DollarQuoteMatch[] = []
  let m: RegExpExecArray | null
  DOLLAR_QUOTE_START_REGEX.lastIndex = 0
  while ((m = DOLLAR_QUOTE_START_REGEX.exec(line)) !== null) {
    matches.push({ tag: m[1], index: m.index })
  }
  return matches
}

/**
 * Split a single logical query string into individual statements by semicolons,
 * while respecting dollar-quoted strings.
 */
export function splitQueryBySemicolons(query: string): string[] {
  const statements: string[] = []
  let current = ''
  let i = 0
  const length = query.length

  while (i < length) {
    const char = query[i]

    if (char === "'") {
      // Single-quoted string
      const end = skipQuotedString(query, i, "'")
      current += query.slice(i, end)
      i = end
      continue
    }

    if (char === '"') {
      // Double-quoted identifier
      const end = skipQuotedString(query, i, '"')
      current += query.slice(i, end)
      i = end
      continue
    }

    if (char === '$') {
      // Potential dollar-quoted string
      const ahead = query.slice(i)
      const m = /^\$(\w*)\$/.exec(ahead)
      if (m) {
        const tag = m[1]
        const closing = `$${tag}$`
        const startLen = m[0].length
        const closeIdx = ahead.indexOf(closing, startLen)
        if (closeIdx !== -1) {
          current += query.slice(i, i + closeIdx + closing.length)
          i += closeIdx + closing.length
          continue
        }
      }
    }

    if (char === ';') {
      statements.push(current.trim())
      current = ''
      i++
      continue
    }

    current += char
    i++
  }

  const last = current.trim()
  if (last.length > 0) {
    statements.push(last)
  }

  return statements.filter((s) => s.length > 0)
}

/**
 * Skip a quoted string starting at `start` with quote character `quoteChar`.
 * Handles escaped quotes (doubled quotes in SQL).
 * Returns the index just past the closing quote.
 */
function skipQuotedString(text: string, start: number, quoteChar: string): number {
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

/**
 * Parse raw SQL editor content into query blocks.
 *
 * Each block represents one or more semicolon-separated statements that were
 * typed contiguously (i.e. not separated by blank lines or comments).
 * Dollar-quoted strings, multi-line comments, and standard quotes are all
 * respected so semicolons inside them do NOT split statements.
 */
export function getEditorQueries(sql: string): EditorQueryBlock[] {
  const lines = sql.split('\n')
  const blocks: EditorQueryBlock[] = []

  let currentBlockLines: string[] = []
  let currentBlockStartLine = 1 // 1-based

  let insideMultiLineComment = false
  let insideDollarQuoteTag: string | null = null

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex]
    const lineNumber = lineIndex + 1 // 1-based

    // If we are inside a multi-line comment, look for its end
    if (insideMultiLineComment) {
      const endIdx = rawLine.indexOf('*/')
      if (endIdx !== -1) {
        insideMultiLineComment = false
        // Append the remainder of the line (after comment end) for further processing
        const afterComment = rawLine.slice(endIdx + 2)
        processLine(afterComment, lineNumber)
      }
      // If comment didn't end, skip the whole line
      continue
    }

    processLine(rawLine, lineNumber)
  }

  // Flush any remaining lines into a block
  flushBlock(lines.length)

  return blocks

  function processLine(rawLine: string, lineNumber: number) {
    let line = rawLine

    // Strip single-line comments, but respect dollar quotes
    const commentIdx = findUnquotedCommentIndex(line)
    if (commentIdx !== -1) {
      line = line.slice(0, commentIdx)
    }

    // Check for multi-line comment start
    const mlStart = findUnquotedMultiLineCommentStart(line)
    if (mlStart !== -1) {
      const beforeComment = line.slice(0, mlStart)
      const afterCommentStart = line.slice(mlStart)
      const endIdx = afterCommentStart.indexOf('*/')
      if (endIdx !== -1) {
        // Comment ends on same line
        line = beforeComment + afterCommentStart.slice(endIdx + 2)
      } else {
        // Comment spans multiple lines
        insideMultiLineComment = true
        line = beforeComment
      }
    }

    // Handle dollar-quoted strings that may span lines
    if (insideDollarQuoteTag !== null) {
      const closing = `$${insideDollarQuoteTag}$`
      const closeIdx = line.indexOf(closing)
      if (closeIdx !== -1) {
        // Dollar quote ends on this line
        currentBlockLines.push(line.slice(0, closeIdx + closing.length))
        insideDollarQuoteTag = null
        const remainder = line.slice(closeIdx + closing.length)
        if (remainder.trim().length > 0) {
          // Process remainder as a new line segment
          processSegment(remainder, lineNumber)
        }
        return
      } else {
        // Still inside dollar quote; append whole line
        currentBlockLines.push(line)
        return
      }
    }

    processSegment(line, lineNumber)
  }

  function processSegment(segment: string, lineNumber: number) {
    let remaining = segment

    while (remaining.length > 0) {
      // Search for the next event: semicolon, dollar-quote start, or multi-line comment start
      let nextEventIdx = remaining.length
      let eventType: 'semi' | 'dollar' | 'mlcomment' | null = null
      const eventData: { tag?: string } = {}

      // Check for semicolon
      const semiIdx = findUnquotedSemicolon(remaining)
      if (semiIdx !== -1 && semiIdx < nextEventIdx) {
        nextEventIdx = semiIdx
        eventType = 'semi'
      }

      // Check for dollar-quote start
      const dollarStarts = findDollarQuoteStarts(remaining)
      for (const ds of dollarStarts) {
        if (ds.index < nextEventIdx) {
          nextEventIdx = ds.index
          eventType = 'dollar'
          eventData.tag = ds.tag
          break
        }
      }

      // Check for multi-line comment start
      const mlIdx = findUnquotedMultiLineCommentStart(remaining)
      if (mlIdx !== -1 && mlIdx < nextEventIdx) {
        nextEventIdx = mlIdx
        eventType = 'mlcomment'
      }

      if (eventType === null) {
        // No more events on this segment
        if (remaining.trim().length > 0) {
          if (currentBlockLines.length === 0) {
            currentBlockStartLine = lineNumber
          }
          currentBlockLines.push(remaining)
        }
        return
      }

      // Append text before the event
      const beforeEvent = remaining.slice(0, nextEventIdx)
      if (beforeEvent.length > 0 || currentBlockLines.length > 0) {
        if (currentBlockLines.length === 0) {
          currentBlockStartLine = lineNumber
        }
        currentBlockLines.push(beforeEvent)
      }

      if (eventType === 'semi') {
        // Statement terminator
        flushBlock(lineNumber)
        remaining = remaining.slice(nextEventIdx + 1)
      } else if (eventType === 'dollar') {
        const tag = eventData.tag!
        const closing = `$${tag}$`
        const startIdx = nextEventIdx
        const startLen = closing.length
        const closeIdx = remaining.indexOf(closing, startIdx + startLen)
        if (closeIdx !== -1) {
          // Dollar quote starts and ends within this segment
          const dqContent = remaining.slice(startIdx, closeIdx + closing.length)
          if (currentBlockLines.length === 0) {
            currentBlockStartLine = lineNumber
          }
          currentBlockLines.push(dqContent)
          remaining = remaining.slice(closeIdx + closing.length)
        } else {
          // Dollar quote spans multiple lines
          insideDollarQuoteTag = tag
          if (currentBlockLines.length === 0) {
            currentBlockStartLine = lineNumber
          }
          currentBlockLines.push(remaining.slice(startIdx))
          return
        }
      } else if (eventType === 'mlcomment') {
        const afterMl = remaining.slice(nextEventIdx)
        const endIdx = afterMl.indexOf('*/')
        if (endIdx !== -1) {
          // Same-line comment; skip it
          remaining = afterMl.slice(endIdx + 2)
        } else {
          // Multi-line comment starts here
          insideMultiLineComment = true
          remaining = remaining.slice(0, nextEventIdx)
          if (remaining.trim().length > 0) {
            if (currentBlockLines.length === 0) {
              currentBlockStartLine = lineNumber
            }
            currentBlockLines.push(remaining)
          }
          return
        }
      }
    }
  }

  function flushBlock(endLineNumber: number) {
    if (currentBlockLines.length === 0) return
    const blockText = currentBlockLines.join('\n').trim()
    if (blockText.length === 0) {
      currentBlockLines = []
      return
    }
    const queries = splitQueryBySemicolons(blockText)
    if (queries.length > 0) {
      blocks.push({
        startLineNumber: currentBlockStartLine,
        endLineNumber: endLineNumber,
        queries
      })
    }
    currentBlockLines = []
  }

  /** Find index of `--` that is not inside a quoted string in `text`. */
  function findUnquotedCommentIndex(text: string): number {
    for (let i = 0; i < text.length - 1; i++) {
      const char = text[i]
      if (char === "'") {
        i = skipQuotedString(text, i, "'") - 1
        continue
      }
      if (char === '"') {
        i = skipQuotedString(text, i, '"') - 1
        continue
      }
      if (char === '$') {
        const m = /^\$(\w*)\$/.exec(text.slice(i))
        if (m) {
          const tag = m[1]
          const closing = `$${tag}$`
          const closeIdx = text.indexOf(closing, i + closing.length)
          if (closeIdx !== -1) {
            i = closeIdx + closing.length - 1
            continue
          }
        }
      }
      if (char === '-' && text[i + 1] === '-') {
        return i
      }
    }
    return -1
  }

  /** Find index of `/*` that is not inside a quoted string in `text`. */
  function findUnquotedMultiLineCommentStart(text: string): number {
    for (let i = 0; i < text.length - 1; i++) {
      const char = text[i]
      if (char === "'") {
        i = skipQuotedString(text, i, "'") - 1
        continue
      }
      if (char === '"') {
        i = skipQuotedString(text, i, '"') - 1
        continue
      }
      if (char === '$') {
        const m = /^\$(\w*)\$/.exec(text.slice(i))
        if (m) {
          const tag = m[1]
          const closing = `$${tag}$`
          const closeIdx = text.indexOf(closing, i + closing.length)
          if (closeIdx !== -1) {
            i = closeIdx + closing.length - 1
            continue
          }
        }
      }
      if (char === '/' && text[i + 1] === '*') {
        return i
      }
    }
    return -1
  }

  /** Find index of `;` that is not inside a quoted string in `text`. */
  function findUnquotedSemicolon(text: string): number {
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (char === "'") {
        i = skipQuotedString(text, i, "'") - 1
        continue
      }
      if (char === '"') {
        i = skipQuotedString(text, i, '"') - 1
        continue
      }
      if (char === '$') {
        const m = /^\$(\w*)\$/.exec(text.slice(i))
        if (m) {
          const tag = m[1]
          const closing = `$${tag}$`
          const closeIdx = text.indexOf(closing, i + closing.length)
          if (closeIdx !== -1) {
            i = closeIdx + closing.length - 1
            continue
          }
        }
      }
      if (char === ';') {
        return i
      }
    }
    return -1
  }
}

/**
 * Given a list of parsed query blocks and a 1-based line number, return the
 * block that contains the given line, or undefined if none.
 */
export function findQueryBlockAtLine(
  blocks: EditorQueryBlock[],
  lineNumber: number
): EditorQueryBlock | undefined {
  return blocks.find(
    (b) => b.startLineNumber <= lineNumber && b.endLineNumber >= lineNumber
  )
}

/**
 * Detect whether a query string contains dangerous / destructive SQL keywords.
 * Used to show a confirmation dialog before execution.
 */
export function hasDangerousSqlKeywords(query: string): boolean {
  const dangerous = ['DELETE', 'UPDATE', 'INSERT', 'DROP', 'TRUNCATE', 'ALTER', 'RENAME']
  const upper = query.toUpperCase()
  return dangerous.some((kw) => new RegExp(`\\b${kw}\\b`).test(upper))
}
