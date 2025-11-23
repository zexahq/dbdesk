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

interface UpdateErrorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  query?: string
  error?: string
}

export function UpdateErrorDialog({
  open,
  onOpenChange,
  query,
  error
}: UpdateErrorDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Update Failed</AlertDialogTitle>
          <AlertDialogDescription>
            The cell update operation failed with the following error:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {query && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Query:</h4>
              <div className="h-24 overflow-auto rounded border bg-muted p-3">
                <pre className="text-xs">
                  <code>{query}</code>
                </pre>
              </div>
            </div>
          )}

          {error && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Error:</h4>
              <div className="max-h-48 overflow-auto rounded border bg-destructive/10 p-3">
                <pre className="text-xs text-destructive">
                  <code>{error}</code>
                </pre>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction disabled>Open failed in SQL</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
