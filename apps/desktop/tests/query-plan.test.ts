import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  getVisiblePlanNodes,
  QueryPlanView
} from '../src/renderer/src/features/sql-workspace/components/query-view/query-plan-view'
import {
  getPlanNodeHighlights,
  getRowEstimateRatio,
  parseQueryPlan
} from '../src/renderer/src/features/sql-workspace/lib/query-plan'

const planJson = [
  {
    Plan: {
      'Node Type': 'Hash Join',
      'Startup Cost': 10,
      'Total Cost': 200,
      'Plan Rows': 100,
      'Actual Rows': 8,
      'Actual Loops': 1,
      'Actual Total Time': 7.5,
      Plans: [
        {
          'Node Type': 'Seq Scan',
          'Relation Name': 'users',
          'Total Cost': 150,
          'Plan Rows': 1000,
          'Actual Rows': 1000
        }
      ]
    },
    'Planning Time': 1.25,
    'Execution Time': 8.75
  }
]

describe('query plan parsing', () => {
  it('parses PostgreSQL FORMAT JSON plans and nested nodes', () => {
    const plan = parseQueryPlan(planJson)

    expect(plan).toMatchObject({
      analyzed: true,
      planningTime: 1.25,
      executionTime: 8.75,
      root: {
        nodeType: 'Hash Join',
        totalCost: 200,
        children: [{ nodeType: 'Seq Scan', relationName: 'users' }]
      }
    })
  })

  it('accepts serialized JSON and rejects malformed plans', () => {
    expect(parseQueryPlan(JSON.stringify(planJson)).root.nodeType).toBe('Hash Join')
    expect(() => parseQueryPlan([{ nope: true }])).toThrow('did not return a query plan')
  })
})

describe('query plan highlights', () => {
  it('flags high-cost nodes and tenfold estimate mismatches', () => {
    const root = parseQueryPlan(planJson).root

    expect(getRowEstimateRatio(root)).toBe(12.5)
    expect(getPlanNodeHighlights(root, 200, true)).toEqual({
      highCost: false,
      rowEstimateMismatch: true
    })
    expect(getPlanNodeHighlights(root.children[0], 200)).toEqual({
      highCost: true,
      rowEstimateMismatch: false
    })
    expect(getPlanNodeHighlights(root.children[0], 400)).toEqual({
      highCost: false,
      rowEstimateMismatch: false
    })
  })

  it('treats a zero estimate with actual rows as an unbounded mismatch', () => {
    expect(
      getRowEstimateRatio({ nodeType: 'Result', planRows: 0, actualRows: 1, children: [] })
    ).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('query plan viewer', () => {
  it('renders plan details and hides descendants of collapsed nodes', () => {
    const plan = parseQueryPlan(planJson)
    const markup = renderToStaticMarkup(createElement(QueryPlanView, { plan }))

    expect(markup).toContain('Hash Join')
    expect(markup).toContain('Seq Scan')
    expect(markup).toContain('12.5× row mismatch')
    expect(getVisiblePlanNodes(plan.root, new Set(['0']))).toHaveLength(1)
    expect(getVisiblePlanNodes(plan.root, new Set())).toHaveLength(2)
  })
})
