import type { ConstraintInfo, TableDataColumn } from '@dbdesk/shared/types'
import {
  isForeignKeyActivationKey,
  getForeignKeyNavigation
} from '@renderer/features/data-table/lib/foreign-key-navigation'
import { useTabStore } from '@renderer/features/sql-workspace/stores/tab-store'
import { beforeEach, describe, expect, it } from 'vitest'

const column: TableDataColumn = {
  name: 'account_id',
  dataType: 'uuid',
  foreignKey: {
    referencedSchema: 'billing',
    referencedTable: 'accounts',
    referencedColumn: 'id',
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION'
  }
}

const constraint: ConstraintInfo = {
  name: 'orders_account_id_fkey',
  type: 'FOREIGN KEY',
  columns: ['account_id'],
  foreignTable: { schema: 'billing', name: 'accounts' },
  foreignColumns: ['id']
}

describe('foreign key navigation', () => {
  beforeEach(() => useTabStore.getState().reset())

  it('maps only scalar, single-column relations', () => {
    expect(getForeignKeyNavigation(column, [constraint], 'account-1')).toEqual({
      sourceColumn: 'account_id',
      referencedSchema: 'billing',
      referencedTable: 'accounts',
      referencedColumn: 'id',
      filter: { column: 'id', operator: '=', value: 'account-1' }
    })

    expect(
      getForeignKeyNavigation(
        column,
        [
          {
            ...constraint,
            columns: ['account_id', 'account_region'],
            foreignColumns: ['id', 'region']
          }
        ],
        'account-1'
      )
    ).toBeUndefined()
    expect(getForeignKeyNavigation(column, [constraint], null)).toBeUndefined()
  })

  it('opens a distinct filtered tab without changing the source tab', () => {
    const store = useTabStore.getState()
    const sourceId = store.addTableTab('public', 'orders')
    store.updateTableTab(sourceId, {
      filters: [{ column: 'status', operator: '=', value: 'pending' }],
      offset: 50
    })

    const sourceBefore = useTabStore.getState().findTableTabById(sourceId)
    const targetId = useTabStore
      .getState()
      .addFilteredTableTab('billing', 'accounts', [
        { column: 'id', operator: '=', value: 'account-1' }
      ])

    expect(targetId).not.toBe('billing.accounts')
    expect(useTabStore.getState().findTableTabById(sourceId)).toEqual(sourceBefore)
    expect(useTabStore.getState().findTableTabById(targetId)).toMatchObject({
      schema: 'billing',
      table: 'accounts',
      isTemporary: false,
      filters: [{ column: 'id', operator: '=', value: 'account-1' }]
    })
    expect(useTabStore.getState().activeTabId).toBe(targetId)
  })

  it('keeps table navigation distinct from link activation', () => {
    expect(isForeignKeyActivationKey('Enter')).toBe(true)
    expect(isForeignKeyActivationKey(' ')).toBe(true)
    expect(isForeignKeyActivationKey('ArrowRight')).toBe(false)
    expect(isForeignKeyActivationKey('Tab')).toBe(false)
  })

  it('removes every tab for a deleted table without relying on its canonical tab id', () => {
    const sourceId = useTabStore.getState().addTableTab('public', 'orders')
    useTabStore.getState().makeTabPermanent(sourceId)
    const canonicalTargetId = useTabStore.getState().addTableTab('billing', 'accounts')
    useTabStore.getState().makeTabPermanent(canonicalTargetId)
    const similarlyNamedId = useTabStore.getState().addTableTab('billing', 'accounts_archive')
    useTabStore.getState().makeTabPermanent(similarlyNamedId)
    const firstTargetId = useTabStore
      .getState()
      .addFilteredTableTab('billing', 'accounts', [
        { column: 'id', operator: '=', value: 'account-1' }
      ])
    const secondTargetId = useTabStore
      .getState()
      .addFilteredTableTab('billing', 'accounts', [
        { column: 'id', operator: '=', value: 'account-2' }
      ])

    useTabStore.getState().setTabScrollPosition(sourceId, { left: 1, top: 2 })
    useTabStore.getState().setTabScrollPosition(firstTargetId, { left: 10, top: 20 })
    useTabStore.getState().setTabScrollPosition(secondTargetId, { left: 30, top: 40 })
    useTabStore.getState().setActiveTab(firstTargetId)
    useTabStore.getState().removeTableTabs('billing', 'accounts')

    expect(useTabStore.getState().tabs.map((tab) => tab.id)).toEqual([sourceId, similarlyNamedId])
    expect(useTabStore.getState().activeTabId).toBe(similarlyNamedId)
    expect(useTabStore.getState().tabScrollPositions).toEqual({
      [sourceId]: { left: 1, top: 2 }
    })
  })
})
