import { useTableIntrospection } from '@renderer/api/queries/schema'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import { Separator } from '@renderer/components/ui/separator'

interface SqlStructureProps {
  connectionId: string
  schema: string
  table: string
}

export const SqlStructure = ({ connectionId, schema, table }: SqlStructureProps) => {
  const {
    data: structureInfo,
    isLoading: isLoadingTableInfo,
    error
  } = useTableIntrospection(connectionId, schema, table)

  if (isLoadingTableInfo) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Loading structure info...</p>
        </div>
      </div>
    )
  }

  if (!structureInfo || error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Structure not found</p>
        </div>
      </div>
    )
  }

  const formatDefaultValue = (value: unknown) => {
    if (value === null || value === undefined) {
      return '—'
    }

    if (typeof value === 'string') {
      return value
    }

    if (typeof value === 'boolean' || typeof value === 'number') {
      return String(value)
    }

    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  const normalizeColumnList = (value: unknown): string[] => {
    // Accept already-correct string arrays
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string')
    }
    // Handle Postgres array string format: "{col1,col2}" or "{id}"
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const inner = trimmed.slice(1, -1)
        if (inner.length === 0) return []
        return inner
          .split(',')
          .map((part) => part.trim())
          .map((part) => part.replace(/^"(.*)"$/, '$1')) // remove surrounding quotes if present
          .filter(Boolean)
      }
      // Fallback to single value
      return [trimmed]
    }
    return []
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">{structureInfo.name}</CardTitle>
            <CardDescription>
              Schema <Badge variant="secondary">{structureInfo.schema}</Badge>
            </CardDescription>
          </div>
          <CardAction>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{structureInfo.columns.length} columns</span>
              <Separator orientation="vertical" className="h-4" />
              <span>{structureInfo.indexes?.length ?? 0} indexes</span>
              <Separator orientation="vertical" className="h-4" />
              <span>{structureInfo.constraints?.length ?? 0} constraints</span>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Table name</p>
            <p className="font-medium">{structureInfo.name}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Schema</p>
            <p className="font-medium">{structureInfo.schema}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Columns</p>
            <p className="font-medium">{structureInfo.columns.length}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-lg">Columns</CardTitle>
            <CardDescription>{structureInfo.columns.length} columns defined</CardDescription>
          </div>
          <CardAction>
            <Button size="sm" variant="outline" disabled>
              Add column
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 py-6">
          {structureInfo.columns.map((column) => (
            <div
              key={column.name}
              className="flex flex-col gap-3 rounded-lg border bg-muted/5 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{column.name}</span>
                  {!column.nullable ? <Badge variant="secondary">Not null</Badge> : null}
                  {column.nullable ? <Badge variant="outline">Nullable</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Default value: {formatDefaultValue(column.defaultValue)}
                </p>
              </div>
              <Badge variant="outline" className="uppercase">
                {column.type}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-lg">Constraints</CardTitle>
            <CardDescription>
              {structureInfo.constraints?.length
                ? `${structureInfo.constraints.length} constraints`
                : 'No constraints defined'}
            </CardDescription>
          </div>
          <CardAction>
            <Button size="sm" variant="outline" disabled>
              Add constraint
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col py-6">
          {structureInfo.constraints?.length ? (
            structureInfo.constraints.map((constraint) => (
              <div key={constraint.name} className="border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{constraint.name}</span>
                    <Badge variant="outline">{constraint.type}</Badge>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-medium text-foreground">Columns:</span>{' '}
                    {normalizeColumnList(constraint.columns).length
                      ? normalizeColumnList(constraint.columns).join(', ')
                      : '—'}
                  </div>
                  {constraint.foreignTable ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">References:</span>
                      <Badge variant="secondary">
                        {constraint.foreignTable.schema}.{constraint.foreignTable.name}
                      </Badge>
                      {normalizeColumnList(constraint.foreignColumns).length ? (
                        <span>({normalizeColumnList(constraint.foreignColumns).join(', ')})</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No constraints found for this table.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-lg">Indexes</CardTitle>
            <CardDescription>
              {structureInfo.indexes?.length
                ? `${structureInfo.indexes.length} indexes`
                : 'No indexes defined'}
            </CardDescription>
          </div>
          <CardAction>
            <Button size="sm" variant="outline" disabled>
              Add index
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 py-6">
          {structureInfo.indexes?.length ? (
            structureInfo.indexes.map((index) => (
              <div key={index.name} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{index.name}</span>
                    {index.unique ? <Badge variant="secondary">Unique</Badge> : null}
                  </div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Columns:</span>{' '}
                  {normalizeColumnList(index.columns).join(', ')}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No indexes found for this table.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
