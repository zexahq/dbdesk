import type { ConnectionProfile, DatabaseType } from '@common/types'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-2xl max-w-none!">
        <DialogHeader>
          <DialogTitle>{connection ? 'Edit Connection' : 'New Connection'}</DialogTitle>
          <DialogDescription>
            {connection
              ? 'Update the connection details.'
              : 'Create a new database connection profile.'}
          </DialogDescription>
        </DialogHeader>
        {!type && <div className="flex flex-col gap-2">Select a database type to continue.</div>}
        {type === 'postgres' && (
          <PostgresConnectionForm connection={connection} onSuccess={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}
