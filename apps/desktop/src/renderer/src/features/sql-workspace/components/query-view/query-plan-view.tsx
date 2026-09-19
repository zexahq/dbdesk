import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import {
  getPlanNodeHighlights,
  getRowEstimateRatio,
  type QueryPlan,
  type QueryPlanNode
} from '@renderer/features/sql-workspace/lib/query-plan'
import { cn } from '@renderer/shared/lib/utils'
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface QueryPlanViewProps {
  plan: QueryPlan
}

export interface VisiblePlanNode {
  id: string
  depth: number
  node: QueryPlanNode
}

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
const formatNumber = (value?: number) => (value === undefined ? '—' : numberFormatter.format(value))

export const getVisiblePlanNodes = (
  root: QueryPlanNode,
  collapsedNodeIds: ReadonlySet<string>
): VisiblePlanNode[] => {
  const visibleNodes: VisiblePlanNode[] = []

  const visit = (node: QueryPlanNode, id: string, depth: number) => {
    visibleNodes.push({ id, depth, node })
    if (collapsedNodeIds.has(id)) return
    node.children.forEach((child, index) => visit(child, `${id}.${index}`, depth + 1))
  }

  visit(root, '0', 0)
  return visibleNodes
}

export function QueryPlanView({ plan }: QueryPlanViewProps) {
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(() => new Set())
  const rootTotalCost = plan.root.totalCost ?? 0
  const visibleNodes = getVisiblePlanNodes(plan.root, collapsedNodeIds)

  const toggleNode = (nodeId: string) => {
    setCollapsedNodeIds((current) => {
      const next = new Set(current)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {plan.analyzed ? 'EXPLAIN ANALYZE' : 'EXPLAIN'}
        </span>
        {plan.planningTime !== undefined ? (
          <span>Planning {formatNumber(plan.planningTime)} ms</span>
        ) : null}
        {plan.executionTime !== undefined ? (
          <span>Execution {formatNumber(plan.executionTime)} ms</span>
        ) : null}
        <span>Cost {formatNumber(rootTotalCost)}</span>
      </div>

      <div className="flex-1 overflow-auto">
        <Table aria-label="PostgreSQL query plan">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>Operation</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Estimated rows</TableHead>
              <TableHead className="text-right">Actual rows</TableHead>
              <TableHead className="text-right">Actual time</TableHead>
              <TableHead>Flags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleNodes.map(({ id, depth, node }) => {
              const highlights = getPlanNodeHighlights(node, rootTotalCost, id === '0')
              const estimateRatio = getRowEstimateRatio(node)
              const isCollapsed = collapsedNodeIds.has(id)
              const hasChildren = node.children.length > 0
              const relation = node.relationName
                ? `${node.relationName}${node.alias && node.alias !== node.relationName ? ` as ${node.alias}` : ''}`
                : undefined

              return (
                <TableRow
                  key={id}
                  className={cn(
                    highlights.highCost && 'bg-amber-500/10',
                    highlights.rowEstimateMismatch && 'bg-destructive/10'
                  )}
                >
                  <TableCell>
                    <div
                      className="flex min-w-64 items-center gap-1"
                      style={{ paddingLeft: depth * 20 }}
                    >
                      {hasChildren ? (
                        <button
                          type="button"
                          className="rounded p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${node.nodeType}`}
                          aria-expanded={!isCollapsed}
                          onClick={() => toggleNode(id)}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </button>
                      ) : (
                        <span className="size-5" aria-hidden="true" />
                      )}
                      <span>
                        <span className="font-medium">{node.nodeType}</span>
                        {relation ? (
                          <span className="ml-2 text-muted-foreground">{relation}</span>
                        ) : null}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatNumber(node.totalCost)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatNumber(node.planRows)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatNumber(node.actualRows)}
                    {node.actualLoops !== undefined && node.actualLoops > 1
                      ? ` × ${formatNumber(node.actualLoops)}`
                      : ''}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {node.actualTotalTime === undefined
                      ? '—'
                      : `${formatNumber(node.actualTotalTime)} ms`}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {highlights.highCost ? (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                          High cost
                        </span>
                      ) : null}
                      {highlights.rowEstimateMismatch ? (
                        <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-xs text-destructive">
                          <AlertTriangle className="size-3" aria-hidden="true" />
                          {estimateRatio === Number.POSITIVE_INFINITY
                            ? 'Row estimate missed'
                            : `${formatNumber(estimateRatio)}× row mismatch`}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
