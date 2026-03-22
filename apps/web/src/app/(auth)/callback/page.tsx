"use client"

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  authClient,
  getElectronAuthQuery,
  hasElectronAuthQuery,
} from '@/app/lib/auth-client'

function CallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const electronQuery = getElectronAuthQuery(searchParams)
  const isElectronFlow = hasElectronAuthQuery(electronQuery)

  useEffect(() => {
    if (!isElectronFlow) {
      router.replace('/')
      return
    }

    const timeout = authClient.ensureElectronRedirect()
    return () => clearTimeout(timeout)
  }, [isElectronFlow, router])

  return (
    <div className="flex flex-col flex-1 -translate-y-16">
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-24">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-fd-foreground mb-2">
              Completing Login
            </h1>
            <p className="text-fd-muted-foreground mb-6">
              Please wait while we redirect you to DBDesk...
            </p>
          </div>

          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-fd-border border-t-fd-foreground" />
          </div>
        </div>
      </section>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 -translate-y-16">
          <section className="flex flex-col items-center justify-center flex-1 px-6 py-24">
            <div className="w-full max-w-md space-y-6">
              <div className="flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-fd-border border-t-fd-foreground" />
              </div>
            </div>
          </section>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  )
}
