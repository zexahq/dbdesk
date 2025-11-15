import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTrigger
} from '@renderer/components/ui/alert-dialog'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import { Trash } from 'lucide-react'

interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
  selectedRowsCount: number
}

export const DeleteConfirmationDialog = ({
  open,
  onOpenChange,
  onDelete,
  selectedRowsCount
}: DeleteConfirmationDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className={cn('cursor-pointer', selectedRowsCount === 0 && 'hidden')}
          disabled={selectedRowsCount === 0}
        >
          Delete {selectedRowsCount} rows
          <Trash className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {selectedRowsCount} rows</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {selectedRowsCount} rows? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className="bg-destructive text-white cursor-pointer hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
