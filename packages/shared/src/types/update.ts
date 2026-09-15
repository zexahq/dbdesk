export type UpdateState =
  | { status: 'idle' }
  | { status: 'manual'; message: string }
  | { status: 'checking' }
  | { status: 'up-to-date' }
  | { status: 'available'; version: string; releaseNotes?: string }
  | { status: 'downloading'; version: string; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string }
