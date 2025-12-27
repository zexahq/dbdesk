import { toast } from 'sonner'

// Re-export toast functions to avoid generic type issues
export const success = toast.success
export const error = toast.error
export const warning = toast.warning
export const info = toast.info
export const loading = toast.loading
export const dismiss = toast.dismiss

export { toast }

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'default'

export const showToast = (type: ToastType, message: string, description?: string) => {
  toast[type](message, {
    description,
  })
}

export const showSuccess = (message: string, description?: string) => showToast('success', message, description)
export const showError = (message: string, description?: string) => showToast('error', message, description)
export const showWarning = (message: string, description?: string) => showToast('warning', message, description)
export const showInfo = (message: string, description?: string) => showToast('info', message, description)

export const showLoading = (message: string) => loading(message)
