import type { ConnectionProfile, DatabaseType } from '@dbdesk/shared/types'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@renderer/components/ui/sheet'
import { PostgresConnectionForm } from './connection-forms/postgres/postgres-connection-form'

interface ConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection?: ConnectionProfile | null
  databaseType?: DatabaseType
}

export function ConnectionDialog({
  open,
  onOpenChange,
  connection,
  databaseType
}: ConnectionDialogProps) {
  const type = connection?.type || databaseType

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>{connection ? 'Edit Connection' : 'New Connection'}</SheetTitle>
          <SheetDescription>
            {connection
              ? 'Update the connection details.'
              : 'Create a new database connection profile.'}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!type ? <div>Select a database type to continue.</div> : null}
          {type === 'postgres' ? (
            <PostgresConnectionForm connection={connection} onSuccess={() => onOpenChange(false)} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
