import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@renderer/components/ui/alert-dialog'
import { Input } from '@renderer/components/ui/input'
import { useEffect, useState } from 'react'

interface DangerousQueryDialogProps {
  open: boolean
  queryCount: number
  connectionName: string
  production: boolean
  title?: string
  description?: string
  confirmLabel?: string
  statement?: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DangerousQueryDialog({
  open,
  queryCount,
  connectionName,
  production,
  title,
  description,
  confirmLabel = 'Run anyway',
  statement,
  onOpenChange,
  onConfirm
}: DangerousQueryDialogProps) {
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    if (!open) setConfirmation('')
  }, [open])

  const canConfirm = !production || confirmation === connectionName

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title ??
              (production ? 'Confirm production query?' : 'Run potentially destructive SQL?')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description ??
              (production ? (
                'Every query on a production connection requires explicit confirmation.'
              ) : (
                <>
                  {queryCount === 1
                    ? 'This statement includes a keyword that can modify or remove data.'
                    : `These ${queryCount} statements include keywords that can modify or remove data.`}{' '}
                  Confirm before continuing.
                </>
              ))}
          </AlertDialogDescription>
          {statement ? (
            <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
              {statement}
            </pre>
          ) : null}
          {production && (
            <div className="space-y-2 pt-2">
              <p className="text-sm">
                Production connection: type <strong>{connectionName}</strong> to continue.
              </p>
              <Input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                aria-label="Production connection confirmation"
                autoComplete="off"
              />
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={!canConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
