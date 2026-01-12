import { createFileRoute } from '@tanstack/react-router'
import { ConnectionList } from '../components/connections/connection-list'

export const Route = createFileRoute('/')({
  component: Index
})

function Index() {
  return (
      <ConnectionList />
  )
}
