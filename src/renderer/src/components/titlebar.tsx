import { windowClient } from '@renderer/api/window'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { Minus, Square, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Title } from './title'

export function Titlebar() {
  const titlebarRef = useRef<HTMLDivElement>(null)
  const connectionId = useSqlWorkspaceStore((state) => state.currentConnectionId)

  useEffect(() => {
    const titlebar = titlebarRef.current
    if (!titlebar) return

    let isDragging = false
    let startX = 0
    let startY = 0

    const handleMouseDown = (e: MouseEvent) => {
      // Don't drag if clicking buttons
      if ((e.target as HTMLElement).closest('button')) return

      isDragging = true
      startX = e.clientX
      startY = e.clientY

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      windowClient.moveWindow(deltaX, deltaY)
    }

    const handleMouseUp = () => {
      isDragging = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    titlebar.addEventListener('mousedown', handleMouseDown)

    return () => {
      titlebar.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  const handleMinimize = () => windowClient.minimizeWindow()
  const handleMaximize = () => windowClient.maximizeWindow()
  const handleClose = () => windowClient.closeWindow()

  return (
    <div
      ref={titlebarRef}
      className="h-9 bg-main-sidebar backdrop-blur flex items-center justify-between select-none cursor-default"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="pl-4 text-sm font-medium text-zinc-400 w-24">DBDesk</div>

      <div className="flex-1 flex justify-center">
        {connectionId && <Title connectionId={connectionId} />}
      </div>

      <div
        className="flex h-full w-24"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleMinimize}
          className="w-12 pb-2 h-full flex items-end justify-center hover:bg-zinc-800 transition-colors focus:outline-none"
          title="Minimize"
        >
          <Minus size={16} className="text-zinc-400" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-12 h-full flex items-center justify-center hover:bg-zinc-800 transition-colors focus:outline-none"
          title="Maximize"
        >
          <Square size={16} className="text-zinc-400" />
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center hover:bg-red-700 hover:text-white group transition-colors focus:outline-none"
          title="Close"
        >
          <X size={20} className="text-zinc-400 group-hover:text-white" />
        </button>
      </div>
    </div>
  )
}
