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

const baseSchema = z.object({
  name: z.string().min(1, 'Name is required')
})

const sqlSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.number().min(1, 'Port must be a number').max(65535, 'Port must be a number'),
  database: z.string().min(1, 'Database is required'),
  user: z.string().min(1, 'User is required'),
  password: z.string(),
  sslMode: z.enum(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']).optional()
})

type SQLFormValues = z.infer<typeof sqlSchema>

function toDefaults(connection?: ConnectionProfile | null): {
  name: string
  sqlValues?: SQLFormValues
} {
  if (!connection) {
    return {
      name: ''
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
    sqlValues: {
      host: opts.host ?? '',
      port: typeof opts.port === 'number' && Number.isFinite(opts.port) ? opts.port : 5432,
      database: opts.database ?? '',
      user: opts.user ?? '',
      password: opts.password ?? '',
      sslMode: opts.sslMode ?? 'disable'
    }
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

  const [sqlFormValues, setSqlFormValues] = useState<SQLFormValues>(
    defaults.sqlValues || {
      host: '',
      port: 5432,
      database: '',
      user: '',
      password: '',
      sslMode: 'disable'
    }
  )

  const [showPassword, setShowPassword] = useState(false)

  const form = useForm({
    defaultValues: {
      name: defaults.name
    },
    validators: {
      onSubmit: baseSchema
    },
    onSubmit: async ({ value }) => {
      const { name } = value

      const { host, port, database, user, password, sslMode } = sqlFormValues

      // When updating, if password is empty, preserve the original password
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

  // Update connection name when database name changes
  const handleDatabaseChange = (database: string) => {
    if (!connection && database) {
      form.setFieldValue('name', database)
    }
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
          <PostgresQuickConnect
            onSuccess={(values) => {
              form.setFieldValue('name', values.name)
              setSqlFormValues({
                host: values.host,
                port: values.port,
                database: values.database,
                user: values.user,
                password: values.password || '',
                sslMode: values.sslMode as PostgreSQLSslMode | undefined
              })
            }}
          />
          <Separator />
        </>
      )}

      <FieldGroup>
        <form.Field
          name="name"
          children={(field) => {
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
        />
      </FieldGroup>

      <Separator />

      <FieldGroup className="grid grid-cols-2 gap-4">
        <UIField>
          <FieldLabel htmlFor="host">Host</FieldLabel>
          <Input
            id="host"
            value={sqlFormValues.host}
            onChange={(e) => {
              setSqlFormValues((prev) => ({
                ...prev,
                host: e.target.value
              }))
            }}
            placeholder="localhost"
            autoComplete="off"
          />
        </UIField>

        <UIField>
          <FieldLabel htmlFor="port">Port</FieldLabel>
          <Input
            id="port"
            type="number"
            inputMode="numeric"
            value={sqlFormValues.port}
            onChange={(e) => {
              setSqlFormValues((prev) => ({
                ...prev,
                port: Number(e.target.value)
              }))
            }}
            placeholder="5432"
            autoComplete="off"
          />
        </UIField>
      </FieldGroup>

      <FieldGroup className="grid grid-cols-2 gap-4">
        <UIField>
          <FieldLabel htmlFor="database">Database</FieldLabel>
          <Input
            id="database"
            value={sqlFormValues.database}
            onChange={(e) => {
              const database = e.target.value
              setSqlFormValues((prev) => ({
                ...prev,
                database
              }))
              handleDatabaseChange(database)
            }}
            placeholder="app_db"
            autoComplete="off"
          />
        </UIField>

        <UIField>
          <FieldLabel htmlFor="user">User</FieldLabel>
          <Input
            id="user"
            value={sqlFormValues.user}
            onChange={(e) => {
              setSqlFormValues((prev) => ({
                ...prev,
                user: e.target.value
              }))
            }}
            placeholder="postgres"
            autoComplete="off"
          />
        </UIField>
      </FieldGroup>

      <FieldGroup className="grid grid-cols-2 gap-4">
        <UIField>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={sqlFormValues.password}
              onChange={(e) => {
                setSqlFormValues((prev) => ({
                  ...prev,
                  password: e.target.value
                }))
              }}
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
        </UIField>

        <UIField>
          <FieldLabel htmlFor="sslMode">SSL Mode</FieldLabel>
          <Select
            value={sqlFormValues.sslMode ?? 'prefer'}
            onValueChange={(value) => {
              setSqlFormValues((prev) => ({
                ...prev,
                sslMode: value as PostgreSQLSslMode
              }))
            }}
          >
            <SelectTrigger id="sslMode">
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
        </UIField>
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
