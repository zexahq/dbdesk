import { SQLConnectionProfile } from '@common/types'
import { useSqlWorkspaceStore } from '../../store/sql-workspace-store'
import SqlQueryView from './query-view'
import { SqlTableView } from './table-view'

export function SqlWorkspace({ profile }: { profile: SQLConnectionProfile }) {
  const view = useSqlWorkspaceStore((state) => state.view)

  if (view === 'table') {
    return <SqlTableView profile={profile} />
  }

  if (view === 'query') {
    return <SqlQueryView profile={profile} />
  }

  return null
}
