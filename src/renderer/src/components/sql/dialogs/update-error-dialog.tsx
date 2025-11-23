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
      <AlertDialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle>Update Failed</AlertDialogTitle>
          <AlertDialogDescription>
            The cell update operation failed with the following error:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 min-h-0 space-y-4 overflow-y-auto">
          {query && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Query:</h4>
              <div className="rounded-md border bg-muted p-3">
                <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                  <code>{query}</code>
                </pre>
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Error:</h4>
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                <pre className="text-xs font-mono text-destructive whitespace-pre-wrap break-words leading-relaxed">
                  <code>{error}</code>
                </pre>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction disabled>Open failed in SQL</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
