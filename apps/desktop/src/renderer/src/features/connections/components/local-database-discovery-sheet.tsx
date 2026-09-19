import type { ConnectionProfile } from '@dbdesk/shared/types'
import {
  getLocalDatabaseKey,
  isLocalDatabaseHost
} from '@dbdesk/shared/utils/local-database-discovery'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@renderer/components/ui/sheet'
import {
  useCreateConnection,
  useDiscoverLocalDatabases
} from '@renderer/features/connections/queries/connections'
import { toast } from '@renderer/shared/lib/toast'
import { useForm } from '@tanstack/react-form'
import { Database, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

interface LocalDatabaseDiscoverySheetProps {
  connections: ConnectionProfile[]
}

export function LocalDatabaseDiscoverySheet({ connections }: LocalDatabaseDiscoverySheetProps) {
  const [open, setOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const discoverLocal = useDiscoverLocalDatabases()
  const createConnection = useCreateConnection()

  const existingKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const profile of connections) {
      if (profile.type !== 'postgres' || !isLocalDatabaseHost(profile.options.host)) continue
      keys.add(getLocalDatabaseKey(profile.options))
    }
    return keys
  }, [connections])

  const scan = (port: number) => {
    discoverLocal.reset()
    form.setFieldValue('selectedKeys', [])
    discoverLocal.mutate({ port })
  }

  const form = useForm({
    defaultValues: { port: 5432, selectedKeys: [] as string[] },
    validators: {
      onSubmit: ({ value }) =>
        Number.isInteger(value.port) && value.port >= 1 && value.port <= 65535
          ? undefined
          : 'Enter a port between 1 and 65535'
    },
    onSubmitInvalid: ({ formApi }) => {
      const error = formApi.state.errors[0]
      toast.error(typeof error === 'string' ? error : 'Enter a valid PostgreSQL port')
    },
    onSubmit: ({ value }) => scan(value.port)
  })

  const discovered = discoverLocal.data ?? []
  const available = discovered.filter(
    ({ options }) => !existingKeys.has(getLocalDatabaseKey(options))
  )

  const importSelected = async (selectedKeys: string[]) => {
    const selected = available.filter(({ options }) =>
      selectedKeys.includes(getLocalDatabaseKey(options))
    )
    if (!selected.length) return

    setIsImporting(true)
    try {
      const results = await Promise.allSettled(
        selected.map(({ name, options }) =>
          createConnection.mutateAsync({
            name,
            type: 'postgres',
            options: {
              ...options,
              group: 'Local',
              color: '#22c55e',
              environment: 'development'
            }
          })
        )
      )
      const imported = results.filter((result) => result.status === 'fulfilled').length
      const failed = results.length - imported

      if (imported) {
        toast.success(`Imported ${imported} local database${imported === 1 ? '' : 's'}`)
      }
      if (failed) toast.error(`${failed} database import${failed === 1 ? '' : 's'} failed`)
      if (!failed) setOpen(false)
      form.setFieldValue('selectedKeys', [])
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          onClick={() => scan(form.state.values.port)}
          disabled={discoverLocal.isPending}
        >
          <Search className="size-4" />
          Discover Local
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Discover local PostgreSQL databases</SheetTitle>
          <SheetDescription>
            Scan one local PostgreSQL port, then choose which databases to import.
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex items-end gap-2 border-b p-4"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <form.Field name="port">
            {(field) => (
              <div className="flex-1 space-y-2">
                <Label htmlFor={field.name}>PostgreSQL port</Label>
                <Input
                  id={field.name}
                  type="number"
                  min={1}
                  max={65535}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.valueAsNumber)}
                />
              </div>
            )}
          </form.Field>
          <Button type="submit" disabled={discoverLocal.isPending}>
            {discoverLocal.isPending ? 'Scanning…' : 'Scan'}
          </Button>
        </form>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 p-4">
            {discoverLocal.isPending ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Looking for PostgreSQL databases…
              </p>
            ) : discoverLocal.error ? (
              <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {discoverLocal.error instanceof Error
                  ? discoverLocal.error.message
                  : 'Local discovery failed'}
              </p>
            ) : discovered.length ? (
              <form.Subscribe selector={(state) => state.values.selectedKeys}>
                {(selectedKeys) => (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {discovered.length} database{discovered.length === 1 ? '' : 's'} found
                      </p>
                      {available.length ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            form.setFieldValue(
                              'selectedKeys',
                              selectedKeys.length === available.length
                                ? []
                                : available.map(({ options }) => getLocalDatabaseKey(options))
                            )
                          }
                        >
                          {selectedKeys.length === available.length ? 'Clear all' : 'Select all'}
                        </Button>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      {discovered.map(({ name, options }) => {
                        const key = getLocalDatabaseKey(options)
                        const exists = existingKeys.has(key)
                        const checked = selectedKeys.includes(key)
                        return (
                          <label
                            key={key}
                            className="flex cursor-pointer items-center gap-3 rounded-md border p-3 has-disabled:cursor-default has-disabled:opacity-60"
                          >
                            <Checkbox
                              checked={checked}
                              disabled={exists}
                              onCheckedChange={(value) =>
                                form.setFieldValue(
                                  'selectedKeys',
                                  value === true
                                    ? [...selectedKeys, key]
                                    : selectedKeys.filter((selectedKey) => selectedKey !== key)
                                )
                              }
                              aria-label={`Select ${name}`}
                            />
                            <Database className="size-4 text-muted-foreground" aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{name}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {options.host}:{options.port} · {options.user}
                              </span>
                            </span>
                            {exists ? <Badge variant="secondary">Already added</Badge> : null}
                          </label>
                        )
                      })}
                    </div>
                  </>
                )}
              </form.Subscribe>
            ) : discoverLocal.isIdle ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Scan the default port or enter another PostgreSQL port.
              </p>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No databases found on this port. PostgreSQL may require credentials; add it manually
                if needed.
              </p>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="flex-row items-center justify-end border-t">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form.Subscribe selector={(state) => state.values.selectedKeys}>
            {(selectedKeys) => (
              <Button
                type="button"
                disabled={!selectedKeys.length || isImporting}
                onClick={() => void importSelected(selectedKeys)}
              >
                {isImporting ? 'Importing…' : `Import selected (${selectedKeys.length})`}
              </Button>
            )}
          </form.Subscribe>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
