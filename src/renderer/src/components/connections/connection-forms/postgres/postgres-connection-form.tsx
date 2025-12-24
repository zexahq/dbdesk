import type { ConnectionProfile, DBConnectionOptions } from '@common/types'
import type { PostgreSQLSslMode } from '@common/types/sql'
import { useCreateConnection, useUpdateConnection } from '@renderer/api/queries/connections'
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

const SSL_MODE_OPTIONS: PostgreSQLSslMode[] = ['disable', 'allow', 'prefer', 'require']

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  host: z.string().min(1, 'Host is required'),
  port: z.number().min(1, 'Port must be at least 1').max(65535, 'Port must be at most 65535'),
  database: z.string().min(1, 'Database is required'),
  user: z.string().min(1, 'User is required'),
  password: z.string(),
  sslMode: z.enum(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'])
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
      sslMode: 'disable'
    }
  }

  const opts = connection.options as Partial<{
    host: string
    port: number
    database: string
    user: string
    password: string
    sslMode: PostgreSQLSslMode
  }>

  return {
    name: connection.name,
    host: opts.host ?? '',
    port: typeof opts.port === 'number' && Number.isFinite(opts.port) ? opts.port : 5432,
    database: opts.database ?? '',
    user: opts.user ?? '',
    password: opts.password ?? '',
    sslMode: opts.sslMode ?? 'disable'
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
      const { name, host, port, database, user, password, sslMode } = value

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
        sslMode
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
