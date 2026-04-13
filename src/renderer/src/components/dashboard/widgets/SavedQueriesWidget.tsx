/**
 * Saved Queries Widget Component
 * Displays saved queries with ability to view, run, and create new queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Code, Eye, Plus, Save, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { dbdeskClient } from '@renderer/api/client'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { createId } from '@renderer/lib/utils'
import type { MarkdownWidgetSettings, SavedQuery } from '@common/types'
import type { WidgetComponentProps } from '@renderer/types/dashboard'
import { WidgetWrapper } from './WidgetWrapper'

interface QueryPreviewDialogProps {
  query: SavedQuery | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function QueryPreviewDialog({ query, open, onOpenChange }: QueryPreviewDialogProps) {
  const handleClose = () => {
    onOpenChange(false)
  }

  if (!query) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            {query.name}
          </DialogTitle>
          <DialogDescription>View saved query</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3">
            <pre className="text-sm font-mono whitespace-pre-wrap break-all">{query.content}</pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface NewQueryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectionId: string
  onSaved: () => void
}

function NewQueryDialog({ open, onOpenChange, connectionId, onSaved }: NewQueryDialogProps) {
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Query name is required')
      if (!content.trim()) throw new Error('Query content is required')
      const queryId = createId('query')
      await dbdeskClient.saveQuery(connectionId, queryId, name.trim(), content.trim())
    },
    onSuccess: () => {
      setName('')
      setContent('')
      setError(null)
      onSaved()
      onOpenChange(false)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to save query')
    }
  })

  const handleClose = () => {
    setName('')
    setContent('')
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Save New Query</DialogTitle>
          <DialogDescription>Save a query for quick access later</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Query Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Active Users"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">SQL Query</label>
            <textarea
              className="w-full min-h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-foreground/50"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="SELECT * FROM users WHERE active = true"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" />
            {saveMutation.isPending ? 'Saving...' : 'Save Query'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SavedQueriesWidget({
  widget,
  connectionId,
  isEditMode,
  isExpanded,
  onEdit,
  onDelete,
  onRefresh
}: WidgetComponentProps<MarkdownWidgetSettings>) {
  const { title } = widget
  const queryClient = useQueryClient()
  const [previewQuery, setPreviewQuery] = useState<SavedQuery | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [newQueryOpen, setNewQueryOpen] = useState(false)

  // Fetch saved queries
  const {
    data: savedQueries,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['saved-queries', connectionId],
    queryFn: () => dbdeskClient.loadQueries(connectionId),
    enabled: !!connectionId,
    staleTime: 60_000, // 1 minute - consistent with other usages
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false
  })

  // Delete query mutation
  const deleteMutation = useMutation({
    mutationFn: async (queryId: string) => {
      await dbdeskClient.deleteQuery(connectionId, queryId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-queries', connectionId] })
    }
  })

  const handleQuerySaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['saved-queries', connectionId] })
  }, [queryClient, connectionId])

  const handlePreview = useCallback((query: SavedQuery) => {
    setPreviewQuery(query)
    setPreviewOpen(true)
  }, [])

  const handleRefresh = useCallback(() => {
    refetch()
    onRefresh?.()
  }, [refetch, onRefresh])

  const handleOpenNewQuery = useCallback(() => setNewQueryOpen(true), [])

  const extraActions = (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={handleOpenNewQuery}
      title="New Query"
    >
      <Plus className="h-3 w-3" />
    </Button>
  )

  return (
    <>
      <WidgetWrapper
        title={title}
        isEditMode={isEditMode}
        isExpanded={isExpanded}
        isLoading={isLoading}
        error={error instanceof Error ? error : null}
        onRefresh={handleRefresh}
        onEdit={() => onEdit?.(widget)}
        onDelete={() => onDelete?.(widget.id)}
        extraActions={extraActions}
      >
        {!savedQueries?.length ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Code className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No saved queries yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={handleOpenNewQuery}
            >
              <Plus className="h-3 w-3 mr-1" />
              Save Your First Query
            </Button>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <div className="space-y-1 pr-3">
              {savedQueries.map((query) => (
                <div
                  key={query.id}
                  className="group flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <button
                    className="flex-1 text-left truncate text-sm"
                    onClick={() => handlePreview(query)}
                  >
                    <span className="font-medium">{query.name}</span>
                    <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">
                      {query.content.slice(0, 50)}
                      {query.content.length > 50 ? '...' : ''}
                    </p>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-accent"
                      onClick={() => handlePreview(query)}
                      title="Preview & Run"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive dark:text-white dark:hover:bg-red-400!"
                      onClick={() => deleteMutation.mutate(query.id)}
                      title="Delete"
                      disabled={deleteMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </WidgetWrapper>

      <QueryPreviewDialog
        query={previewQuery}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      <NewQueryDialog
        open={newQueryOpen}
        onOpenChange={setNewQueryOpen}
        connectionId={connectionId}
        onSaved={handleQuerySaved}
      />
    </>
  )
}
