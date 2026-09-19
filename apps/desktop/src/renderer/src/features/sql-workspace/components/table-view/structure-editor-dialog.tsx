import { POSTGRES_DATA_TYPES } from '@dbdesk/shared/constants'
import type { ReferentialAction, StructureOperation } from '@common/adapters/structure'
import { buildStructureSql, isStructureExecutionConfirmed } from '@common/adapters/structure'
import type { TableInfo } from '@dbdesk/shared/types'
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
import { refreshTableIntrospection } from '@renderer/features/sql-workspace/queries/schema'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'
import { dbdeskClient } from '@renderer/shared/api/client'
import { queryClient } from '@renderer/shared/lib/query-client'
import { toast } from '@renderer/shared/lib/toast'
import { cleanErrorMessage } from '@renderer/shared/lib/utils'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'

type OperationKind = StructureOperation['kind']

export interface StructureEditorRequest {
  kind: OperationKind
  target?: string
  dataType?: string
  usingExpression?: string
  nullable?: boolean
  defaultValue?: string
}

interface StructureEditorDialogProps {
  connectionId: string
  connectionName: string
  production: boolean
  schema: string
  table: string
  structure: TableInfo
  request: StructureEditorRequest
  onClose: () => void
}

const operationLabels: Record<OperationKind, string> = {
  'add-column': 'Add column',
  'rename-column': 'Rename column',
  'change-column-type': 'Change column type',
  'set-column-nullability': 'Change column nullability',
  'set-column-default': 'Change column default',
  'drop-column': 'Drop column',
  'add-constraint': 'Add constraint',
  'drop-constraint': 'Drop constraint',
  'add-index': 'Add index',
  'drop-index': 'Drop index'
}

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

const splitIdentifiers = (value: string) =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

type ConstraintType = 'primary-key' | 'unique' | 'foreign-key' | 'check'

type StructureFormValues = {
  kind: OperationKind
  target: string
  name: string
  dataType: string
  usingExpression: string
  nullable: boolean
  defaultValue: string
  dropDefault: boolean
  constraintType: ConstraintType
  columns: string
  referencedSchema: string
  referencedTable: string
  referencedColumns: string
  checkExpression: string
  onDelete: ReferentialAction
  onUpdate: ReferentialAction
  unique: boolean
  productionConfirmation: string
}

const buildOperation = (values: StructureFormValues): StructureOperation => {
  switch (values.kind) {
    case 'add-column':
      return {
        kind: values.kind,
        name: values.name,
        dataType: values.dataType,
        nullable: values.nullable,
        defaultValue: values.defaultValue || undefined
      }
    case 'rename-column':
      return { kind: values.kind, column: values.target, newName: values.name }
    case 'change-column-type':
      return {
        kind: values.kind,
        column: values.target,
        dataType: values.dataType,
        usingExpression: values.usingExpression || undefined
      }
    case 'set-column-nullability':
      return { kind: values.kind, column: values.target, nullable: values.nullable }
    case 'set-column-default':
      return {
        kind: values.kind,
        column: values.target,
        defaultValue: values.dropDefault ? undefined : values.defaultValue
      }
    case 'drop-column':
      return { kind: values.kind, column: values.target }
    case 'add-constraint':
      return {
        kind: values.kind,
        name: values.name,
        constraintType: values.constraintType,
        columns: splitIdentifiers(values.columns),
        referencedSchema: values.referencedSchema,
        referencedTable: values.referencedTable,
        referencedColumns: splitIdentifiers(values.referencedColumns),
        checkExpression: values.checkExpression,
        onDelete: values.onDelete,
        onUpdate: values.onUpdate
      }
    case 'drop-constraint':
      return { kind: values.kind, name: values.target }
    case 'add-index':
      return {
        kind: values.kind,
        name: values.name,
        columns: splitIdentifiers(values.columns),
        unique: values.unique
      }
    case 'drop-index':
      return { kind: values.kind, name: values.target }
  }
}

