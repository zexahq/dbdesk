import type { QueryResult, QueryResultRow } from '@dbdesk/shared/types'
import { Badge } from '@renderer/components/ui/badge'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import {
  ACTIVITY_SQL,
  DUPLICATE_INDEXES_SQL,
  GRANTS_SQL,
  INDEX_HEALTH_SQL,
  MEMBERSHIPS_SQL,
  POLICIES_SQL,
  ROLES_SQL,
  STAT_STATEMENTS_AVAILABLE_SQL,
  TABLE_HEALTH_SQL,
  buildAdminSql,
  buildTopQueriesSql,
  type PolicyCommand
} from '@renderer/features/sql-workspace/lib/postgres-admin'
import { dbdeskClient } from '@renderer/shared/api/client'
import { toast } from '@renderer/shared/lib/toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, DatabaseZap, RefreshCw, ShieldCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'

type AdminTab = 'activity' | 'access' | 'health'

const isPolicyCommand = (value: unknown): value is PolicyCommand =>
  value === 'ALL' ||
  value === 'SELECT' ||
  value === 'INSERT' ||
  value === 'UPDATE' ||
  value === 'DELETE'

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function ResultTable({
  result,
  loading,
  error,
  actions,
  truncatedAt
}: {
  result?: QueryResult
  loading?: boolean
  error?: unknown
  actions?: (row: QueryResultRow) => ReactNode
  truncatedAt?: number
}) {
  if (loading) return <p className="p-4 text-sm text-muted-foreground">Loading…</p>
  if (error)
    return (
      <p className="p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : 'Unable to load PostgreSQL metadata.'}
      </p>
    )
  if (!result?.rows.length)
    return <p className="p-4 text-sm text-muted-foreground">No rows found.</p>

  return (
    <div className="rounded-md border">
      {truncatedAt && result.rows.length >= truncatedAt ? (
        <p className="border-b bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Showing the first {truncatedAt.toLocaleString()} rows. Narrow the database privileges if
          more detail is required.
        </p>
      ) : null}
      <div className="max-h-72 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              {result.columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
              {actions ? <TableHead>Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((row, index) => (
              <TableRow key={String(row['pid'] ?? row['index_name'] ?? index)}>
                {result.columns.map((column) => (
                  <TableCell
                    key={column}
                    className="max-w-80 truncate"
                    title={formatValue(row[column])}
                  >
                    {formatValue(row[column])}
                  </TableCell>
                ))}
                {actions ? <TableCell>{actions(row)}</TableCell> : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function ActivityPanel({
  connectionId,
  reviewSql
}: {
  connectionId: string
  reviewSql: (sql: string, description: string) => void
}) {
  const activity = useQuery({
    queryKey: ['postgres-admin', connectionId, 'activity'],
    queryFn: () => dbdeskClient.runQuery(connectionId, ACTIVITY_SQL, { limit: 500 }),
    refetchInterval: 5_000
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Active sessions, wait events, and blocked/blocking relationships. Refreshes every 5s.
        </p>
        <Button variant="outline" size="sm" onClick={() => void activity.refetch()}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </div>
      <ResultTable
        result={activity.data}
        loading={activity.isLoading}
        error={activity.error}
        actions={(row) => {
          const pid = Number(row['pid'])
          const active = row['state'] === 'active'
          return (
            <div className="flex gap-1">
              {active ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    reviewSql(
                      buildAdminSql({ kind: 'backend', operation: 'cancel', pid }),
                      `Cancel backend ${pid}`
                    )
                  }
                >
                  Cancel
                </Button>
              ) : null}
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  reviewSql(
                    buildAdminSql({ kind: 'backend', operation: 'terminate', pid }),
                    `Terminate backend ${pid}`
                  )
                }
              >
                Terminate
              </Button>
            </div>
          )
        }}
      />
    </div>
  )
}

type AccessAction =
  | 'create-role'
  | 'alter-role'
  | 'drop-role'
  | 'grant-role'
  | 'revoke-role'
  | 'grant-table'
  | 'revoke-table'
  | 'set-rls'
  | 'create-policy'
  | 'alter-policy'
  | 'drop-policy'

function AccessSqlBuilder({
  reviewSql,
  policies
}: {
  reviewSql: (sql: string, description: string) => void
  policies?: QueryResult
}) {
  const [action, setAction] = useState<AccessAction>('create-role')
  const [role, setRole] = useState('')
  const [member, setMember] = useState('')
  const [schema, setSchema] = useState('public')
  const [table, setTable] = useState('')
  const [privilege, setPrivilege] = useState<'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL'>(
    'SELECT'
  )
  const [login, setLogin] = useState(false)
  const [roleAttribute, setRoleAttribute] = useState<'LOGIN' | 'CREATEDB' | 'CREATEROLE'>('LOGIN')
  const [attributeEnabled, setAttributeEnabled] = useState(true)
  const [rlsMode, setRlsMode] = useState<'ENABLE' | 'DISABLE' | 'FORCE' | 'NO FORCE'>('ENABLE')
  const [policyName, setPolicyName] = useState('')
  const [policyCommand, setPolicyCommand] = useState<PolicyCommand>('ALL')
  const [selectedPolicyKey, setSelectedPolicyKey] = useState('')
  const [policyUsing, setPolicyUsing] = useState('')
  const [policyCheck, setPolicyCheck] = useState('')

  const policyOptions = (policies?.rows ?? []).flatMap((row) => {
    const name = row['policyname']
    const policySchema = row['schemaname']
    const policyTable = row['tablename']
    const command = row['cmd']
    if (
      typeof name !== 'string' ||
      typeof policySchema !== 'string' ||
      typeof policyTable !== 'string' ||
      !isPolicyCommand(command)
    ) {
      return []
    }

    return [
      {
        key: JSON.stringify([policySchema, policyTable, name]),
        name,
        schema: policySchema,
        table: policyTable,
        command
      }
    ]
  })
  const selectedPolicy = policyOptions.find((policy) => policy.key === selectedPolicyKey)
  const clauseCommand = action === 'alter-policy' ? selectedPolicy?.command : policyCommand

  const generate = () => {
    try {
      const sql = (() => {
        switch (action) {
          case 'create-role':
            return buildAdminSql({ kind: action, role, login })
          case 'alter-role':
            return buildAdminSql({
              kind: action,
              role,
              attribute: roleAttribute,
              enabled: attributeEnabled
            })
          case 'drop-role':
            return buildAdminSql({ kind: action, role })
          case 'grant-role':
          case 'revoke-role':
            return buildAdminSql({ kind: action, role, member })
          case 'grant-table':
          case 'revoke-table':
            return buildAdminSql({ kind: action, role, schema, table, privilege })
          case 'set-rls':
            return buildAdminSql({ kind: action, schema, table, mode: rlsMode })
          case 'create-policy':
            return buildAdminSql({
              kind: action,
              name: policyName,
              schema,
              table,
              command: policyCommand,
              role,
              using: policyUsing,
              check: policyCheck
            })
          case 'alter-policy':
            if (!selectedPolicy) throw new Error('Select an inspected policy')
            return buildAdminSql({
              kind: action,
              name: selectedPolicy.name,
              schema: selectedPolicy.schema,
              table: selectedPolicy.table,
              command: selectedPolicy.command,
              role,
              using: policyUsing,
              check: policyCheck
            })
          case 'drop-policy':
            return buildAdminSql({ kind: action, name: policyName, schema, table })
        }
      })()
      reviewSql(sql, 'Apply role, grant, or row-level security change')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid SQL inputs')
    }
  }

  return (
    <div className="grid gap-3 rounded-md border p-3 md:grid-cols-5">
      <div className="space-y-1">
        <Label>Change</Label>
        <Select value={action} onValueChange={(value) => setAction(value as AccessAction)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="create-role">Create role</SelectItem>
            <SelectItem value="alter-role">Alter role</SelectItem>
            <SelectItem value="drop-role">Drop role</SelectItem>
            <SelectItem value="grant-role">Grant membership</SelectItem>
            <SelectItem value="revoke-role">Revoke membership</SelectItem>
            <SelectItem value="grant-table">Grant table privilege</SelectItem>
            <SelectItem value="revoke-table">Revoke table privilege</SelectItem>
            <SelectItem value="set-rls">Set RLS mode</SelectItem>
            <SelectItem value="create-policy">Create RLS policy</SelectItem>
            <SelectItem value="alter-policy">Alter RLS policy</SelectItem>
            <SelectItem value="drop-policy">Drop RLS policy</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {[
        'create-role',
        'alter-role',
        'drop-role',
        'grant-role',
        'revoke-role',
        'grant-table',
        'revoke-table',
        'create-policy',
        'alter-policy'
      ].includes(action) ? (
        <div className="space-y-1">
          <Label htmlFor="admin-role">Role</Label>
          <Input id="admin-role" value={role} onChange={(event) => setRole(event.target.value)} />
        </div>
      ) : null}
      {action === 'grant-role' || action === 'revoke-role' ? (
        <div className="space-y-1">
          <Label htmlFor="admin-member">Member</Label>
          <Input
            id="admin-member"
            value={member}
            onChange={(event) => setMember(event.target.value)}
          />
        </div>
      ) : null}
      {['grant-table', 'revoke-table', 'set-rls', 'create-policy', 'drop-policy'].includes(
        action
      ) ? (
        <>
          <div className="space-y-1">
            <Label htmlFor="admin-schema">Schema</Label>
            <Input
              id="admin-schema"
              value={schema}
              onChange={(event) => setSchema(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="admin-table">Table</Label>
            <Input
              id="admin-table"
              value={table}
              onChange={(event) => setTable(event.target.value)}
            />
          </div>
        </>
      ) : null}
      {action === 'grant-table' || action === 'revoke-table' ? (
        <div className="space-y-1">
          <Label>Privilege</Label>
          <Select
            value={privilege}
            onValueChange={(value) => setPrivilege(value as typeof privilege)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {action === 'create-role' ? (
        <div className="flex items-end gap-3 pb-2">
          <label className="flex gap-2 text-sm">
            <Checkbox checked={login} onCheckedChange={(checked) => setLogin(checked === true)} />
            Login
          </label>
        </div>
      ) : null}
      {action === 'alter-role' ? (
        <>
          <div className="space-y-1">
            <Label>Attribute</Label>
            <Select
              value={roleAttribute}
              onValueChange={(value) => setRoleAttribute(value as typeof roleAttribute)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="CREATEDB">Create database</SelectItem>
                <SelectItem value="CREATEROLE">Create role</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <Checkbox
              checked={attributeEnabled}
              onCheckedChange={(checked) => setAttributeEnabled(checked === true)}
            />
            Enabled
          </label>
        </>
      ) : null}
      {action === 'set-rls' ? (
        <div className="space-y-1">
          <Label>RLS mode</Label>
          <Select value={rlsMode} onValueChange={(value) => setRlsMode(value as typeof rlsMode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['ENABLE', 'DISABLE', 'FORCE', 'NO FORCE'].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {action === 'create-policy' || action === 'drop-policy' ? (
        <div className="space-y-1">
          <Label htmlFor="admin-policy">Policy</Label>
          <Input
            id="admin-policy"
            value={policyName}
            onChange={(event) => setPolicyName(event.target.value)}
          />
        </div>
      ) : null}
      {action === 'alter-policy' ? (
        <div className="space-y-1">
          <Label>Inspected policy</Label>
          <Select
            value={selectedPolicyKey}
            onValueChange={(value) => {
              setSelectedPolicyKey(value)
              const policy = policyOptions.find((option) => option.key === value)
              if (policy?.command === 'INSERT') setPolicyUsing('')
              if (policy?.command === 'SELECT' || policy?.command === 'DELETE') setPolicyCheck('')
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a policy" />
            </SelectTrigger>
            <SelectContent>
              {policyOptions.map((policy) => (
                <SelectItem key={policy.key} value={policy.key}>
                  {policy.schema}.{policy.table} — {policy.name} ({policy.command})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {action === 'create-policy' || action === 'alter-policy' ? (
        <>
          {action === 'create-policy' ? (
            <div className="space-y-1">
              <Label>Command</Label>
              <Select
                value={policyCommand}
                onValueChange={(value) => {
                  const command = value as typeof policyCommand
                  setPolicyCommand(command)
                  if (command === 'INSERT') setPolicyUsing('')
                  if (command === 'SELECT' || command === 'DELETE') setPolicyCheck('')
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['ALL', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {clauseCommand && clauseCommand !== 'INSERT' ? (
            <div className="space-y-1">
              <Label htmlFor="admin-policy-using">USING expression</Label>
              <Input
                id="admin-policy-using"
                value={policyUsing}
                onChange={(event) => setPolicyUsing(event.target.value)}
              />
            </div>
          ) : null}
          {clauseCommand && clauseCommand !== 'SELECT' && clauseCommand !== 'DELETE' ? (
            <div className="space-y-1">
              <Label htmlFor="admin-policy-check">WITH CHECK expression</Label>
              <Input
                id="admin-policy-check"
                value={policyCheck}
                onChange={(event) => setPolicyCheck(event.target.value)}
              />
            </div>
          ) : null}
        </>
      ) : null}
      <div className="flex items-end">
        <Button onClick={generate}>Review SQL</Button>
      </div>
    </div>
  )
}

function AccessPanel({
  connectionId,
  reviewSql
}: {
  connectionId: string
  reviewSql: (sql: string, description: string) => void
}) {
  const roles = useQuery({
    queryKey: ['postgres-admin', connectionId, 'access', 'roles'],
    queryFn: () => dbdeskClient.runQuery(connectionId, ROLES_SQL, { limit: 500 })
  })
  const memberships = useQuery({
    queryKey: ['postgres-admin', connectionId, 'access', 'memberships'],
    queryFn: () => dbdeskClient.runQuery(connectionId, MEMBERSHIPS_SQL, { limit: 500 })
  })
  const grants = useQuery({
    queryKey: ['postgres-admin', connectionId, 'access', 'grants'],
    queryFn: () => dbdeskClient.runQuery(connectionId, GRANTS_SQL, { limit: 5_000 })
  })
  const policies = useQuery({
    queryKey: ['postgres-admin', connectionId, 'access', 'policies'],
    queryFn: () => dbdeskClient.runQuery(connectionId, POLICIES_SQL, { limit: 500 })
  })

  return (
    <div className="space-y-5">
      <AccessSqlBuilder reviewSql={reviewSql} policies={policies.data} />
      <Section title="Roles">
        <ResultTable result={roles.data} loading={roles.isLoading} error={roles.error} />
      </Section>
      <Section title="Memberships">
        <ResultTable
          result={memberships.data}
          loading={memberships.isLoading}
          error={memberships.error}
        />
      </Section>
      <Section title="Object grants">
        <ResultTable
          result={grants.data}
          loading={grants.isLoading}
          error={grants.error}
          truncatedAt={5_000}
        />
      </Section>
      <Section title="Row-level security policies">
        <ResultTable result={policies.data} loading={policies.isLoading} error={policies.error} />
      </Section>
    </div>
  )
}

function HealthPanel({
  connectionId,
  reviewSql
}: {
  connectionId: string
  reviewSql: (sql: string, description: string) => void
}) {
  const queryClient = useQueryClient()
  const tables = useQuery({
    queryKey: ['postgres-admin', connectionId, 'health', 'tables'],
    queryFn: () => dbdeskClient.runQuery(connectionId, TABLE_HEALTH_SQL, { limit: 500 })
  })
  const indexes = useQuery({
    queryKey: ['postgres-admin', connectionId, 'health', 'indexes'],
    queryFn: () => dbdeskClient.runQuery(connectionId, INDEX_HEALTH_SQL, { limit: 500 })
  })
  const duplicates = useQuery({
    queryKey: ['postgres-admin', connectionId, 'health', 'duplicates'],
    queryFn: () => dbdeskClient.runQuery(connectionId, DUPLICATE_INDEXES_SQL, { limit: 500 })
  })
  const extension = useQuery({
    queryKey: ['postgres-admin', connectionId, 'health', 'stat-statements-extension'],
    queryFn: () => dbdeskClient.runQuery(connectionId, STAT_STATEMENTS_AVAILABLE_SQL, { limit: 1 })
  })
  const extensionSchemaValue = extension.data?.rows[0]?.['schema_name']
  const extensionSchema =
    typeof extensionSchemaValue === 'string' ? extensionSchemaValue : undefined
  const statements = useQuery({
    queryKey: ['postgres-admin', connectionId, 'health', 'statements', extensionSchema],
    queryFn: () => {
      if (!extensionSchema) throw new Error('pg_stat_statements is unavailable')
      return dbdeskClient.runQuery(connectionId, buildTopQueriesSql(extensionSchema), { limit: 50 })
    },
    enabled: extensionSchema !== undefined
  })

  const maintenanceActions = (row: QueryResultRow) => {
    const schema = String(row['schemaname'])
    const table = String(row['table_name'])
    return (
      <div className="flex gap-1">
        {(['VACUUM (ANALYZE)', 'ANALYZE', 'REINDEX TABLE'] as const).map((operation) => (
          <Button
            key={operation}
            variant="outline"
            size="sm"
            onClick={() =>
              reviewSql(
                buildAdminSql({ kind: 'maintenance', operation, schema, table }),
                `${operation} ${schema}.${table}`
              )
            }
          >
            {operation}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            void queryClient.invalidateQueries({
              queryKey: ['postgres-admin', connectionId, 'health']
            })
          }
        >
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </div>
      <Section title="Table health and size">
        <ResultTable
          result={tables.data}
          loading={tables.isLoading}
          error={tables.error}
          actions={maintenanceActions}
        />
      </Section>
      <Section title="Index sizes and usage">
        <ResultTable result={indexes.data} loading={indexes.isLoading} error={indexes.error} />
      </Section>
      <Section title="Potential duplicate indexes">
        <ResultTable
          result={duplicates.data}
          loading={duplicates.isLoading}
          error={duplicates.error}
        />
      </Section>
      <Section title="Top queries by total execution time">
        {extension.isLoading ? (
          <ResultTable loading />
        ) : extension.error ? (
          <ResultTable error={extension.error} />
        ) : !extensionSchema ? (
          <p className="rounded-md border p-3 text-sm text-muted-foreground">
            Install and preload <code>pg_stat_statements</code> to see top queries.
          </p>
        ) : (
          <ResultTable
            result={statements.data}
            loading={statements.isLoading}
            error={statements.error}
          />
        )}
      </Section>
    </div>
  )
}

export default function PostgresAdminDialog({
  connectionId,
  connectionName,
  production,
  readOnly,
  open,
  onOpenChange
}: {
  connectionId: string
  connectionName: string
  production: boolean
  readOnly: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [tab, setTab] = useState<AdminTab>('activity')
  const [pending, setPending] = useState<{ sql: string; description: string } | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const queryClient = useQueryClient()
  const execute = useMutation({
    mutationFn: (sql: string) => dbdeskClient.runQuery(connectionId, sql),
    onSuccess: async (result) => {
      if (Object.values(result.rows[0] ?? {})[0] === false) {
        toast.error('PostgreSQL reported that the requested action was not applied')
        return
      }
      toast.success('PostgreSQL command completed')
      setPending(null)
      await queryClient.invalidateQueries({ queryKey: ['postgres-admin', connectionId] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Command failed')
  })

  const reviewSql = (sql: string, description: string) => {
    if (readOnly) {
      toast.error('This connection is configured as read-only')
      return
    }
    setConfirmation('')
    setPending({ sql, description })
  }
  const canExecute = !readOnly && (!production || confirmation === connectionName)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[85vh] max-w-[calc(100%-3rem)] flex-col overflow-hidden sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>PostgreSQL administration</DialogTitle>
            <DialogDescription>
              Monitor activity, inspect access controls, and review maintenance SQL before
              execution.
            </DialogDescription>
          </DialogHeader>
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as AdminTab)}
            className="min-h-0 flex-1"
          >
            <TabsList>
              <TabsTrigger value="activity">
                <Activity /> Activity & locks
              </TabsTrigger>
              <TabsTrigger value="access">
                <ShieldCheck /> Roles & access
              </TabsTrigger>
              <TabsTrigger value="health">
                <DatabaseZap /> Health
              </TabsTrigger>
            </TabsList>
            <div className="min-h-0 flex-1 overflow-auto pr-1">
              <TabsContent value="activity">
                {tab === 'activity' ? (
                  <ActivityPanel connectionId={connectionId} reviewSql={reviewSql} />
                ) : null}
              </TabsContent>
              <TabsContent value="access">
                {tab === 'access' ? (
                  <AccessPanel connectionId={connectionId} reviewSql={reviewSql} />
                ) : null}
              </TabsContent>
              <TabsContent value="health">
                {tab === 'health' ? (
                  <HealthPanel connectionId={connectionId} reviewSql={reviewSql} />
                ) : null}
              </TabsContent>
            </div>
          </Tabs>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Privileges apply</Badge>
            Cancel, terminate, access, and maintenance commands may require elevated PostgreSQL
            privileges.
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pending)} onOpenChange={(next) => !next && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review SQL before execution</DialogTitle>
            <DialogDescription>{pending?.description}</DialogDescription>
          </DialogHeader>
          <pre className="max-h-56 overflow-auto rounded-md border bg-muted p-3 text-xs whitespace-pre-wrap">
            {pending?.sql}
          </pre>
          {production ? (
            <div className="space-y-2">
              <Label htmlFor="admin-production-confirmation">
                Production connection: type <strong>{connectionName}</strong> to continue.
              </Label>
              <Input
                id="admin-production-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!pending || execute.isPending || !canExecute}
              onClick={() => pending && execute.mutate(pending.sql)}
            >
              {execute.isPending ? 'Executing…' : 'Execute reviewed SQL'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
