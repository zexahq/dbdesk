import { typedHandle } from './typed-handle'
import { isCliInstalled, wasCliPromptDismissed, dismissCliPrompt, installCli } from '../cli-setup'

export function registerCliHandlers() {
  typedHandle('cli:get-status', async () => {
    return {
      installed: isCliInstalled(),
      promptDismissed: wasCliPromptDismissed()
    }
  })

  typedHandle('cli:install', async () => {
    const result = installCli()
    return result
  })

  typedHandle('cli:dismiss-prompt', async () => {
    dismissCliPrompt()
  })
}
