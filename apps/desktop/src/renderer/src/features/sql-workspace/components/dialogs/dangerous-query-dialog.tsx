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
  queryCount: number
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DangerousQueryDialog({
  open,
  queryCount,
  onOpenChange,
  onConfirm
}: DangerousQueryDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Run potentially destructive SQL?</AlertDialogTitle>
          <AlertDialogDescription>
            {queryCount === 1
              ? 'This statement includes a keyword that can modify or remove data.'
              : `These ${queryCount} statements include keywords that can modify or remove data.`}{' '}
            Confirm before continuing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Run anyway</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
