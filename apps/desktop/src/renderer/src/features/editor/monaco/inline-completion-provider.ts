import * as monaco from 'monaco-editor'
import { LanguageIdEnum } from 'monaco-sql-languages'

// Common SQL keywords/phrases used to power ghost-text inline suggestions.
// Ordered so longer/more specific phrases are matched first (e.g. "SELECT DISTINCT"
// wins over "SELECT" when the user has typed enough characters to disambiguate).
const SQL_KEYWORDS: string[] = [
  'SELECT DISTINCT',
  'SELECT',
  'FROM',
  'WHERE',
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'FULL OUTER JOIN',
  'CROSS JOIN',
  'JOIN',
  'ON',
  'GROUP BY',
  'ORDER BY',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'UNION ALL',
  'UNION',
  'INTERSECT',
  'EXCEPT',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'RETURNING',
  'CREATE TABLE IF NOT EXISTS',
  'CREATE TABLE',
  'CREATE INDEX',
  'CREATE OR REPLACE VIEW',
  'CREATE VIEW',
  'ALTER TABLE',
  'DROP TABLE IF EXISTS',
  'DROP TABLE',
  'TRUNCATE TABLE',
  'WITH',
  'AS',
  'AND',
  'OR',
  'NOT',
  'NULL',
  'IS NULL',
  'IS NOT NULL',
  'TRUE',
  'FALSE',
  'DISTINCT',
  'IN',
  'LIKE',
  'ILIKE',
  'BETWEEN',
  'EXISTS',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'ASC',
  'DESC',
  'COUNT(*)',
  'COALESCE',
  'NULLIF',
  'PRIMARY KEY',
  'FOREIGN KEY',
  'REFERENCES',
  'DEFAULT',
  'CHECK',
  'UNIQUE',
  'CASCADE',
  'BEGIN',
  'COMMIT',
  'ROLLBACK'
]

const findKeywordSuggestion = (typed: string): string | undefined => {
  const upper = typed.toUpperCase()
  return SQL_KEYWORDS.find((keyword) => keyword.startsWith(upper) && keyword.length > upper.length)
}

const matchCase = (typedWord: string, remainder: string): string => {
  // If the user is typing lowercase, suggest the remainder in lowercase too.
  if (typedWord === typedWord.toLowerCase()) {
    return remainder.toLowerCase()
  }
  return remainder
}

const SQL_LANGUAGE_IDS: string[] = [LanguageIdEnum.PG, LanguageIdEnum.MYSQL]

let registered = false

export const registerSqlInlineCompletionProvider = (): void => {
  if (registered) {
    return
  }
  registered = true

  monaco.languages.registerInlineCompletionsProvider(SQL_LANGUAGE_IDS, {
    provideInlineCompletions(model, position) {
      const lineContent = model.getLineContent(position.lineNumber)
      const textBeforeCursor = lineContent.slice(0, position.column - 1)
      const textAfterCursor = lineContent.slice(position.column - 1)

      // Don't suggest if the cursor is in the middle of a word.
      if (/^[A-Za-z0-9_]/.test(textAfterCursor)) {
        return { items: [] }
      }

      // Match the partial word the user is typing at the end of the prefix.
      const match = textBeforeCursor.match(/([A-Za-z_][A-Za-z0-9_]*)$/)
      if (!match) {
        return { items: [] }
      }

      const typedWord = match[1]
      if (typedWord.length < 2) {
        return { items: [] }
      }

      const suggestion = findKeywordSuggestion(typedWord)
      if (!suggestion) {
        return { items: [] }
      }

      const remainder = suggestion.slice(typedWord.length)
      const insertText = matchCase(typedWord, remainder)

      return {
        items: [
          {
            insertText,
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column
            )
          }
        ]
      }
    },
    handleItemDidShow() {
      // No-op.
    },
    handlePartialAccept() {
      // No-op.
    },
    handleRejection() {
      // No-op.
    },
    disposeInlineCompletions() {
      // No resources to dispose.
    }
  })
}
