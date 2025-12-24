import type { QueryResultRow, SQLConnectionProfile } from '@common/types'
import { useDeleteTableRows, useTableData, useUpdateTableCell } from '@renderer/api/queries/schema'
import { TableTab, useTabStore } from '@renderer/store/tab-store'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { UpdateErrorDialog } from '../dialogs/update-error-dialog'
import { SqlTable } from '../table'
import { SqlBottombar } from './sql-bottombar'
import { SqlStructure } from './sql-structure'
import { SqlTopbar } from './sql-topbar'

interface TableViewProps {
  profile: SQLConnectionProfile
  activeTab: TableTab
}

export function TableView({ profile, activeTab }: TableViewProps) {
  const queryClient = useQueryClient()
  const [updateErrorDialogOpen, setUpdateErrorDialogOpen] = useState(false)
  const [updateError, setUpdateError] = useState<{ query?: string; error?: string }>({})
  const updateTableTab = useTabStore((s) => s.updateTableTab)
  const {
    data: tableData,
    isLoading: isLoadingTableData,
    error: tableError
  } = useTableData(
    profile.id,
    activeTab.schema,
    activeTab.table,
    activeTab
      ? {
          limit: activeTab.limit,
          offset: activeTab.offset,
          filters: activeTab.filters,
          sortRules: activeTab.sortRules
        }
      : undefined
  )

  const { mutateAsync: deleteRowsMutation, isPending: isDeletePending } = useDeleteTableRows(
    profile.id
  )
  const { mutateAsync: updateCellMutation } = useUpdateTableCell(profile.id)

  const selectedRows = useMemo<QueryResultRow[]>(() => {
    if (!tableData) {
      return []
    }
    return Object.entries(activeTab.rowSelection)
      .filter(([, isSelected]) => Boolean(isSelected))
      .map(([rowId]) => tableData.rows[Number(rowId)])
      .filter((row): row is QueryResultRow => Boolean(row))
  }, [activeTab.rowSelection, tableData])

  const refreshTableData = () => {
    queryClient.invalidateQueries({
      queryKey: ['table-data', profile.id, activeTab.schema, activeTab.table]
    })
  }

  const handleCellUpdate = useCallback(
    async (columnToUpdate: string, newValue: unknown, row: QueryResultRow) => {
      if (!tableData) {
        return
      }

      if (!tableData.primaryKeyColumns || tableData.primaryKeyColumns.length === 0) {
        toast.error('Please add a primary key column to update rows.')
        return
      }

      try {
        await updateCellMutation({
          schema: activeTab.schema,
          table: activeTab.table,
          columnToUpdate,
          newValue,
          row
        })
        toast.success('Cell updated successfully.')
        refreshTableData()
      } catch (error) {
        const err = error as Error & { query?: string }

        const cleanErrorMessage = (message: string): string => {
          const match = message.match(/^Error invoking remote method '[^']+': (.+)$/)
          return match ? match[1] : message
        }

        setUpdateError({
          query: err.query,
          error: cleanErrorMessage(err.message)
        })
        setUpdateErrorDialogOpen(true)
      }
    },
    [activeTab.schema, activeTab.table, tableData, updateCellMutation]
  )

  const handleDeleteSelectedRows = useCallback(async () => {
    if (!tableData) {
      return
    }

    if (!tableData.primaryKeyColumns || tableData.primaryKeyColumns.length === 0) {
      toast.error('Please add a primary key column to delete rows.')
      return
    }

    if (selectedRows.length === 0) {
      toast.error('Select at least one row to delete.')
      return
    }

    try {
      const result = await deleteRowsMutation({
        schema: activeTab.schema,
        table: activeTab.table,
        rows: selectedRows
      })
      toast.success(
        `Deleted ${result.deletedRowCount} row${result.deletedRowCount === 1 ? '' : 's'}.`
      )
      updateTableTab(activeTab.id, { rowSelection: {} })
      refreshTableData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete rows.'
      toast.error(message)
    }
  }, [deleteRowsMutation, selectedRows, activeTab, tableData, updateTableTab])

  const handleLimitChange = useCallback(
    (limit: number) => {
      updateTableTab(activeTab.id, { limit, offset: 0 })
    },
    [activeTab.id, updateTableTab]
  )

  const handleOffsetChange = useCallback(
    (offset: number) => {
      updateTableTab(activeTab.id, { offset })
    },
    [activeTab.id, updateTableTab]
  )

  return (
    <>
      <SqlTopbar
        activeTab={activeTab}
        onRefresh={refreshTableData}
        isLoading={isLoadingTableData}
        columns={tableData?.columns}
        onDeleteRows={handleDeleteSelectedRows}
        isDeletePending={isDeletePending}
      />
      <div className="flex-1 overflow-hidden">
        {activeTab.view === 'tables' && (
          <SqlTable
            activeTab={activeTab}
            isLoading={isLoadingTableData}
            error={tableError}
            tableData={tableData}
            onCellUpdate={handleCellUpdate}
          />
        )}
        {activeTab.view === 'structure' && (
          <SqlStructure
            connectionId={profile.id}
            schema={activeTab.schema}
            table={activeTab.table}
          />
        )}
      </div>
      {tableData && (
        <SqlBottombar
          tableData={tableData}
          limit={activeTab.limit}
          offset={activeTab.offset}
          onLimitChange={handleLimitChange}
          onOffsetChange={handleOffsetChange}
        />
      )}
      <UpdateErrorDialog
        open={updateErrorDialogOpen}
        onOpenChange={setUpdateErrorDialogOpen}
        query={updateError.query}
        error={updateError.error}
      />
    </>
  )
}
