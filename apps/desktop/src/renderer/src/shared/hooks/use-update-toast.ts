import { useEffect, useRef } from 'react'
import { toast } from '@renderer/shared/lib/toast'

export function useUpdateToast() {
  const toastIdRef = useRef<string | number | null>(null)

  useEffect(() => {
    const cleanups = [
      window.dbdesk.onUpdateAvailable((data) => {
        if (toastIdRef.current) {
          toast.dismiss(toastIdRef.current)
        }

        toastIdRef.current = toast.info('Update available', {
          description: `Version ${data.version} is ready to download.`,
          duration: Infinity,
          position: 'bottom-right',
          action: {
            label: 'Update now',
            onClick: () => window.dbdesk.downloadUpdate(),
          },
        })
      }),

      window.dbdesk.onUpdateProgress((data) => {
        if (toastIdRef.current) {
          toast.loading(`Downloading update… ${data.percent}%`, {
            id: toastIdRef.current,
            position: 'bottom-right',
          })
        }
      }),

      window.dbdesk.onUpdateDownloaded((data) => {
        if (toastIdRef.current) {
          toast.dismiss(toastIdRef.current)
        }

        toastIdRef.current = toast.success('Ready to install', {
          description: `Version ${data.version} will install on restart.`,
          duration: Infinity,
          position: 'bottom-right',
          action: {
            label: 'Restart now',
            onClick: () => window.dbdesk.installUpdate(),
          },
        })
      }),

      window.dbdesk.onUpdateError((data) => {
        if (toastIdRef.current) {
          toast.dismiss(toastIdRef.current)
          toastIdRef.current = null
        }

        toast.error('Update failed', {
          description: data.message,
          position: 'bottom-right',
        })
      }),
    ]

    return () => cleanups.forEach((fn) => fn())
  }, [])
}
