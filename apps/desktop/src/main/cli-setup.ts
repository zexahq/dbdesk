/**
 * CLI installation module — cross-platform.
 * Creates a symlink/wrapper so `dbdesk` is available on the user's PATH.
 * Uses ELECTRON_RUN_AS_NODE=1 so no external Node.js is needed.
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, symlinkSync, writeFileSync, chmodSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { getDb } from '@dbdesk/db'
import { appMeta } from '@dbdesk/db'

const META_KEY_INSTALLED = 'cli:installed'
const META_KEY_PROMPT_DISMISSED = 'cli:prompt_dismissed'

function getCliDir(): string {
  // The shell script + CLI JS live at process.resourcesPath/cli/
  return join(process.resourcesPath, 'cli')
}

function getShellScript(): string {
  return join(getCliDir(), 'dbdesk.sh')
}

function getInstallTarget(): { dir: string; path: string } {
  const platform = process.platform

  switch (platform) {
    case 'darwin': {
      const dir = '/usr/local/bin'
      return { dir, path: join(dir, 'dbdesk') }
    }
    case 'linux': {
      const dir = '/usr/bin'
      return { dir, path: join(dir, 'dbdesk') }
    }
    case 'win32': {
      const dir = join(process.env.LOCALAPPDATA || join(app.getPath('home'), 'AppData', 'Local'), 'Programs', 'dbdesk')
      return { dir, path: join(dir, 'dbdesk.cmd') }
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

export function isCliInstalled(): boolean {
  try {
    // Check our app_meta flag first
    const row = getDb()
      .select({ value: appMeta.value })
      .from(appMeta)
      .where(eq(appMeta.key, META_KEY_INSTALLED))
      .get()

    if (row?.value === 'true') return true

    // Fallback: check if the target binary exists and points to us
    const { path: targetPath } = getInstallTarget()
    if (process.platform === 'win32') {
      return existsSync(targetPath)
    } else {
      if (!existsSync(targetPath)) return false
      try {
        const linkTarget = execSync(`readlink "${targetPath}"`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore']
        }).trim()
        return linkTarget.includes('dbdesk') || linkTarget.includes('DBDesk')
      } catch {
        return false
      }
    }
  } catch {
    return false
  }
}

export function wasCliPromptDismissed(): boolean {
  try {
    const row = getDb()
      .select({ value: appMeta.value })
      .from(appMeta)
      .where(eq(appMeta.key, META_KEY_PROMPT_DISMISSED))
      .get()

    return row?.value === 'true'
  } catch {
    return false
  }
}

export function dismissCliPrompt(): void {
  try {
    getDb()
      .insert(appMeta)
      .values({ key: META_KEY_PROMPT_DISMISSED, value: 'true' })
      .onConflictDoUpdate({
        target: appMeta.key,
        set: { value: 'true' }
      })
      .run()
  } catch {
    // Non-critical
  }
}

export function markCliChanged(): void {
  try {
    const installed = isCliActuallyOnPath()
    getDb()
      .insert(appMeta)
      .values({ key: META_KEY_INSTALLED, value: String(installed) })
      .onConflictDoUpdate({
        target: appMeta.key,
        set: { value: String(installed) }
      })
      .run()
  } catch {
    // Non-critical
  }
}

function isCliActuallyOnPath(): boolean {
  try {
    execSync('which dbdesk', { stdio: 'ignore', encoding: 'utf-8' })
    return true
  } catch {
    return false
  }
}

export function installCli(): { ok: true } | { ok: false; error: string } {
  const platform = process.platform
  const shellScript = getShellScript()

  if (!existsSync(shellScript)) {
    return { ok: false, error: `CLI shell script not found at ${shellScript}. Please reinstall DBDesk.` }
  }

  try {
    switch (platform) {
      case 'darwin':
      case 'linux': {
        const { dir, path: targetPath } = getInstallTarget()

        // Remove existing symlink/file if it's not ours
        if (existsSync(targetPath)) {
          try {
            rmSync(targetPath)
          } catch {
            return {
              ok: false,
              error: `Cannot remove existing "${targetPath}". Run: sudo rm "${targetPath}"`
            }
          }
        }

        // Ensure the bin directory exists
        try {
          mkdirSync(dir, { recursive: true })
        } catch {
          return {
            ok: false,
            error: `Cannot create "${dir}". Run: sudo mkdir -p "${dir}" && sudo chown $(whoami) "${dir}"`
          }
        }

        // Create symlink
        try {
          symlinkSync(shellScript, targetPath)
          chmodSync(shellScript, 0o755)
        } catch (err) {
          const msg = String(err)
          if (msg.includes('EACCES') || msg.includes('permission denied')) {
            return {
              ok: false,
              error: `Permission denied. Run: sudo ln -sf "${shellScript}" "${targetPath}"`
            }
          }
          return { ok: false, error: `Failed to create symlink: ${msg}` }
        }

        break
      }

      case 'win32': {
        const { dir, path: targetPath } = getInstallTarget()

        try {
          mkdirSync(dir, { recursive: true })
        } catch {
          return { ok: false, error: `Cannot create "${dir}".` }
        }

        // Create a .cmd wrapper that runs the shell script via Git Bash or WSL
        // For Windows, we create a .cmd file that uses node to run the CLI directly
        const cliJs = join(getCliDir(), 'index.js')
        const cmdContent = `@echo off\r\n"${process.execPath}" "${cliJs}" %*`
        writeFileSync(targetPath, cmdContent)

        break
      }

      default:
        return { ok: false, error: `Unsupported platform: ${platform}` }
    }

    markCliChanged()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export function uninstallCli(): { ok: true } | { ok: false; error: string } {
  try {
    const { path: targetPath } = getInstallTarget()
    if (existsSync(targetPath)) {
      rmSync(targetPath)
    }
    markCliChanged()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

import { eq } from '@dbdesk/db'
