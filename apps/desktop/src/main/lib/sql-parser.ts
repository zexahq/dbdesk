export {
  isSelectableQuery,
  isReadOnlyQuery,
  normalizeQuery,
  hasAdditionalStatements,
  skipDollarQuotedString,
  skipLineComment,
  skipBlockComment,
  skipQuotedString,
  skipParenthesizedSection,
  getInitialStatementKeyword
} from '@dbdesk/shared/adapters'
