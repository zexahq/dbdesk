import { Header } from '@tanstack/react-table'

export const ColumnResizer = <TData, TValue>({ header }: { header: Header<TData, TValue> }) => {
  if (header.column.getCanResize() === false) return <></>

  return (
    <div
      {...{
        onMouseDown: header.getResizeHandler(),
        onTouchStart: header.getResizeHandler(),
        className: `absolute top-0 right-0 z-10 h-full w-px cursor-col-resize bg-border hover:bg-muted-foreground/10 hover:w-2`,
        style: {
          userSelect: 'none',
          touchAction: 'none'
        }
      }}
    />
  )
}
