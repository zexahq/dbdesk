# SQL Editor Enhancement Specification

> **Status**: Implemented  
> **Last Updated**: 2026-04-22

This document describes the plan to upgrade DBDesk's Monaco SQL editor with robust multi-query execution, context-aware autocompletion, and improved UX — inspired by and building upon patterns from similar projects.

---

## 1. Goals

1. **Multi-Query Execution**: Support running multiple SQL statements separated by semicolons (`SELECT * FROM city; SELECT * FROM country;`).
2. **Context-Aware Autocompletion**: Schema → Table → Column completions with dot-triggered suggestions and `EntityContextType` awareness.
3. **Robust SQL Parsing**: Handle PostgreSQL dollar-quoted strings, multi-line comments (`/* */`), single-line comments (`--`), and quote-escaped strings.
4. **Per-Query Results UI**: Display results from multiple statements in a tabbed interface within a single query tab.
5. **Query Safety**: Dangerous keyword warnings (DELETE, DROP, ALTER, etc.) before execution.
6. **Architecture Cleanup**: Dynamic language ID mapping, total row count for SELECT queries, and dollar-quote support in pagination detection.

---

## 2. Architecture Decisions

### 2.1 Error Handling for Multi-Query Execution

- **Decision**: Stop on the first failed statement.
- **Rationale**: Safer default. Matches the behavior of most SQL clients (`psql`, DBeaver). Partial success can lead to confusing database states.
- **Future**: Could add a "Continue on Error" toggle in settings.

### 2.2 Column Data Source for Completions

- **Decision**: Extend the existing `schemasWithTables` fetch in `sql-workspace.tsx` to also fetch columns.
- **Rationale**: We already load schema metadata eagerly. Adding columns to the workspace store makes completions instant (no async fetch inside the Monaco completion service).
- **Storage**: Add `columnsMap: Map<string, ColumnDefinition[]>` to the SQL workspace store, keyed by `schema.table`.

### 2.3 Total Row Count for SELECTs

- **Decision**: Always run `COUNT(*)` for raw SELECT queries executed via the editor.
- **Rationale**: Users expect to see "1,234 total rows" in the pagination bar. The latency cost is acceptable for a desktop DB tool.

### 2.4 Single vs Batch Query Channels

- **Decision**: Keep `query:run` for single statements (backward compat) and add `query:runMany` for batches.
- **Rationale**: Single-query pagination wrapping (`SELECT * FROM (user_query) LIMIT ...`) is a distinct code path. Mixing batch and single logic in one handler adds complexity.

---

## 3. Phases

### Phase 1: Robust SQL Parser + Multi-Query Detection

**Status**: `completed`  
**Effort**: Medium  
**Impact**: Critical — foundation for everything else

#### 1.1 Shared Types

- [ ] Add `EditorQueryBlock` type to `packages/shared/src/types/sql.ts`:
  ```ts
  export interface EditorQueryBlock {
    startLineNumber: number
    endLineNumber: number
    queries: string[] // individual statements within the block
  }
  ```

#### 1.2 New Parser (`apps/desktop/src/renderer/src/features/editor/lib/sql-parser.ts`)

- [ ] Implement `getEditorQueries(sql: string): EditorQueryBlock[]`:
  - Iterate line-by-line.
  - Track multi-line comment state (`/* */`).
  - Strip single-line comments (`--`).
  - Track dollar-quoted strings (`$tag$...$tag$`) via `processDollarQuotes`.
  - Track standard single/double quotes with escape handling.
  - Detect statement boundaries on unquoted, uncommented semicolons.
  - Use `splitQueryBySemicolons` to split a single block line into multiple statements if needed.

#### 1.3 Update Existing `sql-parser.ts` (Main Process)

- [ ] Add `skipDollarQuotedString` utility.
- [ ] Update `hasAdditionalStatements` to skip dollar-quoted sections.
- [ ] Update `getInitialStatementKeyword` to skip dollar-quoted sections.
- [ ] Add tests or at least manual validation for edge cases:
  ```sql
  CREATE FUNCTION foo() RETURNS void AS $$ BEGIN DELETE FROM t; END; $$ LANGUAGE plpgsql;
  SELECT * FROM /* nested ; comment */ users;
  ```

---

### Phase 2: Multi-Query Execution (Backend + IPC)

**Status**: `completed`  
**Effort**: Medium  
**Impact**: Critical

#### 2.1 IPC Contract (`packages/shared/src/ipc/contract.ts`)

- [ ] Add new channel `query:runMany`:
  ```ts
  'query:runMany': {
    payload: { connectionId: string; queries: string[]; limit?: number; offset?: number }
    result: QueryBatchResult[]
  }
  ```

