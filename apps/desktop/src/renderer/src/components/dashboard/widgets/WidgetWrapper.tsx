/**
 * Widget Wrapper Component
 * Provides consistent layout and toolbar for all widget types
 * Eliminates redundant code across widget components
 */

import { Maximize2, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'

interface WidgetWrapperProps {
  title: string
  isEditMode: boolean
  isExpanded?: boolean
  isLoading?: boolean
  error?: Error | null
  onRefresh?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onExpand?: () => void
  children: ReactNode
  loadingContent?: ReactNode
  errorContent?: ReactNode
  extraActions?: ReactNode
}

export function WidgetWrapper({
  title,
  isEditMode,
  isExpanded,
  isLoading,
  error,
  onRefresh,
  onEdit,
  onDelete,
  onExpand,
  children,
  loadingContent,
  errorContent,
  extraActions
}: WidgetWrapperProps) {
  return (
    <Card
      className={cn(
        'h-full flex flex-col bg-card border-border/60 shadow-sm dark:shadow-xl',
        isExpanded && 'rounded-none border-0 shadow-none'
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium truncate">{title}</CardTitle>
        <div className="flex items-center gap-1">
          {extraActions}
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRefresh}
              title="Refresh"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          {!isEditMode && !isExpanded && onExpand && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onExpand}
              title="Expand"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}
          {isEditMode && (
            <>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onEdit}
                  title="Edit"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive dark:text-white dark:hover:bg-red-400!"
                  onClick={() => onDelete()}
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto flex flex-col">
        {isLoading ? (
          loadingContent ?? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-pulse w-full h-full bg-muted rounded" />
            </div>
          )
        ) : error ? (
          errorContent ?? (
            <div className="flex-1 flex items-center justify-center text-sm text-destructive">
              {error.message || 'Failed to load data'}
            </div>
          )
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
