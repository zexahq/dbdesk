import type {
  DatabaseBackupFormat,
  DatabaseToolMode,
  DatabaseToolProgress,
  DatabaseToolRequest,
  SQLConnectionProfile
} from '@dbdesk/shared/types'
import { Button } from '@renderer/components/ui/button'
import { Checkbox } from '@renderer/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { dbdeskClient } from '@renderer/shared/api/client'
import { toast } from '@renderer/shared/lib/toast'
import { cn } from '@renderer/shared/lib/utils'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useMemo, useRef, useState, useEffect } from 'react'

interface DatabaseToolsDialogProps {
  profile: SQLConnectionProfile
  open: boolean
  onOpenChange: (open: boolean) => void
}

type JobStatus = 'idle' | DatabaseToolProgress['status']

const splitSelection = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export function DatabaseToolsDialog({ profile, open, onOpenChange }: DatabaseToolsDialogProps) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<DatabaseToolMode>('backup')
  const [format, setFormat] = useState<DatabaseBackupFormat>('custom')
  const [filePath, setFilePath] = useState('')
  const [schemas, setSchemas] = useState('')
  const [tables, setTables] = useState('')
  const [clean, setClean] = useState(false)
  const [verbose, setVerbose] = useState(true)
  const [customArgs, setCustomArgs] = useState('')
  const [preview, setPreview] = useState('')
  const [previewSignature, setPreviewSignature] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState<JobStatus>('idle')
  const [isPreviewing, setIsPreviewing] = useState(false)
  const activeJob = useRef<{
    id: string
    mode: DatabaseToolMode
    connectionId: string
  } | null>(null)
  const mounted = useRef(true)

  const supportsSelection = mode === 'backup' || format !== 'plain'
  const supportsClean =
    (mode === 'backup' && format === 'plain') || (mode === 'restore' && format !== 'plain')
  const isRunning = status === 'running'

  const request = useMemo<DatabaseToolRequest>(
    () => ({
      connectionId: profile.id,
      mode,
      format,
      filePath,
      schemas: supportsSelection ? splitSelection(schemas) : undefined,
      tables: supportsSelection ? splitSelection(tables) : undefined,
      clean: supportsClean ? clean : false,
      verbose,
      customArgs: customArgs.trim() || undefined
    }),
    [
      clean,
      customArgs,
      filePath,
      format,
      mode,
      profile.id,
      schemas,
      supportsClean,
      supportsSelection,
      tables,
      verbose
    ]
  )
  const requestSignature = JSON.stringify(request)
  const hasCurrentPreview = preview.length > 0 && previewSignature === requestSignature

  useEffect(() => {
    mounted.current = true
    const unsubscribe = dbdeskClient.onDatabaseToolProgress((progress) => {
      const job = activeJob.current
      if (progress.jobId !== job?.id) return
      setLogs((current) => [...current, progress.message].slice(-300))
      setStatus(progress.status)

      if (progress.status !== 'running') {
        activeJob.current = null
        if (progress.status === 'completed' && job.mode === 'restore') {
          useSqlWorkspaceStore.setState({ schemasWithTables: [], tableColumns: {} })
          void queryClient.invalidateQueries({
            predicate: ({ queryKey }) =>
              queryKey[1] === job.connectionId &&
              [
                'schemas',
                'schemasWithTables',
                'tables',
                'table-introspection',
                'table-data'
              ].includes(String(queryKey[0]))
          })
        }
        if (progress.status === 'completed') toast.success(progress.message)
        if (progress.status === 'failed') toast.error(progress.message)
      }
    })

    return () => {
      mounted.current = false
      unsubscribe()
      const jobId = activeJob.current?.id
      if (jobId) void dbdeskClient.cancelDatabaseTool(jobId)
    }
  }, [profile.id, queryClient])

  const handleChoosePath = async () => {
    try {
      const result = await dbdeskClient.chooseDatabaseToolPath(profile.id, mode, format)
      if (result.filePath) setFilePath(result.filePath)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not choose a file')
    }
  }

  const handlePreview = async () => {
    if (!filePath) return
    setIsPreviewing(true)
    try {
      const result = await dbdeskClient.previewDatabaseTool(request)
      setPreview(result.command)
      setPreviewSignature(requestSignature)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not build command')
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleStart = async () => {
    if (!hasCurrentPreview || isRunning) return
    if (
      mode === 'restore' &&
      !window.confirm(
        `Restore ${filePath} into ${profile.options.database}? Existing data may change.`
      )
    ) {
      return
    }

    const jobId = crypto.randomUUID()
    activeJob.current = { id: jobId, mode, connectionId: profile.id }
    setLogs([])
    setStatus('running')
    try {
      await dbdeskClient.startDatabaseTool(request, jobId)
      if (!mounted.current) await dbdeskClient.cancelDatabaseTool(jobId)
    } catch (error) {
      if (activeJob.current?.id === jobId) activeJob.current = null
      if (mounted.current) {
        setStatus('failed')
        toast.error(error instanceof Error ? error.message : `Could not start ${mode}`)
      }
    }
  }

  const handleCancel = async () => {
    const jobId = activeJob.current?.id
    if (!jobId) return
    const result = await dbdeskClient.cancelDatabaseTool(jobId)
    if (!result.cancelled) toast.error('Could not cancel the operation')
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (
      !nextOpen &&
      isRunning &&
      !window.confirm('Close this dialog? The operation will keep running.')
    ) {
      return
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>PostgreSQL backup and restore</DialogTitle>
          <DialogDescription>
            Runs your installed PostgreSQL client tools. Passwords are never included in commands or
            logs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="database-tool-mode">Operation</Label>
            <Select
              value={mode}
              disabled={isRunning}
              onValueChange={(value: DatabaseToolMode) => {
                setMode(value)
                setFilePath('')
              }}
            >
              <SelectTrigger id="database-tool-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backup">Backup</SelectItem>
                <SelectItem value="restore">Restore</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="database-tool-format">Format</Label>
            <Select
              value={format}
              disabled={isRunning}
              onValueChange={(value: DatabaseBackupFormat) => {
                setFormat(value)
                setFilePath('')
              }}
            >
              <SelectTrigger id="database-tool-format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom archive (.dump)</SelectItem>
                <SelectItem value="plain">Plain SQL (.sql)</SelectItem>
                <SelectItem value="tar">Tar archive (.tar)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="database-tool-file">
            {mode === 'backup' ? 'Destination' : 'Backup file'}
          </Label>
          <div className="flex gap-2">
            <Input
              id="database-tool-file"
              value={filePath}
              readOnly
              placeholder="No file selected"
            />
            <Button
              variant="secondary"
              disabled={isRunning}
              onClick={() => void handleChoosePath()}
            >
              Choose…
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="database-tool-schemas">Schemas</Label>
            <Input
              id="database-tool-schemas"
              value={schemas}
              disabled={!supportsSelection || isRunning}
              onChange={(event) => setSchemas(event.target.value)}
              placeholder="public, reporting"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="database-tool-tables">Tables</Label>
            <Input
              id="database-tool-tables"
              value={tables}
              disabled={!supportsSelection || isRunning}
              onChange={(event) => setTables(event.target.value)}
              placeholder="users, audit_*"
            />
          </div>
        </div>
        {!supportsSelection ? (
          <p className="text-xs text-muted-foreground">
            Plain SQL restores run the complete script; object selection requires an archive format.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-5">
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox
              checked={clean && supportsClean}
              disabled={!supportsClean || isRunning}
              onCheckedChange={(checked) => setClean(checked === true)}
            />
            Drop matching objects first
          </Label>
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox
              checked={verbose}
              disabled={isRunning}
              onCheckedChange={(checked) => setVerbose(checked === true)}
            />
            Verbose logs
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="database-tool-args">Additional arguments</Label>
          <Input
            id="database-tool-args"
            value={customArgs}
            disabled={isRunning}
            onChange={(event) => setCustomArgs(event.target.value)}
            placeholder="--no-owner --no-acl"
          />
          <p className="text-xs text-muted-foreground">
            Quoted arguments are supported and no shell is used.
          </p>
        </div>

        {preview ? (
          <div className="space-y-2">
            <Label>Command preview</Label>
            <code
              className={cn(
                'block max-h-28 overflow-auto rounded-md bg-muted p-3 text-xs',
                'whitespace-pre-wrap break-all'
              )}
            >
              {preview}
            </code>
            {!hasCurrentPreview ? (
              <p className="text-xs text-amber-600">
                Options changed. Refresh the preview before running.
              </p>
            ) : null}
          </div>
        ) : null}

        {logs.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Progress</Label>
              <span className="text-xs capitalize text-muted-foreground">{status}</span>
            </div>
            <pre
              aria-live="polite"
              className={cn(
                'max-h-48 overflow-auto rounded-md bg-zinc-950 p-3 text-xs',
                'whitespace-pre-wrap text-zinc-100'
              )}
            >
              {logs.join('\n')}
            </pre>
          </div>
        ) : null}

        <DialogFooter>
          {isRunning ? (
            <Button variant="destructive" onClick={() => void handleCancel()}>
              Cancel
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                disabled={!filePath || isPreviewing}
                onClick={() => void handlePreview()}
              >
                {isPreviewing ? <Loader2 className="animate-spin" /> : null}
                Preview
              </Button>
              <Button disabled={!hasCurrentPreview} onClick={() => void handleStart()}>
                {mode === 'backup' ? 'Start backup' : 'Start restore'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
