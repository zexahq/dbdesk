import type { ColumnInfo, SchemaWithTables, TableInfo } from '@dbdesk/shared/types'
import { Button } from '@renderer/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { Input } from '@renderer/components/ui/input'
import { mapWithConcurrency } from '@renderer/shared/lib/async'
import { toast } from '@renderer/shared/lib/toast'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'
import { getTableIntrospection } from '@renderer/features/sql-workspace/queries/schema'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  getNodesBounds,
  getViewportForBounds,
  useNodesState,
  useReactFlow,
  type Edge
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Download,
  KeyRound,
  LayoutTemplate,
  Maximize,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Target,
  Workflow,
  X
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SchemaEdge } from './schema-edge'
import TableNode, { type DiagramField, type SchemaTableNode } from './table-node'

type SchemaDiagramProps = {
  connectionId: string
  schemasWithTables: SchemaWithTables[]
  onOpenTable: (schema: string, table: string) => void
}

type DiagramData = { nodes: SchemaTableNode[]; edges: Edge[]; failedTableCount: number }
type SavedPositions = Record<string, { x: number; y: number }>
type ExportFormat = 'png' | 'svg'

const nodeTypes = { table: TableNode }
const edgeTypes = { relationship: SchemaEdge }
const MAX_CONCURRENT_INTROSPECTIONS = 4

function positionsStorageKey(connectionId: string) {
  return `dbdesk:schema-diagram:${connectionId}:positions`
}

function loadSavedPositions(connectionId: string): SavedPositions {
  try {
    const value = window.localStorage.getItem(positionsStorageKey(connectionId))
    if (!value) return {}
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? (parsed as SavedPositions) : {}
  } catch {
    return {}
  }
}

function savePositions(connectionId: string, nodes: SchemaTableNode[]) {
  const positions = Object.fromEntries(nodes.map((node) => [node.id, node.position]))
  window.localStorage.setItem(positionsStorageKey(connectionId), JSON.stringify(positions))
}

function restorePositions(
  connectionId: string,
  nodes: SchemaTableNode[],
  currentNodes: SchemaTableNode[]
) {
  const currentPositions = new Map(currentNodes.map((node) => [node.id, node.position]))
  const savedPositions = loadSavedPositions(connectionId)
  return nodes.map((node) => ({
    ...node,
    position: currentPositions.get(node.id) ?? savedPositions[node.id] ?? node.position
  }))
}

async function arrangeNodes(nodes: SchemaTableNode[], edges: Edge[]): Promise<SchemaTableNode[]> {
  const dagre = await import('@dagrejs/dagre')
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'LR', nodesep: 72, ranksep: 128, marginx: 48, marginy: 48 })

  for (const node of nodes) {
    graph.setNode(node.id, { width: 256, height: 70 + node.data.fields.length * 28 })
  }
  for (const edge of edges) graph.setEdge(edge.source, edge.target)

  dagre.layout(graph)
  return nodes.map((node) => {
    const position = graph.node(node.id) as { x: number; y: number }
    const height = 70 + node.data.fields.length * 28
    return { ...node, position: { x: position.x - 128, y: position.y - height / 2 } }
  })
}

