import type { UpdateState } from '@dbdesk/shared/types'
import { useEffect } from 'react'
import { create } from 'zustand'

const useUpdateStore = create<{ state: UpdateState }>(() => ({ state: { status: 'idle' } }))
let initialized = false

function initializeUpdateState(): void {
  if (initialized) return
  initialized = true

  window.dbdesk.onUpdateState((state) => useUpdateStore.setState({ state }))
  void window.dbdesk
    .getUpdateState()
    .then((state) => useUpdateStore.setState({ state }))
    .catch((error) =>
      useUpdateStore.setState({
        state: { status: 'error', message: error instanceof Error ? error.message : String(error) }
      })
    )
}

export function useUpdateState() {
  const state = useUpdateStore((store) => store.state)

  useEffect(() => {
    initializeUpdateState()
  }, [])

  return state
}
