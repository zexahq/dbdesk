import type {
  ConnectionEnvironment,
  ConnectionProfile,
  DBConnectionOptions,
  PostgreSQLSslMode,
  SQLConnectionOptions
} from '@dbdesk/shared/types'
import {
  useCreateConnection,
  useUpdateConnection
} from '@renderer/features/connections/queries/connections'
import { Button } from '@renderer/components/ui/button'
import { FieldError, FieldGroup, FieldLabel, Field as UIField } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Separator } from '@renderer/components/ui/separator'
import { useForm } from '@tanstack/react-form'
import { Eye, EyeOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import * as z from 'zod'
import { PostgresQuickConnect } from './postgres-quick-connect'

const SSL_MODE_OPTIONS: PostgreSQLSslMode[] = [
  'disable',
  'allow',
  'prefer',
  'require',
  'verify-ca',
  'verify-full'
]
const ENVIRONMENT_OPTIONS: ConnectionEnvironment[] = ['development', 'staging', 'production']

const formSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    host: z.string().min(1, 'Host is required'),
    port: z.number().min(1, 'Port must be at least 1').max(65535, 'Port must be at most 65535'),
    database: z.string().min(1, 'Database is required'),
    user: z.string().min(1, 'User is required'),
    password: z.string(),
    sslMode: z.enum(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']),
    sslRootCertPath: z.string(),
    sslClientCertPath: z.string(),
    sslClientKeyPath: z.string(),
    environment: z.enum(['development', 'staging', 'production']),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    group: z.string(),
    tags: z.string(),
    readOnly: z.boolean(),
    statementTimeoutMs: z.number().int().min(0).max(86_400_000),
    sshEnabled: z.boolean(),
    sshHost: z.string(),
    sshPort: z.number().int().min(1).max(65535),
    sshUser: z.string(),
    sshIdentityFile: z.string()
  })
  .superRefine((value, context) => {
    if (value.sshEnabled && !value.sshHost.trim()) {
      context.addIssue({ code: 'custom', path: ['sshHost'], message: 'SSH host is required' })
    }
    if (value.sshEnabled && !value.sshUser.trim()) {
      context.addIssue({ code: 'custom', path: ['sshUser'], message: 'SSH user is required' })
    }
  })

type FormValues = z.infer<typeof formSchema>

function toDefaults(connection?: ConnectionProfile | null): FormValues {
  if (!connection) {
    return {
      name: '',
      host: '',
      port: 5432,
      database: '',
      user: '',
      password: '',
      sslMode: 'disable',
      sslRootCertPath: '',
      sslClientCertPath: '',
      sslClientKeyPath: '',
      environment: 'development',
      color: '#64748b',
      group: '',
      tags: '',
      readOnly: false,
      statementTimeoutMs: 30_000,
      sshEnabled: false,
      sshHost: '',
      sshPort: 22,
      sshUser: '',
      sshIdentityFile: ''
    }
  }

  const opts = connection.options as Partial<SQLConnectionOptions>

  return {
    name: connection.name,
    host: opts.host ?? '',
    port: typeof opts.port === 'number' && Number.isFinite(opts.port) ? opts.port : 5432,
    database: opts.database ?? '',
    user: opts.user ?? '',
    password: opts.password ?? '',
    sslMode: opts.sslMode ?? 'disable',
    sslRootCertPath: opts.sslRootCertPath ?? '',
    sslClientCertPath: opts.sslClientCertPath ?? '',
    sslClientKeyPath: opts.sslClientKeyPath ?? '',
    environment: opts.environment ?? 'development',
    color: opts.color ?? '#64748b',
    group: opts.group ?? '',
    tags: opts.tags?.join(', ') ?? '',
    readOnly: opts.readOnly ?? false,
    statementTimeoutMs: opts.statementTimeoutMs ?? 30_000,
    sshEnabled: opts.sshTunnel?.enabled ?? false,
    sshHost: opts.sshTunnel?.host ?? '',
    sshPort: opts.sshTunnel?.port ?? 22,
    sshUser: opts.sshTunnel?.user ?? '',
    sshIdentityFile: opts.sshTunnel?.identityFile ?? ''
  }
}

export interface PostgresConnectionFormProps {
  connection?: ConnectionProfile | null
  onSuccess: (profile: ConnectionProfile) => void
}