function makeDiagram(tables: TableInfo[]): DiagramData {
  const referencedColumns = new Set<string>()
  for (const table of tables) {
    for (const column of table.columns) {
      if (column.foreignKey) {
        referencedColumns.add(
          `${column.foreignKey.referencedSchema}.${column.foreignKey.referencedTable}.${column.foreignKey.referencedColumn}`
        )
      }
    }
  }

  const gridColumns = Math.max(1, Math.ceil(Math.sqrt(tables.length)))
  const nodes = tables.map((table, index): SchemaTableNode => {
    const fields: DiagramField[] = table.columns.map((column) => ({
      name: column.name,
      type: column.type,
      isPrimary: Boolean(column.isPrimaryKey),
      isForeign: Boolean(column.foreignKey),
      isReferenced: referencedColumns.has(`${table.schema}.${table.name}.${column.name}`)
    }))
    return {
      id: `${table.schema}.${table.name}`,
      type: 'table',
      position: {
        x: 80 + (index % gridColumns) * 340,
        y: 80 + Math.floor(index / gridColumns) * 300
      },
      data: { schema: table.schema, table: table.name, fields }
    }
  })

  const knownTableIds = new Set(nodes.map((node) => node.id))
  const edges = tables.flatMap((table) =>
    table.columns.flatMap((column: ColumnInfo) => {
      const foreignKey = column.foreignKey
      if (!foreignKey) return []
      const source = `${table.schema}.${table.name}`
      const target = `${foreignKey.referencedSchema}.${foreignKey.referencedTable}`
      if (!knownTableIds.has(target)) return []
      return [
        {
          id: `${source}.${column.name}->${target}.${foreignKey.referencedColumn}`,
          source,
          target,
          sourceHandle: column.name,
          targetHandle: foreignKey.referencedColumn,
          type: 'relationship',
          animated: tables.length <= 30
        }
      ]
    })
  )
  return { nodes, edges, failedTableCount: 0 }
}

