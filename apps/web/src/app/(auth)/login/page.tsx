"use client"

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  authClient,
  getElectronAuthQuery,
  hasElectronAuthQuery,
} from '@/app/lib/auth-client'
import { LoggedInView } from './logged-in-view'
import { LoginForm } from './login-form'

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const electronQuery = getElectronAuthQuery(searchParams)
  const isElectronFlow = hasElectronAuthQuery(electronQuery)
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!isElectronFlow && !isPending) {
      router.replace('/')
    }
  }, [isElectronFlow, isPending, router])

  useEffect(() => {
    if (!isElectronFlow) return

    const timeout = authClient.ensureElectronRedirect()
    return () => clearTimeout(timeout)
  }, [isElectronFlow])

  if (isPending) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center -translate-y-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-fd-border border-t-fd-foreground" />
      </div>
    )
  }

  if (!isElectronFlow) {
    return null
  }

  if (session?.user?.email) {
    return <LoggedInView email={session.user.email} query={electronQuery} />
  }

  return <LoginForm query={electronQuery} />
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 items-center justify-center -translate-y-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-fd-border border-t-fd-foreground" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
