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

interface DangerousQueryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  queries: string[]
}

export function DangerousQueryDialog({
  open,
  onOpenChange,
  onConfirm,
  queries
}: DangerousQueryDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Potentially Dangerous Query</AlertDialogTitle>
          <AlertDialogDescription>
            {queries.length === 1
              ? 'This query contains statements that may modify or delete data (DELETE, DROP, ALTER, etc.).'
              : `${queries.length} queries contain statements that may modify or delete data (DELETE, DROP, ALTER, etc.).`}
            {' '}Are you sure you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Execute
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
