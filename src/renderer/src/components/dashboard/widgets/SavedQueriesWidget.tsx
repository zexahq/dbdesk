/**
 * Saved Queries Widget Component
 * Displays saved queries with ability to view, run, and create new queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Code, Eye, Pencil, Play, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { dbdeskClient } from '@renderer/api/client'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import type { SavedQuery } from '@common/types'
import type { MarkdownWidgetSettings, WidgetComponentProps } from '../types'

interface QueryPreviewDialogProps {
  query: SavedQuery | null
  open: boolean
  onOpenChange: (open: boolean) => void
  connectionId: string
}

function QueryPreviewDialog({ query, open, onOpenChange, connectionId }: QueryPreviewDialogProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<{ rows: unknown[]; columns: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async () => {
    if (!query) return
    setIsRunning(true)
    setError(null)
    try {
      const res = await dbdeskClient.runQuery(connectionId, query.content, { limit: 10 })
      setResult({ rows: res.rows, columns: res.columns })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run query')
    } finally {
      setIsRunning(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    setError(null)
    onOpenChange(false)
  }

  if (!query) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            {query.name}
          </DialogTitle>
          <DialogDescription>Preview and run this saved query</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          <div className="rounded-md border bg-muted/30 p-3">
            <pre className="text-sm font-mono whitespace-pre-wrap break-all">{query.content}</pre>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
          )}

          {result && (
            <div className="border rounded-md overflow-hidden">
              <div className="text-xs text-muted-foreground p-2 bg-muted border-b">
                {result.rows.length} rows (showing first 10)
              </div>
              <div className="h-48 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      {result.columns.map((col) => (
                        <th key={col} className="text-left p-2 font-medium border-b">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        {result.columns.map((col) => (
                          <td key={col} className="p-2 truncate max-w-32">
                            {String((row as Record<string, unknown>)[col] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button onClick={handleRun} disabled={isRunning}>
            <Play className="h-4 w-4 mr-1" />
            {isRunning ? 'Running...' : 'Run Query'}
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
      // Generate a unique ID for the new query
      const queryId = `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
    enabled: !!connectionId
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

  const handleRefresh = () => {
    refetch()
    onRefresh?.()
  }

  const handleQuerySaved = () => {
    queryClient.invalidateQueries({ queryKey: ['saved-queries', connectionId] })
  }

  const handlePreview = (query: SavedQuery) => {
    setPreviewQuery(query)
    setPreviewOpen(true)
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium truncate">{title}</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setNewQueryOpen(true)}
              title="New Query"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleRefresh}
              title="Refresh"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            {isEditMode && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onEdit?.(widget)}
                  title="Edit"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => onDelete?.(widget.id)}
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse space-y-2 w-full">
                <div className="h-8 bg-muted rounded" />
                <div className="h-8 bg-muted rounded" />
                <div className="h-8 bg-muted rounded" />
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load queries'}
            </div>
          ) : !savedQueries?.length ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Code className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No saved queries yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setNewQueryOpen(true)}
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
                        className="h-6 w-6"
                        onClick={() => handlePreview(query)}
                        title="Preview & Run"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
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
        </CardContent>
      </Card>

      <QueryPreviewDialog
        query={previewQuery}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        connectionId={connectionId}
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
