import { createFileRoute } from '@tanstack/react-router'
import { ConnectionList } from '@renderer/features/connections/components/connection-list'

export const Route = createFileRoute('/')({
  component: Index
})

function Index() {
  return (
    <div className="p-6">
      <ConnectionList />
    </div>
  )
}
