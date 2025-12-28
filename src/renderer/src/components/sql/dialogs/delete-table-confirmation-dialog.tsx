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

interface DeleteTableConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  table: string
  schema?: string
  isPending?: boolean
}

export const DeleteTableConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  table,
  schema,
  isPending = false
}: DeleteTableConfirmationDialogProps) => {
  const tableName = schema ? `${schema}.${table}` : table

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete table {tableName}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the table <strong>{tableName}</strong>? This action
            cannot be undone and will permanently delete all data in the table.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-white cursor-pointer hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 disabled:opacity-70"
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
