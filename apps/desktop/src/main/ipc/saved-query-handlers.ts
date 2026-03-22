import { deleteQuery, loadQueries, saveQuery, updateQuery } from '../saved-queries-storage'
import { typedHandle } from './typed-handle'

export function registerSavedQueryHandlers() {
  typedHandle('queries:save', async ({ connectionId, id, name, content }) => {
    return saveQuery(connectionId, id, name, content)
  })

  typedHandle('queries:load', async ({ connectionId }) => loadQueries(connectionId))

  typedHandle('queries:delete', async ({ connectionId, queryId }) => {
    return deleteQuery(connectionId, queryId)
  })

  typedHandle('queries:update', async ({ connectionId, queryId, name, content }) => {
    return updateQuery(connectionId, queryId, name, content)
  })
}
