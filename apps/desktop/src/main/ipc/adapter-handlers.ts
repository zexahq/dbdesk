import { listRegisteredAdapters } from '../adapters'
import { typedHandle } from './typed-handle'

export function registerAdapterHandlers() {
  typedHandle('adapters:list', async () => listRegisteredAdapters())
}
