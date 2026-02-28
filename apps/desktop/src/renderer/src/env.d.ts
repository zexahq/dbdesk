/// <reference types="vite/client" />

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorkerUrl?: (moduleId: string, label: string) => string
      getWorker?: (moduleId: string, label: string) => Worker
    }
  }

  const MonacoEnvironment: {
    getWorkerUrl?: (moduleId: string, label: string) => string
    getWorker?: (moduleId: string, label: string) => Worker
  }
}
