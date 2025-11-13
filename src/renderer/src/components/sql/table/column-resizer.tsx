import { Header } from '@tanstack/react-table'

export const ColumnResizer = <TData, TValue>({ header }: { header: Header<TData, TValue> }) => {
  if (header.column.getCanResize() === false) return <></>

  return (
    <div
      {...{
        onMouseDown: header.getResizeHandler(),
        onTouchStart: header.getResizeHandler(),
        className: `absolute top-0 right-0 cursor-col-resize w-px h-full bg-gray-800 hover:bg-gray-700 hover:w-2`,
        style: {
          userSelect: 'none',
          touchAction: 'none'
        }
      }}
    />
  )
}
