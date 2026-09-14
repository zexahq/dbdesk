import { describe, expect, it } from 'vitest'
import {
  getInitialNodePositions,
  getTableNodeHeight
} from '../src/renderer/src/features/schema-visualizer/lib/layout'

describe('schema diagram layout', () => {
  it('leaves room below tall tables', () => {
    const positions = getInitialNodePositions([9, 1, 1])

    expect(positions[2].y).toBeGreaterThanOrEqual(positions[0].y + getTableNodeHeight(9))
  })
})
