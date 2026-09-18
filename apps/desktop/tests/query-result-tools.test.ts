import { assertSingleRowUpdated } from '@dbdesk/shared/adapters'
import { describe, expect, it } from 'vitest'
import { getSelectionColumnId } from '../src/renderer/src/features/data-table/lib/data-table'
import {
  getEditableSelectTarget,
  serializeQueryResult
} from '../src/renderer/src/features/sql-workspace/components/query-view/result-tools'

describe('query result serialization', () => {
  const columns = ['id', 'name', 'metadata']
  const rows = [
    { id: 1n, name: 'Ada, "first"', metadata: { active: true } },
    { id: 2, name: 'Grace\nHopper', metadata: null }
  ]

  it('exports CSV with stable columns and escaped values', () => {
    expect(serializeQueryResult(columns, rows, 'csv')).toBe(
      'id,name,metadata\n1,"Ada, ""first""","{""active"":true}"\n2,"Grace\nHopper",'
    )
  })

  it('exports TSV with headers and JSON without failing on bigint', () => {
    expect(serializeQueryResult(columns, rows, 'tsv')).toContain('id\tname\tmetadata')
    expect(serializeQueryResult(columns, rows, 'json')).toContain('"id": "1"')
  })

  it('neutralizes spreadsheet formulas without changing numeric values', () => {
    expect(
      serializeQueryResult(
        ['formula', '=header'],
        [
          { formula: '=HYPERLINK("https://example.com")', '=header': '@SUM(A1:A2)' },
          { formula: '-12', '=header': -12 }
        ],
        'csv'
      )
    ).toBe('formula,\'=header\n"\'=HYPERLINK(""https://example.com"")",\'@SUM(A1:A2)\n\'-12,-12')
  })
})

describe('editable result writes', () => {
  it('rejects stale or unexpectedly broad updates', () => {
    expect(() => assertSingleRowUpdated(0)).toThrow('row no longer exists')
    expect(() => assertSingleRowUpdated(2)).toThrow('Expected to update one row')
    expect(() => assertSingleRowUpdated(1)).not.toThrow()
  })
})

describe('editable query eligibility', () => {
  it('accepts only exact schema-qualified SELECT star queries', () => {
    expect(getEditableSelectTarget('SELECT * FROM public.users;')).toEqual({
      schema: 'public',
      table: 'users'
    })
    expect(getEditableSelectTarget('select * from "Sales Data"."People"')).toEqual({
      schema: 'Sales Data',
      table: 'People'
    })
  })

  it('rejects ambiguous or transformed results', () => {
    expect(getEditableSelectTarget('SELECT * FROM users')).toBeNull()
    expect(getEditableSelectTarget('SELECT id FROM public.users')).toBeNull()
    expect(getEditableSelectTarget('SELECT * FROM public.users WHERE active')).toBeNull()
    expect(
      getEditableSelectTarget('SELECT * FROM public.users JOIN public.teams USING (id)')
    ).toBeNull()
  })
})

describe('result row selection column', () => {
  it('never collides with database column names', () => {
    const names = ['select', '__dbdesk_row_selection__', '__dbdesk_row_selection___']
    const selectionId = getSelectionColumnId(names)

    expect(names).not.toContain(selectionId)
    expect(getSelectionColumnId(names)).toBe(selectionId)
  })
})
