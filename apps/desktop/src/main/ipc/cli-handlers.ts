import { typedHandle } from './typed-handle'
import {
  isCliInstalled,
  wasCliPromptDismissed,
  dismissCliPrompt,
  installCli,
  uninstallCli,
  getInstallTarget
} from '../cli-setup'

export function registerCliHandlers() {
  typedHandle('cli:get-status', async () => {
    return {
      installed: isCliInstalled(),
      promptDismissed: wasCliPromptDismissed(),
      path: getInstallTarget().path
    }
  })

  typedHandle('cli:install', async () => {
    const result = installCli()
    return result
  })

  typedHandle('cli:uninstall', async () => {
    const result = uninstallCli()
    return result
  })

  typedHandle('cli:dismiss-prompt', async () => {
    dismissCliPrompt()
  })
}