export function PostgresConnectionForm({ connection, onSuccess }: PostgresConnectionFormProps) {
  const createMutation = useCreateConnection()
  const updateMutation = useUpdateConnection()

  const defaults = useMemo(() => toDefaults(connection), [connection])

  const [showPassword, setShowPassword] = useState(false)

  const form = useForm({
    defaultValues: defaults,
    validators: {
      onSubmit: formSchema
    },
    onSubmit: async ({ value }) => {
      const {
        name,
        host,
        port,
        database,
        user,
        password,
        sslMode,
        sslRootCertPath,
        sslClientCertPath,
        sslClientKeyPath,
        environment,
        color,
        group,
        tags,
        readOnly,
        statementTimeoutMs,
        sshEnabled,
        sshHost,
        sshPort,
        sshUser,
        sshIdentityFile
      } = value

      let finalPassword = password ?? ''
      if (connection && !finalPassword) {
        const originalOptions = connection.options as { password?: string }
        finalPassword = originalOptions.password ?? ''
      }

      const options: DBConnectionOptions = {
        host,
        port,
        database,
        user,
        password: finalPassword,
        sslMode,
        sslRootCertPath: sslRootCertPath.trim() || undefined,
        sslClientCertPath: sslClientCertPath.trim() || undefined,
        sslClientKeyPath: sslClientKeyPath.trim() || undefined,
        environment,
        color,
        group: group.trim() || undefined,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        readOnly,
        statementTimeoutMs: statementTimeoutMs || undefined,
        sshTunnel: sshEnabled
          ? {
              enabled: true,
              host: sshHost.trim(),
              port: sshPort,
              user: sshUser.trim(),
              identityFile: sshIdentityFile.trim() || undefined
            }
          : undefined
      }

      let profile: ConnectionProfile
      if (connection) {
        profile = await updateMutation.mutateAsync({
          connectionId: connection.id,
          name,
          type: 'postgres',
          options
        })
      } else {
        profile = await createMutation.mutateAsync({
          name,
          type: 'postgres',
          options
        })
      }

      onSuccess(profile)
    }
  })

  const handleQuickConnect = (values: {
    name: string
    host: string
    port: number
    database: string
    user: string
    password?: string
    sslMode?: string
  }) => {
    form.setFieldValue('name', values.name)
    form.setFieldValue('host', values.host)
    form.setFieldValue('port', values.port)
    form.setFieldValue('database', values.database)
    form.setFieldValue('user', values.user)
    form.setFieldValue('password', values.password || '')
    form.setFieldValue('sslMode', (values.sslMode as PostgreSQLSslMode) || 'disable')
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-col gap-5"
      id="postgres-connection-form"
    >
      {!connection && (
        <>
          <PostgresQuickConnect onSuccess={handleQuickConnect} />
          <Separator />
        </>
      )}

      <FieldGroup>
        <form.Field name="name">
          {(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <UIField data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>Connection Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={invalid}
                  placeholder="My Connection"
                  autoComplete="off"
                />
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </UIField>
            )
          }}
        </form.Field>
      </FieldGroup>

      <Separator />

      <FieldGroup className="grid grid-cols-2 gap-4">
        <form.Field name="host">
          {(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <UIField data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>Host</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="localhost"
                  autoComplete="off"
                />
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </UIField>
            )
          }}
        </form.Field>

        <form.Field name="port">
          {(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <UIField data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>Port</FieldLabel>
                <Input
                  id={field.name}
                  type="number"
                  inputMode="numeric"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  placeholder="5432"
                  autoComplete="off"
                />
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </UIField>
            )
          }}
        </form.Field>
      </FieldGroup>

      <FieldGroup className="grid grid-cols-2 gap-4">
        <form.Field name="database">
          {(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <UIField data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>Database</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    const database = e.target.value
                    field.handleChange(database)
                    if (!connection && database) {
                      form.setFieldValue('name', database)
                    }
                  }}
                  placeholder="app_db"
                  autoComplete="off"
                />
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </UIField>
            )
          }}
        </form.Field>

        <form.Field name="user">
          {(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <UIField data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>User</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="postgres"
                  autoComplete="off"
                />
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </UIField>
            )
          }}
        </form.Field>
      </FieldGroup>

      <FieldGroup className="grid grid-cols-2 gap-4">
        <form.Field name="password">
          {(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <UIField data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                <div className="relative">
                  <Input
                    id={field.name}
                    type={showPassword ? 'text' : 'password'}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="off"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </UIField>
            )
          }}
        </form.Field>

        <form.Field name="sslMode">
          {(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <UIField data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>SSL Mode</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v as typeof field.state.value)}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SSL_MODE_OPTIONS.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </UIField>
            )
          }}
        </form.Field>
      </FieldGroup>

      <details open className="rounded-md border p-4">
        <summary className="cursor-pointer font-medium">Safety and organization</summary>
        <FieldGroup className="mt-4 grid grid-cols-2 gap-4">
          <form.Field name="environment">
            {(field) => (
              <UIField>
                <FieldLabel htmlFor={field.name}>Environment</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as ConnectionEnvironment)}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENT_OPTIONS.map((environment) => (
                      <SelectItem key={environment} value={environment}>
                        {environment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </UIField>
            )}
          </form.Field>
          <form.Field name="color">
            {(field) => (
              <UIField>
                <FieldLabel htmlFor={field.name}>Color</FieldLabel>
                <Input
                  id={field.name}
                  type="color"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  className="h-9 p-1"
                />
              </UIField>
            )}
          </form.Field>
          <form.Field name="group">
            {(field) => (
              <UIField>
                <FieldLabel htmlFor={field.name}>Group</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Work"
                />
              </UIField>
            )}
          </form.Field>
          <form.Field name="tags">
            {(field) => (
              <UIField>
                <FieldLabel htmlFor={field.name}>Tags</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="billing, primary"
                />
              </UIField>
            )}
          </form.Field>
          <form.Field name="statementTimeoutMs">
            {(field) => (
              <UIField>
                <FieldLabel htmlFor={field.name}>Statement timeout (ms)</FieldLabel>
                <Input
                  id={field.name}
                  type="number"
                  min={0}
                  max={86_400_000}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(Number(event.target.value))}
                />
              </UIField>
            )}
          </form.Field>
          <form.Field name="readOnly">
            {(field) => (
              <UIField className="justify-end">
                <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.state.value}
                    onChange={(event) => field.handleChange(event.target.checked)}
                  />
                  Enforce read-only in PostgreSQL
                </label>
              </UIField>
            )}
          </form.Field>
        </FieldGroup>
      </details>

      <details className="rounded-md border p-4">
        <summary className="cursor-pointer font-medium">TLS certificates</summary>
        <FieldGroup className="mt-4 gap-4">
          <form.Field name="sslRootCertPath">
            {(field) => (
              <UIField>
                <FieldLabel htmlFor={field.name}>Root CA path</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="/path/to/root.crt"
                />
              </UIField>
            )}
          </form.Field>
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="sslClientCertPath">
              {(field) => (
                <UIField>
                  <FieldLabel htmlFor={field.name}>Client certificate path</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="/path/to/client.crt"
                  />
                </UIField>
              )}
            </form.Field>
            <form.Field name="sslClientKeyPath">
              {(field) => (
                <UIField>
                  <FieldLabel htmlFor={field.name}>Client key path</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="/path/to/client.key"
                  />
                </UIField>
              )}
            </form.Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Private key passphrases are intentionally not stored. Use an unlocked key or your OS key
            agent.
          </p>
        </FieldGroup>
      </details>

      <details className="rounded-md border p-4">
        <summary className="cursor-pointer font-medium">SSH tunnel</summary>
        <FieldGroup className="mt-4 gap-4">
          <form.Field name="sshEnabled">
            {(field) => (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={field.state.value}
                  onChange={(event) => field.handleChange(event.target.checked)}
                />
                Connect through OpenSSH
              </label>
            )}
          </form.Field>
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="sshHost">
              {(field) => {
                const invalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <UIField data-invalid={invalid}>
                    <FieldLabel htmlFor={field.name}>SSH host or config alias</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="bastion"
                    />
                    {invalid && <FieldError errors={field.state.meta.errors} />}
                  </UIField>
                )
              }}
            </form.Field>
            <form.Field name="sshPort">
              {(field) => (
                <UIField>
                  <FieldLabel htmlFor={field.name}>SSH port</FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={1}
                    max={65535}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(Number(event.target.value))}
                  />
                </UIField>
              )}
            </form.Field>
            <form.Field name="sshUser">
              {(field) => {
                const invalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <UIField data-invalid={invalid}>
                    <FieldLabel htmlFor={field.name}>SSH user</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="deploy"
                    />
                    {invalid && <FieldError errors={field.state.meta.errors} />}
                  </UIField>
                )
              }}
            </form.Field>
            <form.Field name="sshIdentityFile">
              {(field) => (
                <UIField>
                  <FieldLabel htmlFor={field.name}>Private key path (optional)</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="~/.ssh/id_ed25519"
                  />
                </UIField>
              )}
            </form.Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Uses your OpenSSH config and agent. Password prompts and stored passphrases are not
            supported.
          </p>
        </FieldGroup>
      </details>

      <div className="flex justify-end gap-2">
        <Button type="reset" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending
            ? 'Saving…'
            : connection
              ? 'Update Connection'
              : 'Save Connection'}
        </Button>
      </div>
    </form>
  )
}
