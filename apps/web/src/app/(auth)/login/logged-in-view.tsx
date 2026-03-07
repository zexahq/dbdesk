"use client"

import { useState } from 'react'
import type { ElectronAuthQuery } from '@/app/lib/auth-client'
import { authClient, toLoginURL, transferElectronUser } from '@/app/lib/auth-client'

interface LoggedInViewProps {
  email: string
  query: ElectronAuthQuery
}

export function LoggedInView({ email, query }: LoggedInViewProps) {
  const [isContinuing, setIsContinuing] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleContinue = async () => {
    setIsContinuing(true)

    try {
      const result = await transferElectronUser(query)

      if (result.redirect && result.url) {
        window.location.href = result.url
      }
    } catch (error) {
      console.error(error)
      setIsContinuing(false)
    }
  }

  const handleLogout = async () => {
    setSigningOut(true)
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = toLoginURL(query)
        },
      },
    })
  }

  return (
    <div className="flex flex-col flex-1 -translate-y-16">
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-24">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-fd-foreground mb-2">
              Log in to DBDesk?
            </h1>
            <p className="text-fd-muted-foreground mb-6">
              You&apos;re currently logged in as:
            </p>
          </div>

          <div className="rounded-lg border border-fd-border bg-fd-secondary/30 px-4 py-3">
            <p className="text-center text-fd-foreground font-medium">
              {email}
            </p>
          </div>

          <p className="text-fd-muted-foreground text-sm">
            If DBDesk is not currently signed in, use the button below to send
            this web session back to the desktop app.
          </p>

          <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
            <button
              onClick={() => void handleContinue()}
              disabled={isContinuing || signingOut}
              className="w-full rounded-lg border border-fd-foreground bg-fd-foreground px-4 py-3 font-medium text-fd-background transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isContinuing ? 'Opening DBDesk...' : 'Open DBDesk'}
            </button>
            <button
              onClick={handleLogout}
              disabled={signingOut || isContinuing}
              className="w-full rounded-lg border border-fd-border bg-fd-secondary/30 px-4 py-3 font-medium text-fd-foreground transition-all hover:bg-fd-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingOut ? 'Logging out...' : 'Use a different account'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
