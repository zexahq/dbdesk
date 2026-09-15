import type { QueryResult } from '@dbdesk/shared/types'

type PlanNode = Record<string, unknown> & { Plans?: PlanNode[] }

type ExecutionPlan = {
  root: PlanNode
  planningTime?: number
  executionTime?: number
  raw: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const formatNumber = (value: unknown) => {
  const number = asNumber(value)
  return number === undefined ? undefined : new Intl.NumberFormat().format(number)
}

const formatMilliseconds = (value: unknown) => {
  const number = asNumber(value)
  return number === undefined ? undefined : `${number.toFixed(2)} ms`
}

/** Decode PostgreSQL's single-row result from EXPLAIN (FORMAT JSON). */
export function getExecutionPlan(result?: QueryResult): ExecutionPlan | undefined {
  const row = result?.rows[0]
  if (!row) return undefined

  const value = row['QUERY PLAN'] ?? row['query plan'] ?? Object.values(row)[0]
  let parsed: unknown = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      return undefined
    }
  }

  const summary = Array.isArray(parsed) ? parsed[0] : parsed
  if (!isRecord(summary) || !isRecord(summary.Plan)) return undefined

  return {
    root: summary.Plan as PlanNode,
    planningTime: asNumber(summary['Planning Time']),
    executionTime: asNumber(summary['Execution Time']),
    raw: parsed
  }
}

function Metric({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <span className="text-xs text-muted-foreground">
      {label}: <span className="font-mono text-foreground">{value}</span>
    </span>
  )
}

function PlanTreeNode({ node, depth = 0 }: { node: PlanNode; depth?: number }) {
  const nodeType = typeof node['Node Type'] === 'string' ? node['Node Type'] : 'Plan node'
  const relation = typeof node['Relation Name'] === 'string' ? node['Relation Name'] : undefined
  const index = typeof node['Index Name'] === 'string' ? node['Index Name'] : undefined
  const filter = typeof node.Filter === 'string' ? node.Filter : undefined
  const children = Array.isArray(node.Plans) ? (node.Plans.filter(isRecord) as PlanNode[]) : []

  return (
    <div className={depth > 0 ? 'ml-4 border-l border-border pl-4' : ''}>
      <div className="rounded-md border bg-muted/30 px-3 py-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-medium">{nodeType}</span>
          {relation && (
            <span className="font-mono text-sm text-muted-foreground">on {relation}</span>
          )}
          {index && <span className="font-mono text-xs text-muted-foreground">using {index}</span>}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          <Metric
            label="cost"
            value={
              asNumber(node['Startup Cost']) !== undefined &&
              asNumber(node['Total Cost']) !== undefined
                ? `${asNumber(node['Startup Cost'])}..${asNumber(node['Total Cost'])}`
                : undefined
            }
          />
          <Metric label="estimated rows" value={formatNumber(node['Plan Rows'])} />
          <Metric label="actual rows" value={formatNumber(node['Actual Rows'])} />
          <Metric label="actual time" value={formatMilliseconds(node['Actual Total Time'])} />
          <Metric label="shared hits" value={formatNumber(node['Shared Hit Blocks'])} />
          <Metric label="shared reads" value={formatNumber(node['Shared Read Blocks'])} />
        </div>
        {filter && (
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">Filter: {filter}</p>
        )}
      </div>
      {children.length > 0 && (
        <div className="mt-2 space-y-2">
          {children.map((child, index) => (
            <PlanTreeNode key={index} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ExplainPlan({ result }: { result?: QueryResult }) {
  const plan = getExecutionPlan(result)
  if (!plan) {
    return (
      <div className="flex h-full items-center justify-center text-center text-muted-foreground">
        <p>Unable to read the PostgreSQL execution plan.</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-semibold">Query Execution Plan</h2>
        <Metric label="planning" value={formatMilliseconds(plan.planningTime)} />
        <Metric label="execution" value={formatMilliseconds(plan.executionTime)} />
      </div>
      <PlanTreeNode node={plan.root} />
      <details className="mt-4 rounded-md border p-3">
        <summary className="cursor-pointer text-sm text-muted-foreground">Raw JSON plan</summary>
        <pre className="mt-3 overflow-auto text-xs">{JSON.stringify(plan.raw, null, 2)}</pre>
      </details>
    </div>
  )
}
