export interface QueryPlanNode {
  nodeType: string
  relationName?: string
  alias?: string
  startupCost?: number
  totalCost?: number
  planRows?: number
  actualRows?: number
  actualLoops?: number
  actualTotalTime?: number
  children: QueryPlanNode[]
}

export interface QueryPlan {
  root: QueryPlanNode
  planningTime?: number
  executionTime?: number
  analyzed: boolean
}

type JsonRecord = Record<string, unknown>

const asRecord = (value: unknown): JsonRecord | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const parsePlanNode = (value: unknown): QueryPlanNode => {
  const node = asRecord(value)
  if (!node || typeof node['Node Type'] !== 'string') {
    throw new Error('PostgreSQL returned an invalid query plan node.')
  }

  const plans = Array.isArray(node.Plans) ? node.Plans : []
  return {
    nodeType: node['Node Type'],
    relationName: typeof node['Relation Name'] === 'string' ? node['Relation Name'] : undefined,
    alias: typeof node.Alias === 'string' ? node.Alias : undefined,
    startupCost: asNumber(node['Startup Cost']),
    totalCost: asNumber(node['Total Cost']),
    planRows: asNumber(node['Plan Rows']),
    actualRows: asNumber(node['Actual Rows']),
    actualLoops: asNumber(node['Actual Loops']),
    actualTotalTime: asNumber(node['Actual Total Time']),
    children: plans.map(parsePlanNode)
  }
}

export const parseQueryPlan = (value: unknown): QueryPlan => {
  let decoded = value
  if (typeof decoded === 'string') {
    try {
      decoded = JSON.parse(decoded)
    } catch {
      throw new Error('PostgreSQL returned an invalid JSON query plan.')
    }
  }

  const document = Array.isArray(decoded) ? asRecord(decoded[0]) : asRecord(decoded)
  if (!document || !document.Plan) {
    throw new Error('PostgreSQL did not return a query plan.')
  }

  const root = parsePlanNode(document.Plan)
  const executionTime = asNumber(document['Execution Time'])
  return {
    root,
    planningTime: asNumber(document['Planning Time']),
    executionTime,
    analyzed: executionTime !== undefined || root.actualRows !== undefined
  }
}

export const getRowEstimateRatio = (node: QueryPlanNode): number | undefined => {
  if (node.planRows === undefined || node.actualRows === undefined) return undefined
  if (node.planRows === node.actualRows) return 1
  if (node.planRows === 0 || node.actualRows === 0) return Number.POSITIVE_INFINITY
  return Math.max(node.planRows / node.actualRows, node.actualRows / node.planRows)
}

export const getPlanNodeHighlights = (
  node: QueryPlanNode,
  rootTotalCost: number,
  isRoot = false
) => ({
  highCost:
    !isRoot &&
    rootTotalCost > 0 &&
    node.totalCost !== undefined &&
    node.totalCost / rootTotalCost >= 0.5,
  rowEstimateMismatch: (getRowEstimateRatio(node) ?? 0) >= 10
})
