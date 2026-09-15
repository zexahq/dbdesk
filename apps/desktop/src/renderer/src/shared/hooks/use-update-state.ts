import type { UpdateState } from '@dbdesk/shared/types'
import { useEffect } from 'react'
import { create } from 'zustand'

const useUpdateStore = create<{ state: UpdateState }>(() => ({ state: { status: 'idle' } }))
let initialized = false

function initializeUpdateState(): void {
  if (initialized) return
  initialized = true

  let receivedEvent = false
  window.dbdesk.onUpdateState((state) => {
    receivedEvent = true
    useUpdateStore.setState({ state })
  })
  void window.dbdesk
    .getUpdateState()
    .then((state) => {
      if (!receivedEvent) useUpdateStore.setState({ state })
    })
    .catch((error) => {
      if (!receivedEvent) {
        useUpdateStore.setState({
          state: { status: 'error', message: error instanceof Error ? error.message : String(error) }
        })
      }
    })
}

export function useUpdateState() {
  const state = useUpdateStore((store) => store.state)

  useEffect(() => {
    initializeUpdateState()
  }, [])

  return state
}
