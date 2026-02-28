import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@renderer/components/ui/button'
import { getLoginUrl } from '@renderer/features/auth/lib/auth-utils'
import DbDeskLogo from '@renderer/assets/dbdesk-logo.svg'
import { Toaster } from '@renderer/components/ui/sonner'
import { useAuthStore } from '@renderer/features/auth/stores/auth-store'
import { Loader2 } from 'lucide-react'

const AuthPage = () => {
  const { isLoading } = useAuthStore()

  const handleLogin = async () => {
    try {
      const url = await getLoginUrl()
      window.open(url, '_blank')
    } catch (error) {
      console.error('Failed to initiate social login:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-36px)] items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-36px)]  items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg p-8 flex flex-col -translate-y-16">
        <div className="flex flex-col gap-2">
          <img src={DbDeskLogo} alt="DBDesk" className="h-8 w-8" />
          <h1 className="text-2xl flex items-center font-bold">DBDesk</h1>
          <p className="text-sm text-muted-foreground">
            The new experience for SQL database management.
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={handleLogin} variant="default" className="w-full" size="sm">
            Sign in
          </Button>
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  )
}

export const Route = createFileRoute('/auth')({
  component: AuthPage
})
