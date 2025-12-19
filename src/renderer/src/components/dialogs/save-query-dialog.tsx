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
import { useState } from 'react'

type SaveQueryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string) => Promise<void>
  isLoading?: boolean
  title?: string
  description?: string
  placeholder?: string
  submitText?: string
  initialValue?: string
}

export function SaveQueryDialog({
  open,
  onOpenChange,
  onSave,
  isLoading,
  title = 'Save Query',
  description = 'Give your query a memorable name so you can find it easily later',
  placeholder = 'e.g., Find users by email',
  submitText = 'Save',
  initialValue = ''
}: SaveQueryDialogProps) {
  const [name, setName] = useState(initialValue)

  const handleSave = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    try {
      await onSave(trimmedName)
      setName(initialValue)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save query:', error)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(initialValue)
    }
    onOpenChange(isOpen)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          placeholder={placeholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave()
            }
          }}
          disabled={isLoading}
          autoFocus
        />
        <AlertDialogFooter className="flex gap-2">
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave} disabled={!name.trim() || isLoading}>
            {isLoading ? `${submitText}ing...` : submitText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
