import { Button } from '@renderer/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@renderer/components/ui/sheet'
import { formatCellValue } from '@renderer/features/data-table/lib/data-table'
import type { ForeignKeyNavigation } from '@renderer/features/data-table/lib/foreign-key-navigation'
import { useTableData } from '@renderer/features/sql-workspace/queries/schema'

type ForeignKeyPreviewSheetProps = {
  connectionId: string
  navigation: ForeignKeyNavigation | null
  onClose: () => void
  onOpenTarget: (navigation: ForeignKeyNavigation) => void
}

export function ForeignKeyPreviewSheet({
  connectionId,
  navigation,
  onClose,
  onOpenTarget
}: ForeignKeyPreviewSheetProps) {
  const { data, error, isFetching, isPlaceholderData } = useTableData(
    connectionId,
    navigation?.referencedSchema,
    navigation?.referencedTable,
    {
      limit: 1,
      offset: 0,
      filters: navigation ? [navigation.filter] : undefined
    }
  )

  const row = data?.rows[0]
  const isLoading = isFetching || isPlaceholderData

  return (
    <Sheet open={Boolean(navigation)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg gap-0 p-0">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>
            {navigation
              ? `${navigation.referencedSchema}.${navigation.referencedTable}`
              : 'Referenced row'}
          </SheetTitle>
          <SheetDescription>
            {navigation
              ? `${navigation.referencedColumn} = ${formatCellValue(navigation.filter.value)}`
              : 'Referenced row preview'}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-auto p-4" aria-live="polite">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading referenced row…</p>
          ) : error ? (
            <p className="text-sm text-destructive">Unable to load the referenced row.</p>
          ) : !row ? (
            <p className="text-sm text-muted-foreground">Referenced row not found.</p>
          ) : (
            <dl className="divide-y rounded-md border">
              {data.columns.map((column) => (
                <div key={column.name} className="grid grid-cols-[minmax(8rem,1fr)_2fr] gap-4 p-3">
                  <dt className="truncate text-sm font-medium" title={column.name}>
                    {column.name}
                  </dt>
                  <dd className="min-w-0 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {formatCellValue(row[column.name], column.dataType)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <SheetFooter className="border-t">
          <Button
            type="button"
            disabled={!navigation}
            onClick={() => navigation && onOpenTarget(navigation)}
          >
            Open in filtered tab
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
