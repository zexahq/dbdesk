import type { ExportTableResult } from '@common/types'

/**
 * Converts base64 content to a blob and triggers a download
 */
export function downloadExportedFile(result: ExportTableResult): void {
  // Convert base64 to blob and download
  const binaryContent = atob(result.base64Content)
  const bytes = new Uint8Array(binaryContent.length)
  for (let i = 0; i < binaryContent.length; i++) {
    bytes[i] = binaryContent.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: result.mimeType })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = result.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
