import type { ExportTableOptions, ExportTableResult } from '@common/types'
import { useMutation } from '@tanstack/react-query'
import { dbdeskClient } from '../../api/client'
import { downloadExportedFile } from '../../lib/download'
import { toast } from '../../lib/toast'

export function useExportTableAsCSV(connectionId: string) {
  return useMutation<
    ExportTableResult,
    Error,
    {
      schema: string
      table: string
      options?: Pick<ExportTableOptions, 'sortRules' | 'filters'>
    },
    string | number
  >({
    mutationFn: ({ schema, table, options }) =>
      dbdeskClient.exportTableAsCSV(connectionId, schema, table, options),
    onMutate: ({ schema, table }) => {
      return toast.loading(`Exporting ${schema}.${table} as CSV...`)
    },
    onSuccess: (result, _variables, context) => {
      downloadExportedFile(result)
      toast.success(`Successfully exported ${result.filename}`, { id: context })
    },
    onError: (error, _variables, context) => {
      console.error('CSV export failed:', error)
      toast.error('Failed to export CSV', { id: context })
    }
  })
}

export function useExportTableAsSQL(connectionId: string) {
  return useMutation<
    ExportTableResult,
    Error,
    {
      schema: string
      table: string
      options?: Pick<ExportTableOptions, 'sortRules' | 'filters'>
    },
    string | number
  >({
    mutationFn: ({ schema, table, options }) =>
      dbdeskClient.exportTableAsSQL(connectionId, schema, table, options),
    onMutate: ({ schema, table }) => {
      return toast.loading(`Exporting ${schema}.${table} as SQL...`)
    },
    onSuccess: (result, _variables, context) => {
      downloadExportedFile(result)
      toast.success(`Successfully exported ${result.filename}`, { id: context })
    },
    onError: (error, _variables, context) => {
      console.error('SQL export failed:', error)
      toast.error('Failed to export SQL', { id: context })
    }
  })
}
