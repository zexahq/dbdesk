import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@renderer/components/ui/button'
import { requestSignIn } from '@renderer/features/auth/lib/auth-utils'
import DbDeskLogo from '@renderer/assets/dbdesk-logo.svg'
import { Toaster } from '@renderer/components/ui/sonner'

const AuthPage = () => {
  const handleLogin = async () => {
    try {
      await requestSignIn()
    } catch (error) {
      console.error('Failed to initiate login:', error)
    }
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
