'use client'

import { BasicEditor } from '@renderer/components/editor/basic-editor'
import { Button } from '@renderer/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetTitle } from '@renderer/components/ui/sheet'

interface CellEditorSheetProps {
  open: boolean
  value: string
  language: string
  onOpenChange: (open: boolean) => void
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export function CellEditorSheet({
  open,
  value,
  language,
  onOpenChange,
  onChange,
  onSave,
  onCancel
}: CellEditorSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
        <div className="flex flex-col h-full">
          <SheetTitle>
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Edit Cell</h2>
            </div>
          </SheetTitle>
          <div className="flex-1 min-h-0 overflow-hidden">
            <BasicEditor
              value={value}
              onChange={onChange}
              onSave={onSave}
              onCancel={onCancel}
              height="100%"
              language={language}
            />
          </div>
          <SheetFooter className="flex flex-row items-center justify-end gap-2 border-t p-4 bg-muted/50">
            <Button variant="outline" size="sm" onClick={onCancel} className="gap-2">
              <span>Cancel</span>
            </Button>
            <Button variant="default" size="sm" onClick={onSave} className="gap-2">
              <span>Save changes</span>
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}
