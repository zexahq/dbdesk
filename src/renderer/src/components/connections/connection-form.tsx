import { useMemo } from 'react'
import { useForm } from '@tanstack/react-form'
import * as z from 'zod'
import type { ConnectionProfile, DatabaseType, DBConnectionOptions } from '@common/types'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  Field as UIField,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@renderer/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Separator } from '@renderer/components/ui/separator'
import { useCreateConnection } from '@renderer/api/queries/connections'
import { Checkbox } from '@renderer/components/ui/checkbox'

const sqlTypes: DatabaseType[] = ['postgres', 'mysql']

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['postgres', 'mysql', 'mongodb', 'redis'] as [DatabaseType, ...DatabaseType[]]),
  host: z.string().min(1, 'Host is required'),
  port: z.number().min(1, 'Port must be a number').max(65535, 'Port must be a number'),
  database: z.string().min(1, 'Database is required'),
  user: z.string().min(1, 'User is required'),
  password: z.string(),
  ssl: z.boolean()
})

type FormValues = z.infer<typeof schema>

function toDefaults(connection?: ConnectionProfile | null): FormValues {
  if (!connection) {
    return {
      name: '',
      type: 'postgres',
      host: '',
      port: 5432,
      database: '',
      user: '',
      password: '',
      ssl: false
    }
  }

  const opts = connection.options as Partial<{
    host: string
    port: number
    database: string
    user: string
    ssl: boolean
  }>

  const defaultPort = connection.type === 'mysql' ? 3306 : 5432

  return {
    name: connection.name,
    type: connection.type,
    host: opts.host ?? '',
    port: typeof opts.port === 'number' && Number.isFinite(opts.port) ? opts.port : defaultPort,
    database: opts.database ?? '',
    user: opts.user ?? '',
    password: '',
    ssl: Boolean(opts.ssl)
  }
}

export interface ConnectionFormProps {
  connection?: ConnectionProfile | null
  onSuccess?: (profile: ConnectionProfile) => void
}

export function ConnectionForm({ connection, onSuccess }: ConnectionFormProps) {
  const createMutation = useCreateConnection()

  const defaults = useMemo(() => toDefaults(connection), [connection])

  const form = useForm({
    defaultValues: defaults,
    validators: {
      onSubmit: schema
    },
    onSubmit: async ({ value }) => {
      const { name, type, host, port, database, user, password, ssl } = value

      if (!sqlTypes.includes(type)) {
        throw new Error('Only SQL adapters are supported in this form for now')
      }

      const options: DBConnectionOptions = {
        host,
        port,
        database,
        user,
        password: password ?? '',
        ssl
      }

      const profile = await createMutation.mutateAsync({
        name,
        type,
        options
      })
      onSuccess?.(profile)
    }
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-col gap-5"
      id="connection-form"
    >
      <FieldGroup>
        <form.Field
          name="name"
          children={(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <UIField data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={invalid}
                  placeholder="Production Postgres"
                  autoComplete="off"
                />
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </UIField>
            )
          }}
        />

        <form.Field
          name="type"
          children={(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <UIField data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>Type</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v as DatabaseType)}
                >
                  <SelectTrigger aria-invalid={invalid}>
                    <SelectValue placeholder="Select database type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgres">PostgreSQL</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription>MongoDB and Redis forms will be added later.</FieldDescription>
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </UIField>
            )
          }}
        />
      </FieldGroup>

      <Separator />

      <FieldGroup>
        <form.Field
          name="host"
          children={(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <UIField data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>Host</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={invalid}
                  placeholder="localhost"
                  autoComplete="off"
                />
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </UIField>
            )
          }}
        />

        <form.Field
          name="port"
          children={(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <UIField data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>Port</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  inputMode="numeric"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  aria-invalid={invalid}
                  placeholder="5432"
                  autoComplete="off"
                />
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </UIField>
            )
          }}
        />
      </FieldGroup>

      <FieldGroup>
        <form.Field
          name="database"
          children={(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <UIField data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>Database</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={invalid}
                  placeholder="app_db"
                  autoComplete="off"
                />
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </UIField>
            )
          }}
        />

        <form.Field
          name="user"
          children={(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <UIField data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>User</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={invalid}
                  placeholder="postgres"
                  autoComplete="off"
                />
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </UIField>
            )
          }}
        />
      </FieldGroup>

      <FieldGroup>
        <form.Field
          name="password"
          children={(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <UIField data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={invalid}
                  placeholder="••••••••"
                  autoComplete="off"
                />
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </UIField>
            )
          }}
        />

        <form.Field
          name="ssl"
          children={(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <UIField data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>SSL</FieldLabel>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={field.name}
                    checked={field.state.value}
                    onCheckedChange={(v) => field.handleChange(Boolean(v))}
                    aria-invalid={invalid}
                  />
                  <label htmlFor={field.name} className="text-sm text-muted-foreground select-none">
                    Enable SSL
                  </label>
                </div>
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </UIField>
            )
          }}
        />
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="reset" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Saving…' : 'Save Connection'}
        </Button>
      </div>
    </form>
  )
}
