import type { ConnectionProfile } from '@common/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../../../components/ui/dialog'
import { QuickConnect } from './quick-connect'
import { ConnectionForm } from './connection-form'
import { Separator } from '@renderer/components/ui/separator'

interface ConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection?: ConnectionProfile | null
}

export function ConnectionDialog({ open, onOpenChange, connection }: ConnectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{connection ? 'Edit Connection' : 'New Connection'}</DialogTitle>
          <DialogDescription>
            {connection
              ? 'Update the connection details.'
              : 'Create a new database connection profile.'}
          </DialogDescription>
        </DialogHeader>
        {!connection && (
          <div className="flex flex-col gap-2">
            <QuickConnect onSuccess={() => onOpenChange(false)} />
            <Separator />
          </div>
        )}
        <ConnectionForm connection={connection} onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
