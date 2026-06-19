import { useEffect, useState } from 'react'

export type UpdateState =
  | { status: 'idle' }
  | { status: 'available'; version: string; releaseNotes?: string }
  | { status: 'downloading'; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string }

export function useUpdateState() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })

  useEffect(() => {
    const cleanups = [
      window.dbdesk.onUpdateAvailable((data) => {
        setState({ status: 'available', version: data.version, releaseNotes: data.releaseNotes })
      }),
      window.dbdesk.onUpdateDownloaded((data) => {
        setState({ status: 'downloaded', version: data.version })
      }),
      window.dbdesk.onUpdateProgress((data) => {
        setState({ status: 'downloading', percent: data.percent })
      }),
      window.dbdesk.onUpdateError((data) => {
        setState({ status: 'error', message: data.message })
      }),
    ]

    return () => cleanups.forEach((fn) => fn())
  }, [])

  return state
}
