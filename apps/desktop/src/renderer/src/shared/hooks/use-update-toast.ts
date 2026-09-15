import { useEffect, useRef } from 'react'
import { toast } from '@renderer/shared/lib/toast'
import { useUpdateState } from './use-update-state'

export function useUpdateToast() {
  const toastIdRef = useRef<string | number | null>(null)
  const updateState = useUpdateState()

  useEffect(() => {
    if (updateState.status === 'available') {
      toastIdRef.current = toast.info('Update Available', {
        id: toastIdRef.current ?? undefined,
        description: `Version ${updateState.version} is ready to download.`,
        duration: Infinity,
        action: {
          label: 'Download Update',
          onClick: () => window.dbdesk.downloadUpdate()
        }
      })
    } else if (updateState.status === 'downloading' && toastIdRef.current) {
      toast.loading(`Downloading Update… ${updateState.percent}%`, {
        id: toastIdRef.current
      })
    } else if (updateState.status === 'downloaded') {
      toastIdRef.current = toast.success('Ready to Install', {
        id: toastIdRef.current ?? undefined,
        description: `Version ${updateState.version} will install on restart.`,
        duration: Infinity,
        action: {
          label: 'Restart Now',
          onClick: () => window.dbdesk.installUpdate()
        }
      })
    } else if (updateState.status === 'error') {
      toastIdRef.current = toast.error('Update Failed', {
        id: toastIdRef.current ?? undefined,
        description: `${updateState.message} Try again from Settings → Updates.`
      })
    }
  }, [updateState])
}