#### 2.2 Shared Types & Schemas

- [ ] Add to `packages/shared/src/types/adapter.ts`:
  ```ts
  export interface QueryBatchResult {
    query: string
    result?: QueryResult
    error?: string
    executionTime: number
  }
  ```
- [ ] Add Zod schema `queryBatchResultSchema` to `packages/shared/src/schemas/query.ts`.

#### 2.3 BaseAdapter Interface

- [ ] Update `BaseAdapter` in `packages/shared/src/types/adapter.ts`:
  ```ts
  runManyQueries(queries: string[], options?: RunQueryOptions): Promise<QueryBatchResult[]>
  ```

#### 2.4 PostgreSQL Adapter (`apps/desktop/src/main/adapters/postgres.ts`)

- [ ] Implement `runManyQueries`:
  - Sequential `for` loop over `queries`.
  - For each query:
    - Normalize (strip trailing `;`).
    - If `options` provided and `isSelectableQuery(query)`: wrap in pagination + run `COUNT(*)`.
    - Otherwise: run as-is.
    - Catch errors, format as `{ error: string }`, **stop loop**.
    - Measure `executionTime` per query.
  - Return array of `QueryBatchResult`.

#### 2.5 IPC Handler

- [ ] Add handler in `apps/desktop/src/main/ipc/query-handlers.ts` for `query:runMany`.

#### 2.6 Preload Bridge

- [ ] Expose `runManyQueries` through preload API (`apps/desktop/src/preload/dbdesk-api.ts`).

#### 2.7 Renderer API Client

- [ ] Add `dbdeskClient.runManyQueries(...)` in `apps/desktop/src/renderer/src/shared/api/client.ts`.

---

### Phase 3: Multi-Query Results UI

**Status**: `completed`  
**Effort**: Medium-High  
**Impact**: High — visible user value

#### 3.1 Tab Store Updates (`apps/desktop/src/renderer/src/features/sql-workspace/stores/tab-store.ts`)

- [ ] Extend `QueryTab`:
  ```ts
  export interface QueryTab extends BaseTab {
    // ... existing fields ...
    batchResults?: QueryBatchResult[]
    activeResultIndex?: number
  }
  ```
- [ ] `updateQueryTab` remains backward compatible.

#### 3.2 Query Execution Hook (`apps/desktop/src/renderer/src/features/sql-workspace/queries/query.ts`)

- [ ] Add `useRunManyQueries(connectionId: string)` mutation hook.
- [ ] Update `useRunQuery` to pass `includeTotalRowCount: true` for SELECTs (see Phase 6.2).

#### 3.3 QueryView Logic (`apps/desktop/src/renderer/src/features/sql-workspace/components/query-view/index.tsx`)

- [ ] Import `getEditorQueries` from the new parser.
- [ ] `handleRunQuery`:
  1. Parse `activeTab.editorContent` into blocks.
  2. If 1 block with 1 query → use existing single-query flow (`runQueryMutation`).
  3. If multiple queries → use `runManyQueriesMutation`.
  4. Store `batchResults` and set `activeResultIndex: 0`.
- [ ] `Ctrl+Enter` runs the **query at cursor position**:
  1. Get cursor line from Monaco editor ref.
  2. Find the `EditorQueryBlock` where `startLineNumber <= cursorLine <= endLineNumber`.
  3. Execute only that block's queries.

#### 3.4 QueryResults Component (`query-results.tsx`)

- [ ] If `batchResults` is present:
  - Render a horizontal tab bar: "Query 1", "Query 2", ..., "Query N".
  - Active tab determined by `activeResultIndex`.
  - Each tab shows a small icon: ✅ (success), ❌ (error), or 📄 (no data).
  - Body shows the selected query's result table, error message, or "No data returned".
- [ ] If only `queryResults` is present (backward compat), render as before.

#### 3.5 QueryBottombar Updates

- [ ] If `batchResults`:
  - Show "Query X of Y • Z rows • T ms".
  - Pagination controls apply to the active result only.
- [ ] If single result, keep existing behavior.

---

### Phase 4: Enhanced Autocompletion Service

**Status**: `completed`  
**Effort**: Medium  
**Impact**: High — big productivity boost

#### 4.1 SQL Workspace Store — Column Cache

- [ ] Extend `useSqlWorkspaceStore` (`apps/desktop/src/renderer/src/features/sql-workspace/stores/sql-workspace-store.ts`):
  ```ts
  interface SqlWorkspaceState {
    // ... existing ...
    tableColumns: Record<string, ColumnDefinition[]> // key: "schema.table"
    setTableColumns: (schema: string, table: string, columns: ColumnDefinition[]) => void
    getTableColumns: (schema: string, table: string) => ColumnDefinition[] | undefined
  }
  ```

