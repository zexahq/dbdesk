import { areCellPropsEqual } from '@renderer/features/data-table/components/data-table-cell-variants/base'
import { describe, expect, it } from 'vitest'

const makeProps = (cellRenderer: () => null, meta: object) => ({
  cell: {
    getValue: () => 'account-1',
    column: {
      getSize: () => 240,
      columnDef: { cell: cellRenderer, meta }
    }
  },
  columnId: 'account_id',
  rowIndex: 0,
  focusedCell: null,
  editingCell: null
})

describe('data table cell memoization', () => {
  it('rerenders when late metadata replaces the cell renderer', () => {
    const previous = makeProps(() => null, { foreignKey: undefined })
    const next = makeProps(() => null, { foreignKey: { referencedTable: 'accounts' } })

    expect(areCellPropsEqual(previous as never, next as never)).toBe(false)
  })
})