export function StructureEditorDialog({
  connectionId,
  connectionName,
  production,
  schema,
  table,
  structure,
  request,
  onClose
}: StructureEditorDialogProps) {
  const [sql, setSql] = useState<string>()
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  const form = useForm({
    defaultValues: {
      kind: request.kind,
      target: request.target ?? structure.columns[0]?.name ?? '',
      name: '',
      dataType: request.dataType ?? '',
      usingExpression: request.usingExpression ?? '',
      nullable: request.nullable ?? true,
      defaultValue: request.defaultValue ?? '',
      dropDefault: request.defaultValue == null,
      constraintType: 'primary-key' as ConstraintType,
      columns: request.target ?? '',
      referencedSchema: schema,
      referencedTable: '',
      referencedColumns: '',
      checkExpression: '',
      onDelete: 'NO ACTION' as ReferentialAction,
      onUpdate: 'NO ACTION' as ReferentialAction,
      unique: false,
      productionConfirmation: ''
    },
    validators: {
      onSubmit: ({ value }) => {
        try {
          buildStructureSql({ schema, table, operation: buildOperation(value) })
          return undefined
        } catch (cause) {
          return cause instanceof Error ? cause.message : 'Invalid structure change'
        }
      }
    },
    onSubmitInvalid: ({ formApi }) => {
      const validationError = formApi.state.errors[0]
      setError(typeof validationError === 'string' ? validationError : 'Invalid structure change')
    },
    onSubmit: ({ value }) => {
      setSql(buildStructureSql({ schema, table, operation: buildOperation(value) }))
      form.setFieldValue('productionConfirmation', '')
      setError(undefined)
    }
  })

  const changeKind = (nextKind: OperationKind) => {
    form.setFieldValue('kind', nextKind)
    setError(undefined)
    if (nextKind === 'drop-constraint') {
      form.setFieldValue('target', structure.constraints?.[0]?.name ?? '')
    } else if (nextKind === 'drop-index') {
      form.setFieldValue('target', structure.indexes?.[0]?.name ?? '')
    } else {
      form.setFieldValue('target', structure.columns[0]?.name ?? '')
    }
  }

  const execute = async () => {
    if (!sql) return
    if (
      !isStructureExecutionConfirmed(
        production,
        connectionName,
        form.state.values.productionConfirmation
      )
    ) {
      setError(`Type ${connectionName} exactly to confirm this production change`)
      return
    }
    setIsPending(true)
    try {
      await dbdeskClient.runQuery(connectionId, sql)
      const refreshTableInfo = refreshTableIntrospection(connectionId, schema, table)
      const [tableInfo] = await Promise.all([
        refreshTableInfo,
        queryClient.invalidateQueries({
          queryKey: ['table-introspection', connectionId, schema, table]
        }),
        queryClient.invalidateQueries({ queryKey: ['table-data', connectionId, schema, table] }),
        queryClient.invalidateQueries({ queryKey: ['schemasWithTables', connectionId] })
      ])
      const workspace = useSqlWorkspaceStore.getState()
      if (workspace.currentConnectionId === connectionId) {
        workspace.setTableColumns(schema, table, tableInfo.columns)
      }
      toast.success('Table structure updated')
      onClose()
    } catch (cause) {
      setError(
        cleanErrorMessage(cause instanceof Error ? cause.message : 'Structure update failed')
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Edit {schema}.{table}
          </DialogTitle>
          <DialogDescription>
            Configure one change, review its generated PostgreSQL, then execute it.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          {sql ? (
            <div className="space-y-3">
              <Label>SQL to execute</Label>
              <pre className="max-h-72 overflow-auto rounded-md border bg-muted/40 p-4 text-sm whitespace-pre-wrap">
                {sql}
              </pre>
              <p className="text-sm text-muted-foreground">
                Review this statement carefully. PostgreSQL will apply it immediately.
              </p>
              {production ? (
                <form.Field name="productionConfirmation">
                  {(field) => (
                    <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                      <Label htmlFor={field.name}>
                        Production connection. Type <strong>{connectionName}</strong> to confirm.
                      </Label>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                  )}
                </form.Field>
              ) : null}
            </div>
          ) : (
            <form.Subscribe
              selector={(state) =>
                [
                  state.values.kind,
                  state.values.target,
                  state.values.dataType,
                  state.values.dropDefault,
                  state.values.constraintType
                ] as const
              }
            >
              {([kind, target, dataType, dropDefault, constraintType]) => (
                <div className="space-y-4">
                  <form.Field name="kind">
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor={field.name}>Operation</Label>
                        <select
                          id={field.name}
                          className={selectClassName}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => changeKind(event.target.value as OperationKind)}
                        >
                          {Object.entries(operationLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </form.Field>

                  {kind !== 'add-column' &&
                  kind !== 'add-constraint' &&
                  kind !== 'add-index' &&
                  kind !== 'drop-constraint' &&
                  kind !== 'drop-index' ? (
                    <form.Field name="target">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Column</Label>
                          <select
                            id={field.name}
                            className={selectClassName}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                          >
                            {structure.columns.map((column) => (
                              <option key={column.name} value={column.name}>
                                {column.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </form.Field>
                  ) : null}

                  {kind === 'drop-constraint' ? (
                    <form.Field name="target">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Constraint</Label>
                          <select
                            id={field.name}
                            className={selectClassName}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                          >
                            {(structure.constraints ?? []).map((constraint) => (
                              <option key={constraint.name}>{constraint.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </form.Field>
                  ) : null}

                  {kind === 'drop-index' ? (
                    <form.Field name="target">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Index</Label>
                          <select
                            id={field.name}
                            className={selectClassName}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                          >
                            {(structure.indexes ?? []).map((index) => (
                              <option key={index.name}>{index.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </form.Field>
                  ) : null}

                  {kind === 'add-column' ||
                  kind === 'rename-column' ||
                  kind === 'add-constraint' ||
                  kind === 'add-index' ? (
                    <form.Field name="name">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>
                            {kind === 'rename-column' ? 'New column name' : 'Name'}
                          </Label>
                          <Input
                            id={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            autoFocus
                          />
                        </div>
                      )}
                    </form.Field>
                  ) : null}

                  {kind === 'add-column' || kind === 'change-column-type' ? (
                    <form.Field name="dataType">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Data type</Label>
                          <Input
                            id={field.name}
                            list="postgres-data-types"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            placeholder="text or numeric(10, 2)"
                          />
                          <datalist id="postgres-data-types">
                            {POSTGRES_DATA_TYPES.map((type) => (
                              <option key={type.value} value={type.value} />
                            ))}
                          </datalist>
                        </div>
                      )}
                    </form.Field>
                  ) : null}

                  {kind === 'change-column-type' ? (
                    <form.Field name="usingExpression">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>USING expression (optional)</Label>
                          <Input
                            id={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            placeholder={`"${target}"::${dataType || 'new_type'}`}
                          />
                        </div>
                      )}
                    </form.Field>
                  ) : null}

                  {kind === 'add-column' ? (
                    <form.Field name="defaultValue">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Default expression (optional)</Label>
                          <Input
                            id={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            placeholder="now() or 0"
                          />
                        </div>
                      )}
                    </form.Field>
                  ) : null}

                  {kind === 'add-column' || kind === 'set-column-nullability' ? (
                    <form.Field name="nullable">
                      {(field) => (
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={field.state.value}
                            onCheckedChange={(value) => field.handleChange(value === true)}
                          />
                          Allow NULL values
                        </label>
                      )}
                    </form.Field>
                  ) : null}

                  {kind === 'set-column-default' ? (
                    <>
                      <form.Field name="dropDefault">
                        {(field) => (
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={field.state.value}
                              onCheckedChange={(value) => field.handleChange(value === true)}
                            />
                            Drop the current default
                          </label>
                        )}
                      </form.Field>
                      {dropDefault ? null : (
                        <form.Field name="defaultValue">
                          {(field) => (
                            <div className="space-y-2">
                              <Label htmlFor={field.name}>Default expression</Label>
                              <Input
                                id={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                                placeholder="now() or 0"
                              />
                            </div>
                          )}
                        </form.Field>
                      )}
                    </>
                  ) : null}

                  {kind === 'add-constraint' ? (
                    <>
                      <form.Field name="constraintType">
                        {(field) => (
                          <div className="space-y-2">
                            <Label htmlFor={field.name}>Constraint type</Label>
                            <select
                              id={field.name}
                              className={selectClassName}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(event) =>
                                field.handleChange(event.target.value as ConstraintType)
                              }
                            >
                              <option value="primary-key">Primary key</option>
                              <option value="unique">Unique</option>
                              <option value="foreign-key">Foreign key</option>
                              <option value="check">Check</option>
                            </select>
                          </div>
                        )}
                      </form.Field>
                      {constraintType === 'check' ? (
                        <form.Field name="checkExpression">
                          {(field) => (
                            <div className="space-y-2">
                              <Label htmlFor={field.name}>Check expression</Label>
                              <Input
                                id={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                                placeholder="total >= 0"
                              />
                            </div>
                          )}
                        </form.Field>
                      ) : (
                        <form.Field name="columns">
                          {(field) => (
                            <div className="space-y-2">
                              <Label htmlFor={field.name}>Columns (comma separated)</Label>
                              <Input
                                id={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                                placeholder="tenant_id, customer_id"
                              />
                            </div>
                          )}
                        </form.Field>
                      )}
                      {constraintType === 'foreign-key' ? (
                        <>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <form.Field name="referencedSchema">
                              {(field) => (
                                <div className="space-y-2">
                                  <Label htmlFor={field.name}>Referenced schema</Label>
                                  <Input
                                    id={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                  />
                                </div>
                              )}
                            </form.Field>
                            <form.Field name="referencedTable">
                              {(field) => (
                                <div className="space-y-2">
                                  <Label htmlFor={field.name}>Referenced table</Label>
                                  <Input
                                    id={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                  />
                                </div>
                              )}
                            </form.Field>
                          </div>
                          <form.Field name="referencedColumns">
                            {(field) => (
                              <div className="space-y-2">
                                <Label htmlFor={field.name}>
                                  Referenced columns (comma separated)
                                </Label>
                                <Input
                                  id={field.name}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(event) => field.handleChange(event.target.value)}
                                />
                              </div>
                            )}
                          </form.Field>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <form.Field name="onDelete">
                              {(field) => (
                                <div className="space-y-2">
                                  <Label htmlFor={field.name}>On delete</Label>
                                  <select
                                    id={field.name}
                                    className={selectClassName}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) =>
                                      field.handleChange(event.target.value as ReferentialAction)
                                    }
                                  >
                                    {[
                                      'NO ACTION',
                                      'RESTRICT',
                                      'CASCADE',
                                      'SET NULL',
                                      'SET DEFAULT'
                                    ].map((action) => (
                                      <option key={action}>{action}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </form.Field>
                            <form.Field name="onUpdate">
                              {(field) => (
                                <div className="space-y-2">
                                  <Label htmlFor={field.name}>On update</Label>
                                  <select
                                    id={field.name}
                                    className={selectClassName}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) =>
                                      field.handleChange(event.target.value as ReferentialAction)
                                    }
                                  >
                                    {[
                                      'NO ACTION',
                                      'RESTRICT',
                                      'CASCADE',
                                      'SET NULL',
                                      'SET DEFAULT'
                                    ].map((action) => (
                                      <option key={action}>{action}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </form.Field>
                          </div>
                        </>
                      ) : null}
                    </>
                  ) : null}

                  {kind === 'add-index' ? (
                    <>
                      <form.Field name="columns">
                        {(field) => (
                          <div className="space-y-2">
                            <Label htmlFor={field.name}>Columns (comma separated)</Label>
                            <Input
                              id={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(event) => field.handleChange(event.target.value)}
                            />
                          </div>
                        )}
                      </form.Field>
                      <form.Field name="unique">
                        {(field) => (
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={field.state.value}
                              onCheckedChange={(value) => field.handleChange(value === true)}
                            />
                            Unique index
                          </label>
                        )}
                      </form.Field>
                    </>
                  ) : null}

                  {kind === 'drop-column' || kind === 'drop-constraint' || kind === 'drop-index' ? (
                    <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                      This is a destructive operation. PostgreSQL dependencies may prevent it.
                    </p>
                  ) : null}
                </div>
              )}
            </form.Subscribe>
          )}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={
                sql
                  ? () => {
                      setSql(undefined)
                      form.setFieldValue('productionConfirmation', '')
                    }
                  : onClose
              }
              disabled={isPending}
            >
              {sql ? 'Back' : 'Cancel'}
            </Button>
            {sql ? (
              <form.Subscribe selector={(state) => state.values.productionConfirmation}>
                {(productionConfirmation) => (
                  <Button
                    type="button"
                    onClick={execute}
                    disabled={
                      isPending ||
                      !isStructureExecutionConfirmed(
                        production,
                        connectionName,
                        productionConfirmation
                      )
                    }
                  >
                    {isPending ? 'Executing…' : 'Execute reviewed SQL'}
                  </Button>
                )}
              </form.Subscribe>
            ) : (
              <Button type="submit">Review SQL</Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