#### 4.2 Eager Column Fetching (`sql-workspace.tsx`)

- [ ] When `schemasWithTables` loads, iterate tables and fetch columns via `useIntrospectTable` (or a batched IPC call).
- [ ] Populate `tableColumns` in the store.
- [ ] **Note**: For large databases with hundreds of tables, this could be heavy. Consider:
  - Fetching columns only for tables the user has expanded in the sidebar.
  - Or fetch lazily inside the completion service when the user types a dot.
  - **Decision**: Start with eager fetch for simplicity; optimize later if needed.

#### 4.3 Rewrite `completion-service.ts`

- [ ] Update signature to accept getters:
  ```ts
  export const createCompletionService = (
    getSchemasWithTables: () => SchemaWithTables[],
    getTableColumns: (schema: string, table: string) => ColumnDefinition[] | undefined
  ): CompletionService => { ... }
  ```
- [ ] **Dot-triggered columns**:
  - Detect `schema.table.` or `table.` before cursor via regex on `textBeforeCursor`.
  - Resolve schema (default `public` if unqualified).
  - Fetch columns via `getTableColumns`.
  - Return `CompletionItemKind.Field` with `detail: columnType + (nullable ? '' : ' NOT NULL')`.
- [ ] **Column context suggestions**:
  - When `entities` context includes `COLUMN` (and not `TABLE`), return all columns from all tables, deduplicated by label.
- [ ] **Table suggestions**:
  - Return both `table` and `schema.table` variants.
  - `CompletionItemKind.Class`.
- [ ] **Keyword sorting**:
  - Use `sortText` with numeric prefixes:
    - Columns: `sortText: '1_' + label`
    - Tables: `sortText: '2_' + label`
    - Keywords: `sortText: '3_' + label`
  - Prioritize common keywords (`SELECT`, `FROM`, `WHERE`, etc.) with higher sort text inside keyword group.
- [ ] **Enum values**:
  - If a column has `enumValues`, suggest them as completions.

#### 4.4 Update `workers.ts`

- [ ] Pass `useSqlWorkspaceStore.getState().schemasWithTables` and `getTableColumns` into `createCompletionService`.
- [ ] Ensure trigger characters `[' ', '.']` are still registered.

---

### Phase 5: Query Safety & UX Polish

**Status**: `completed`  
**Effort**: Low-Medium  
**Impact**: Medium

#### 5.1 Dangerous Query Warning

- [ ] Add utility `hasDangerousSqlKeywords(query: string): boolean` in `apps/desktop/src/renderer/src/features/editor/lib/sql-parser.ts` (or new file).
  - Keywords: `DELETE`, `UPDATE`, `INSERT`, `DROP`, `TRUNCATE`, `ALTER`, `RENAME`.
- [ ] Create `DangerousQueryDialog` component (similar to `UnsavedChangesDialog`).
- [ ] In `QueryView.handleRunQuery`:
  - If any query in the batch contains dangerous keywords, open the dialog.
  - Only proceed after user confirms.

#### 5.2 Query Zones (Follow-Up)

- **Status**: Deferred to post-MVP.
- Inline Monaco view zones showing Run/Copy/Save above each query block. Non-trivial; requires `editor.changeViewZones` and overlay widgets.

---

### Phase 6: Architecture Cleanup

**Status**: `completed`  
**Effort**: Low  
**Impact**: Low-Medium

#### 6.1 Dynamic Language ID (`sql-editor.tsx`)

- [ ] Add helper `getLanguageId(type: SQLDatabaseType): LanguageIdEnum`:
  ```ts
  const LANGUAGE_MAP: Record<SQLDatabaseType, LanguageIdEnum> = {
    postgres: LanguageIdEnum.PG,
    mysql: LanguageIdEnum.MYSQL
    // future: clickhouse, etc.
  }
  ```
- [ ] Use `LANGUAGE_MAP[profile.type] ?? LanguageIdEnum.PG` instead of hardcoded `PG`.
- [ ] Update `workers.ts` to register workers for all supported dialects (MySQL, etc.) if we have them.

#### 6.2 Include Total Row Count

- [ ] Update `useRunQuery` mutation to pass `includeTotalRowCount: true`.
- [ ] Verify `QueryBottombar` shows true total for raw SELECTs.

#### 6.3 Dollar-Quoted Strings in Main Process Parser

- [ ] Already covered in Phase 1.3, but ensure `isSelectableQuery` returns correct results for:
  ```sql
  CREATE FUNCTION ... $$ ... SELECT ...; ... $$;
  ```

