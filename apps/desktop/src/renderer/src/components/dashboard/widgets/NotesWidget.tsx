/**
 * Notes Widget Component
 * Displays free-form text notes with inline editing support
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@renderer/lib/utils'
import type { NotesWidgetSettings } from '@common/types'
import type { WidgetComponentProps } from '@renderer/types/dashboard'
import { WidgetWrapper } from './WidgetWrapper'

const SAVE_DEBOUNCE_MS = 600

export function NotesWidget({
  widget,
  isEditMode,
  onEdit,
  onDelete,
  onSave
}: WidgetComponentProps<NotesWidgetSettings>) {
  const settings = widget.settings as NotesWidgetSettings
  const content = settings.content ?? ''

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveTimerRef = useRef<number>(0)
  const contentRef = useRef(content)

  // Keep contentRef always in sync so Escape always restores the latest value
  useEffect(() => {
    contentRef.current = content
  }, [content])

  // Sync draft when content changes from outside (e.g. edit dialog save)
  useEffect(() => {
    if (!isEditing) {
      setDraft(content)
    }
  }, [content, isEditing])

  const flushSave = useCallback(() => {
    onSave?.({
      ...widget,
      settings: { ...settings, content: draft }
    })
  }, [draft, widget, settings, onSave])

  // Cleanup: flush any pending save on unmount so edits aren't lost
  // when the user navigates away or closes the tab before the debounce fires.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = 0
        flushSave()
      }
    }
  }, [flushSave])

  const handleStartEditing = useCallback(() => {
    if (!isEditMode) return
    setDraft(content)
    setIsEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [isEditMode, content])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    if (draft !== content) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      saveTimerRef.current = window.setTimeout(flushSave, SAVE_DEBOUNCE_MS)
    }
  }, [draft, content, flushSave])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        setIsEditing(false)
        setDraft(contentRef.current)
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current)
          saveTimerRef.current = 0
        }
      }
    },
    []
  )

  return (
    <WidgetWrapper
      title={widget.title}
      isEditMode={isEditMode}
      onEdit={onEdit ? () => onEdit(widget) : undefined}
      onDelete={onDelete ? () => onDelete(widget.id) : undefined}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="w-full flex-1 resize-none bg-transparent text-sm leading-relaxed focus:outline-none placeholder:text-muted-foreground"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Type your notes here..."
        />
      ) : (
        <div
          className={cn(
            'flex-1 overflow-auto text-sm leading-relaxed whitespace-pre-wrap wrap-break-word',
            isEditMode &&
              'cursor-text rounded px-1 -mx-1 hover:bg-muted/30 transition-colors'
          )}
          onClick={handleStartEditing}
        >
          {content ? (
            content
          ) : (
            <span className="text-muted-foreground">
              {isEditMode ? 'Click to add notes...' : 'No notes'}
            </span>
          )}
        </div>
      )}
    </WidgetWrapper>
  )
}
