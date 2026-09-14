export const TABLE_NODE_WIDTH = 256

export function getTableNodeHeight(fieldCount: number) {
  return 70 + fieldCount * 28
}

export function getInitialNodePositions(fieldCounts: readonly number[]) {
  const columnCount = Math.max(1, Math.ceil(Math.sqrt(fieldCounts.length)))
  const nextYByColumn = Array<number>(columnCount).fill(80)

  return fieldCounts.map((fieldCount, index) => {
    const column = index % columnCount
    const position = { x: 80 + column * 340, y: nextYByColumn[column] }
    nextYByColumn[column] += getTableNodeHeight(fieldCount) + 48
    return position
  })
}