#### 6.4 Query Cancellation (Future)

- [ ] Add `AbortSignal` support to `query:run` / `query:runMany`.
- [ ] Requires pg `query.cancel()` or client destruction. Mark as future enhancement.

---

## 4. File Inventory

| File                                                                                                 | Action                                        | Phase   |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------- |
| `packages/shared/src/types/sql.ts`                                                                   | Add `EditorQueryBlock`                        | 1       |
| `packages/shared/src/types/adapter.ts`                                                               | Add `QueryBatchResult`, update `BaseAdapter`  | 2       |
| `packages/shared/src/schemas/query.ts`                                                               | Add `queryBatchResultSchema`                  | 2       |
| `packages/shared/src/ipc/contract.ts`                                                                | Add `query:runMany`                           | 2       |
| `apps/desktop/src/renderer/src/features/editor/lib/sql-parser.ts`                                    | **New** — robust parser                       | 1       |
| `apps/desktop/src/main/lib/sql-parser.ts`                                                            | Update with dollar-quote support              | 1       |
| `apps/desktop/src/main/adapters/postgres.ts`                                                         | Add `runManyQueries`                          | 2       |
| `apps/desktop/src/main/ipc/query-handlers.ts`                                                        | Add `query:runMany` handler                   | 2       |
| `apps/desktop/src/preload/dbdesk-api.ts`                                                             | Expose `runManyQueries`                       | 2       |
| `apps/desktop/src/renderer/src/shared/api/client.ts`                                                 | Add `runManyQueries`                          | 2       |
| `apps/desktop/src/renderer/src/features/sql-workspace/queries/query.ts`                              | Add `useRunManyQueries`, update `useRunQuery` | 2, 3, 6 |
| `apps/desktop/src/renderer/src/features/sql-workspace/stores/tab-store.ts`                           | Extend `QueryTab`                             | 3       |
| `apps/desktop/src/renderer/src/features/sql-workspace/stores/sql-workspace-store.ts`                 | Add `tableColumns`                            | 4       |
| `apps/desktop/src/renderer/src/features/sql-workspace/components/sql-workspace.tsx`                  | Eager column fetching                         | 4       |
| `apps/desktop/src/renderer/src/features/sql-workspace/components/query-view/index.tsx`               | Multi-query execution logic                   | 3       |
| `apps/desktop/src/renderer/src/features/sql-workspace/components/query-view/query-results.tsx`       | Batch result tabs                             | 3       |
| `apps/desktop/src/renderer/src/features/sql-workspace/components/query-view/query-bottombar.tsx`     | Batch-aware bottom bar                        | 3       |
| `apps/desktop/src/renderer/src/features/editor/monaco/completion-service.ts`                         | Rewrite with context awareness                | 4       |
| `apps/desktop/src/renderer/src/features/editor/monaco/workers.ts`                                    | Pass store getters, dynamic languages         | 4, 6    |
| `apps/desktop/src/renderer/src/features/editor/components/sql-editor.tsx`                            | Dynamic `languageId`                          | 6       |
| `apps/desktop/src/renderer/src/features/editor/lib/sql-parser.ts` (or new safety util)               | `hasDangerousSqlKeywords`                     | 5       |
| `apps/desktop/src/renderer/src/features/sql-workspace/components/dialogs/dangerous-query-dialog.tsx` | **New** — confirmation dialog                 | 5       |

---

## 5. Notes & Open Questions

- **Performance of eager column fetching**: If a database has 500+ tables, fetching all columns upfront may be slow. Monitor this during implementation. If it's a problem, switch to lazy fetching when the user expands a schema in the sidebar or types a dot.
- **MySQL/ClickHouse support**: Conar supports MySQL and ClickHouse. Our adapter is PostgreSQL-only right now. The dynamic language ID and completion service should be designed to handle future adapters without rewrites.
- **Query Zones**: Deferred. If we implement them later, they will reuse `getEditorQueries` and Monaco's `changeViewZones` API.
- **Cancellation**: Not in scope for this pass. The pg driver doesn't have a trivial cancel mechanism without a separate connection running `pg_cancel_backend`.
- **Testing strategy**: After each phase, manually test with:
  - Single SELECT with pagination
  - Multiple SELECTs
  - Mixed DDL + DML batch
  - Dollar-quoted function with embedded semicolons
  - Comments with semicolons inside

---

## 6. Changelog

| Date       | Change                                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-22 | Initial specification created. Phases 1–6 defined.                                                                                  |
| 2026-04-22 | All phases implemented. Multi-query execution, context-aware autocompletion, robust SQL parser, and query safety features are live. |
