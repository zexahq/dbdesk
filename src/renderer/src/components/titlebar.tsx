import { windowClient } from '@renderer/api/window'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { Minus, Square, X } from 'lucide-react'
import { Title } from './title'

export function Titlebar() {
  const connectionId = useSqlWorkspaceStore((state) => state.currentConnectionId)

  const handleMinimize = () => windowClient.minimizeWindow()
  const handleMaximize = () => windowClient.maximizeWindow()
  const handleClose = () => windowClient.closeWindow()

  return (
    <div
      className="h-9 shrink-0 bg-main-sidebar backdrop-blur flex items-center justify-between select-none"
      style={{ appRegion: 'drag' } as React.CSSProperties}
    >
      <div className="pl-4 text-sm font-medium text-zinc-800 dark:text-zinc-400 w-24">DBDesk</div>

      <div className="flex-1 flex justify-center">
        {connectionId && <Title connectionId={connectionId} />}
      </div>

      <div
        className="flex h-full w-24"
        style={{ appRegion: 'no-drag' } as React.CSSProperties}
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