function SchemaDiagramCanvas({ connectionId, schemasWithTables, onOpenTable }: SchemaDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<SchemaTableNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isArranging, setIsArranging] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [failedTableCount, setFailedTableCount] = useState(0)
  const [search, setSearch] = useState('')
  const [schemaFilter, setSchemaFilter] = useState('all')
  const [keysOnly, setKeysOnly] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const flowContainerRef = useRef<HTMLDivElement>(null)
  const loadVersionRef = useRef(0)
  const displayedConnectionIdRef = useRef<string | null>(null)
  const setTableColumns = useSqlWorkspaceStore((s) => s.setTableColumns)
  const { fitView, getNodes, zoomIn, zoomOut } = useReactFlow()

  const tableTargets = useMemo(
    () =>
      schemasWithTables.flatMap(({ schema, tables }) => tables.map((table) => ({ schema, table }))),
    [schemasWithTables]
  )

  const loadDiagram = useCallback(
    async (force = false) => {
      const loadVersion = ++loadVersionRef.current
      setIsLoading(true)
      try {
        const cachedTables: TableInfo[] = []
        const workspaceState = useSqlWorkspaceStore.getState()
        const cachedColumns =
          workspaceState.currentConnectionId === connectionId ? workspaceState.tableColumns : {}
        const missingTargets = tableTargets.filter(({ schema, table }) => {
          const columns = cachedColumns[`${schema}.${table}`]
          if (force || !columns) return true
          cachedTables.push({ schema, name: table, columns })
          return false
        })
        const results = await mapWithConcurrency(
          missingTargets,
          MAX_CONCURRENT_INTROSPECTIONS,
          async ({ schema, table }) => {
            const tableInfo = await getTableIntrospection(connectionId, schema, table)
            if (useSqlWorkspaceStore.getState().currentConnectionId === connectionId) {
              setTableColumns(schema, table, tableInfo.columns)
            }
            return tableInfo
          }
        )
        const fetchedTables = results.flatMap((result) =>
          result.status === 'fulfilled' ? [result.value] : []
        )
        if (loadVersion !== loadVersionRef.current) return

        const diagram = makeDiagram([...cachedTables, ...fetchedTables])
        const currentNodes =
          displayedConnectionIdRef.current === connectionId ? (getNodes() as SchemaTableNode[]) : []
        setNodes(restorePositions(connectionId, diagram.nodes, currentNodes))
        setEdges(diagram.edges)
        setFailedTableCount(missingTargets.length - fetchedTables.length)
        displayedConnectionIdRef.current = connectionId
        requestAnimationFrame(() => {
          if (loadVersion === loadVersionRef.current) fitView({ padding: 0.2, maxZoom: 1 })
        })
      } finally {
        if (loadVersion === loadVersionRef.current) setIsLoading(false)
      }
    },
    [connectionId, fitView, getNodes, setEdges, setNodes, setTableColumns, tableTargets]
  )

  useEffect(() => {
    loadVersionRef.current += 1
    displayedConnectionIdRef.current = null
    setNodes([])
    setEdges([])
    setFailedTableCount(0)
    setFocusedNodeId(null)
    setFocusMode(false)
  }, [connectionId, setEdges, setNodes])

  useEffect(() => {
    void loadDiagram()
  }, [loadDiagram])

  useEffect(() => {
    if (nodes.length === 0) return
    const timer = window.setTimeout(() => savePositions(connectionId, nodes), 400)
    return () => window.clearTimeout(timer)
  }, [connectionId, nodes])

  const schemas = useMemo(
    () => [...new Set(nodes.map((node) => node.data.schema))].sort((a, b) => a.localeCompare(b)),
    [nodes]
  )
  const visibleNodeIds = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    const matchingIds = new Set(
      nodes
        .filter((node) => {
          const schemaMatches = schemaFilter === 'all' || node.data.schema === schemaFilter
          const searchMatches =
            !normalizedSearch ||
            `${node.data.schema}.${node.data.table}`.toLocaleLowerCase().includes(normalizedSearch)
          return schemaMatches && searchMatches
        })
        .map((node) => node.id)
    )
    if (!focusMode || !focusedNodeId || !matchingIds.has(focusedNodeId)) return matchingIds

    const relatedIds = new Set([focusedNodeId])
    for (const edge of edges) {
      if (edge.source === focusedNodeId && matchingIds.has(edge.target)) relatedIds.add(edge.target)
      if (edge.target === focusedNodeId && matchingIds.has(edge.source)) relatedIds.add(edge.source)
    }
    return relatedIds
  }, [edges, focusMode, focusedNodeId, nodes, schemaFilter, search])
  const visibleNodes = useMemo(
    () =>
      nodes
        .filter((node) => visibleNodeIds.has(node.id))
        .map((node) => ({
          ...node,
          data: {
            ...node.data,
            focused: node.id === focusedNodeId,
            fields: keysOnly
              ? node.data.fields.filter(
                  (field) => field.isPrimary || field.isForeign || field.isReferenced
                )
              : node.data.fields
          }
        })),
    [focusedNodeId, keysOnly, nodes, visibleNodeIds]
  )
  const visibleEdges = useMemo(
    () =>
      edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    [edges, visibleNodeIds]
  )

  const handleAutoArrange = async () => {
    setIsArranging(true)
    try {
      setNodes(await arrangeNodes(nodes, edges))
      requestAnimationFrame(() => fitView({ padding: 0.15, maxZoom: 1 }))
    } finally {
      setIsArranging(false)
    }
  }

  const handleExport = async (format: ExportFormat) => {
    const viewport = flowContainerRef.current?.querySelector<HTMLElement>('.react-flow__viewport')
    if (!viewport || visibleNodes.length === 0) return

    setIsExporting(true)
    try {
      const { toPng, toSvg } = await import('html-to-image')
      const width = 1920
      const height = 1080
      const bounds = getNodesBounds(visibleNodes)
      const exportViewport = getViewportForBounds(bounds, width, height, 0.15, 2, 0.1)
      const options = {
        backgroundColor: '#18181b',
        width,
        height,
        pixelRatio: format === 'png' ? 2 : 1,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${exportViewport.x}px, ${exportViewport.y}px) scale(${exportViewport.zoom})`,
          transformOrigin: 'top left'
        }
      }
      const dataUrl =
        format === 'png' ? await toPng(viewport, options) : await toSvg(viewport, options)
      const link = document.createElement('a')
      link.download = `dbdesk-schema-diagram.${format}`
      link.href = dataUrl
      link.click()
      toast.success(`Schema diagram exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Failed to export schema diagram', error)
      toast.error('Failed to export schema diagram')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Workflow className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h1 className="text-sm font-medium">Schema Diagram</h1>
            <p className="truncate text-xs text-muted-foreground">
              {isLoading
                ? 'Reading table relationships…'
                : `${visibleNodes.length}/${nodes.length} tables · ${visibleEdges.length}/${edges.length} relationships`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find table"
              className="h-8 w-36 pl-7 text-xs"
              aria-label="Find a table"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-1.5 top-1.5 rounded-sm p-0.5 text-muted-foreground hover:bg-muted"
                aria-label="Clear table search"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
          <select
            value={schemaFilter}
            onChange={(event) => setSchemaFilter(event.target.value)}
            className="h-8 max-w-32 rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
            aria-label="Filter by schema"
          >
            <option value="all">All schemas</option>
            {schemas.map((schema) => (
              <option key={schema} value={schema}>
                {schema}
              </option>
            ))}
          </select>
          <ToolbarButton
            active={keysOnly}
            onClick={() => setKeysOnly((value) => !value)}
            label="Toggle key columns only"
            title="Show key columns only"
          >
            <KeyRound className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={focusMode}
            onClick={() => setFocusMode((value) => !value)}
            disabled={!focusedNodeId}
            label="Focus related tables"
            title={
              focusedNodeId ? 'Focus related tables' : 'Select a table to focus its relationships'
            }
          >
            <Target className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => void handleAutoArrange()}
            disabled={isArranging || nodes.length === 0}
            label="Automatically arrange diagram"
            title="Automatically arrange diagram"
          >
            <LayoutTemplate className={`size-4 ${isArranging ? 'animate-pulse' : ''}`} />
          </ToolbarButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={isExporting || visibleNodes.length === 0}
                aria-label="Export diagram"
                title="Export diagram"
              >
                <Download className={`size-4 ${isExporting ? 'animate-pulse' : ''}`} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handleExport('png')}>
                Export as PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExport('svg')}>
                Export as SVG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ToolbarButton onClick={() => zoomIn()} label="Zoom in">
            <Plus className="size-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => zoomOut()} label="Zoom out">
            <Minus className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => fitView({ padding: 0.2, maxZoom: 1 })}
            label="Fit diagram to view"
          >
            <Maximize className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => void loadDiagram(true)}
            disabled={isLoading}
            label="Refresh diagram"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
          </ToolbarButton>
        </div>
      </div>

      <div ref={flowContainerRef} className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => setFocusedNodeId(node.id)}
          onNodeDoubleClick={(_, node) => onOpenTable(node.data.schema, node.data.table)}
          onPaneClick={() => {
            setFocusedNodeId(null)
            setFocusMode(false)
          }}
          minZoom={0.15}
          maxZoom={1.5}
          nodesDraggable
          fitView
          className="bg-muted/20"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>
        {!isLoading && nodes.length === 0 && (
          <EmptyState
            title="No tables to diagram"
            description="Create a table or refresh the schema list to get started."
          />
        )}
        {!isLoading && nodes.length > 0 && visibleNodes.length === 0 && (
          <EmptyState
            title="No matching tables"
            description="Try a different name or schema filter."
          />
        )}
        {!isLoading && failedTableCount > 0 && nodes.length > 0 && (
          <p className="absolute bottom-3 left-3 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
            {failedTableCount} table{failedTableCount === 1 ? '' : 's'} could not be read.
          </p>
        )}
      </div>
    </div>
  )
}

function ToolbarButton({
  active,
  children,
  label,
  title,
  ...props
}: React.ComponentProps<typeof Button> & { active?: boolean; label: string; title?: string }) {
  return (
    <Button
      variant={active ? 'secondary' : 'outline'}
      size="icon"
      aria-label={label}
      title={title ?? label}
      {...props}
    >
      {children}
    </Button>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
        <Table2 className="mx-auto mb-3 size-5 text-muted-foreground" />
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export function SchemaDiagram(props: SchemaDiagramProps) {
  return (
    <ReactFlowProvider>
      <SchemaDiagramCanvas {...props} />
    </ReactFlowProvider>
  )
}
