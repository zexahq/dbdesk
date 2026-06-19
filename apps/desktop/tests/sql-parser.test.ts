import { describe, expect, it } from 'vitest'
import {
  splitQueryBySemicolons,
  getEditorQueries
} from '../src/renderer/src/features/editor/lib/sql-parser'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()

const expectSplits = (sql: string, expected: string[]) => {
  const result = splitQueryBySemicolons(sql)
  expect(result.map(normalize)).toEqual(expected.map(normalize))
}

const expectCount = (sql: string, n: number) => {
  expect(splitQueryBySemicolons(sql)).toHaveLength(n)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('basic splitting', () => {
  it('single SELECT', () => expectSplits('SELECT 1', ['SELECT 1']))
  it('single SELECT with trailing semicolon', () => expectSplits('SELECT 1;', ['SELECT 1']))
  it('two SELECTs', () => expectSplits('SELECT 1; SELECT 2', ['SELECT 1', 'SELECT 2']))
  it('three statements', () =>
    expectSplits('SELECT 1; SELECT 2; SELECT 3', ['SELECT 1', 'SELECT 2', 'SELECT 3']))
  it('empty string → 0 statements', () => expectCount('', 0))
  it('only whitespace → 0 statements', () => expectCount('   \n\n  ', 0))
  it('only semicolons → 0 statements', () => expectCount(';;;', 0))
})

describe('string literals', () => {
  it('semicolon inside single quotes is not a split', () =>
    expectSplits("SELECT 'a;b' FROM t", ["SELECT 'a;b' FROM t"]))

  it('semicolon inside double quotes is not a split', () =>
    expectSplits('SELECT "col;name" FROM t', ['SELECT "col;name" FROM t']))

  it("escaped single quote (doubled apostrophe)", () =>
    expectSplits("SELECT 'it''s fine; still one' FROM t", ["SELECT 'it''s fine; still one' FROM t"]))

  it('escaped double quote', () =>
    expectSplits('SELECT "col""name; x" FROM t', ['SELECT "col""name; x" FROM t']))

  it('string with embedded newline', () => expectCount("SELECT 'line1\nline2' FROM t", 1))

  it('multiple strings each containing semicolons', () =>
    expectSplits("SELECT 'a;b', 'c;d'; SELECT 'e;f'", ["SELECT 'a;b', 'c;d'", "SELECT 'e;f'"]))
})

describe('line comments (--)', () => {
  it('semicolon inside line comment is not a split', () =>
    expectSplits('SELECT 1 -- this is ; a comment\n', ['SELECT 1']))

  it('line comment between statements', () =>
    expectSplits('SELECT 1; -- comment\nSELECT 2', ['SELECT 1', 'SELECT 2']))

  it('entire statement replaced by comment', () =>
    expectSplits('-- SELECT 1;\nSELECT 2', ['SELECT 2']))

  it('multiple line comments before real statement', () =>
    expectSplits('-- drop everything;\n-- just kidding\nSELECT 1', ['SELECT 1']))
})

describe('block comments (/* */)', () => {
  it('semicolon inside block comment is not a split', () =>
    expectSplits('SELECT /* ; */ 1', ['SELECT 1']))

  it('nested block comment', () =>
    expectSplits('SELECT /* outer /* inner */ still outer */ 1', ['SELECT 1']))

  it('block comment between statements', () =>
    expectSplits('SELECT 1 /* comment */; SELECT 2', ['SELECT 1', 'SELECT 2']))

  it('multi-line block comment', () =>
    expectSplits('SELECT\n/*\n  big comment; with semicolons\n*/\n1', ['SELECT 1']))

  it('mixed line and block comments', () =>
    expectSplits('/* block */ SELECT -- inline\n1', ['SELECT 1']))
})

describe('dollar-quoted strings (PL/pgSQL)', () => {
  it('plain $$ quoting', () =>
    expectSplits(
      'CREATE FUNCTION f() RETURNS void AS $$ BEGIN NULL; END; $$ LANGUAGE plpgsql',
      ['CREATE FUNCTION f() RETURNS void AS $$ BEGIN NULL; END; $$ LANGUAGE plpgsql']
    ))

  it('tagged dollar quoting $body$', () =>
    expectSplits(
      'CREATE FUNCTION g() RETURNS void AS $body$ BEGIN NULL; END; $body$ LANGUAGE plpgsql',
      ['CREATE FUNCTION g() RETURNS void AS $body$ BEGIN NULL; END; $body$ LANGUAGE plpgsql']
    ))

  it('dollar-quoted function followed by another statement', () =>
    expectSplits(
      'CREATE FUNCTION h() RETURNS void AS $$ BEGIN NULL; END; $$ LANGUAGE plpgsql; SELECT 1',
      [
        'CREATE FUNCTION h() RETURNS void AS $$ BEGIN NULL; END; $$ LANGUAGE plpgsql',
        'SELECT 1'
      ]
    ))

  it('DO block with multiple internal semicolons', () =>
    expectCount(
      "DO $$ DECLARE x INT; BEGIN x := 1; RAISE NOTICE '%', x; END; $$",
      1
    ))

  it('two separate dollar-quoted functions', () =>
    expectCount(
      'CREATE FUNCTION f1() RETURNS void AS $$ BEGIN NULL; END; $$ LANGUAGE plpgsql;\n' +
      'CREATE FUNCTION f2() RETURNS void AS $$ BEGIN NULL; END; $$ LANGUAGE plpgsql',
      2
    ))
})

describe('DDL statements', () => {
  it('CREATE TABLE', () =>
    expectSplits(
      'CREATE TABLE t (id SERIAL PRIMARY KEY, name TEXT)',
      ['CREATE TABLE t (id SERIAL PRIMARY KEY, name TEXT)']
    ))

  it('CREATE TABLE with semicolon in DEFAULT string literal', () =>
    expectCount("CREATE TABLE t (id INT, label TEXT DEFAULT 'a;b')", 1))

  it('ALTER TABLE then SELECT', () =>
    expectSplits(
      'ALTER TABLE t ADD COLUMN x INT; SELECT * FROM t',
      ['ALTER TABLE t ADD COLUMN x INT', 'SELECT * FROM t']
    ))

  it('DROP TABLE IF EXISTS', () =>
    expectSplits(
      'DROP TABLE IF EXISTS foo; DROP TABLE IF EXISTS bar',
      ['DROP TABLE IF EXISTS foo', 'DROP TABLE IF EXISTS bar']
    ))

  it('CREATE INDEX', () =>
    expectSplits(
      'CREATE INDEX idx_name ON t(name); SELECT 1',
      ['CREATE INDEX idx_name ON t(name)', 'SELECT 1']
    ))
})

describe('DML sequences', () => {
  it('INSERT then SELECT', () =>
    expectSplits(
      "INSERT INTO t (name) VALUES ('Alice'); SELECT * FROM t",
      ["INSERT INTO t (name) VALUES ('Alice')", 'SELECT * FROM t']
    ))

  it('INSERT with semicolon inside value string', () =>
    expectCount("INSERT INTO t VALUES ('semi;colon')", 1))

  it('UPDATE then SELECT', () =>
    expectSplits(
      "UPDATE t SET name = 'Bob' WHERE id = 1; SELECT * FROM t WHERE id = 1",
      ["UPDATE t SET name = 'Bob' WHERE id = 1", 'SELECT * FROM t WHERE id = 1']
    ))

  it('DELETE then SELECT count', () =>
    expectSplits(
      'DELETE FROM t WHERE id > 100; SELECT COUNT(*) FROM t',
      ['DELETE FROM t WHERE id > 100', 'SELECT COUNT(*) FROM t']
    ))

  it('full CRUD sequence', () => {
    const sql = `
      INSERT INTO users (name) VALUES ('Alice');
      SELECT * FROM users;
      UPDATE users SET name = 'Bob' WHERE name = 'Alice';
      DELETE FROM users WHERE name = 'Bob';
    `
    expectCount(sql, 4)
  })
})

describe('CTEs', () => {
  it('CTE with semicolon inside string', () =>
    expectCount("WITH cte AS (SELECT id, 'x;y' AS label FROM t) SELECT * FROM cte", 1))

  it('two separate CTEs', () =>
    expectCount(
      'WITH a AS (SELECT 1) SELECT * FROM a; WITH b AS (SELECT 2) SELECT * FROM b',
      2
    ))

  it('nested CTE', () =>
    expectCount(
      `WITH outer AS (
         WITH inner AS (SELECT 1)
         SELECT * FROM inner
       )
       SELECT * FROM outer`,
      1
    ))
})

describe('multiline & whitespace', () => {
  it('multiline SELECT', () =>
    expectCount('SELECT\n  id,\n  name\nFROM\n  public.users\nWHERE\n  active = true', 1))

  it('five statements separated by blank lines', () =>
    expectCount('SELECT 1;\n\nSELECT 2;\n\nSELECT 3;\n\nSELECT 4;\n\nSELECT 5', 5))

  it('semicolon at end of each line', () =>
    expectSplits(
      'SELECT 1;\nSELECT 2;\nSELECT 3;',
      ['SELECT 1', 'SELECT 2', 'SELECT 3']
    ))

  it('Windows CRLF line endings', () =>
    expectSplits('SELECT 1;\r\nSELECT 2', ['SELECT 1', 'SELECT 2']))
})

describe('edge cases', () => {
  it('positional parameters $1 $2 are not dollar-quotes', () =>
    expectCount('SELECT $1, $2', 1))

  it('CREATE TEMP TABLE then SELECT from it', () =>
    expectSplits(
      'CREATE TEMP TABLE tmp AS SELECT id FROM t WHERE active;\nSELECT * FROM tmp',
      ['CREATE TEMP TABLE tmp AS SELECT id FROM t WHERE active', 'SELECT * FROM tmp']
    ))

  it('SET session variable then query', () =>
    expectSplits(
      "SET search_path TO myschema; SELECT * FROM t",
      ['SET search_path TO myschema', 'SELECT * FROM t']
    ))

  it('TRUNCATE then INSERT then SELECT', () =>
    expectCount('TRUNCATE t; INSERT INTO t VALUES (1); SELECT * FROM t', 3))

  it('BEGIN / COMMIT block', () =>
    expectCount('BEGIN; INSERT INTO t VALUES (1); COMMIT', 3))

  it('long query with many clauses stays as one', () =>
    expectCount(
      `SELECT u.id, u.name, COUNT(o.id) AS orders
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       WHERE u.active = true
       GROUP BY u.id, u.name
       HAVING COUNT(o.id) > 0
       ORDER BY orders DESC
       LIMIT 20`,
      1
    ))
})

describe('getEditorQueries block grouping', () => {
  it('consecutive statements with no blank line → one block', () => {
    const blocks = getEditorQueries('SELECT 1;\nSELECT 2')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].queries).toEqual(['SELECT 1', 'SELECT 2'])
  })

  it('statements separated by blank line → separate blocks', () => {
    const blocks = getEditorQueries('SELECT 1;\n\nSELECT 2')
    expect(blocks).toHaveLength(2)
  })

  it('each block carries correct line numbers', () => {
    const blocks = getEditorQueries('SELECT 1;\n\nSELECT 2')
    expect(blocks[0].startLineNumber).toBe(1)
    expect(blocks[1].startLineNumber).toBeGreaterThan(1)
  })

  it('empty input → zero blocks', () => {
    expect(getEditorQueries('')).toHaveLength(0)
  })
})
