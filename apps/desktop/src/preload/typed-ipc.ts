import type { IpcContract } from '@dbdesk/shared/ipc'
import { ipcRenderer } from 'electron'

/**
 * Type-safe IPC invoke wrapper for the preload layer.
 *
 * Ensures every `ipcRenderer.invoke` call uses a known channel name
 * with the correct payload type, and returns the correct result type.
 */
export function typedInvoke<K extends keyof IpcContract>(
  ...args: IpcContract[K]['payload'] extends void
    ? [channel: K]
    : [channel: K, payload: IpcContract[K]['payload']]
): Promise<IpcContract[K]['result']> {
  const [channel, payload] = args as [K, unknown]
  return ipcRenderer.invoke(channel, payload)
}
