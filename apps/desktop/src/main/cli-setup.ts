/**
 * CLI installation module — cross-platform.
 * Creates a symlink/wrapper so `dbdesk` is available on the user's PATH.
 * Uses ELECTRON_RUN_AS_NODE=1 so no external Node.js is needed.
 */
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { app } from 'electron'
import { appMeta, eq, getDb } from '@dbdesk/db'

const META_KEY_PROMPT_DISMISSED = 'cli:prompt_dismissed'

function getCliDir(): string {
  // The shell script + CLI JS live at process.resourcesPath/cli/
  return join(process.resourcesPath, 'cli')
}

function getShellScript(): string {
  return join(getCliDir(), 'dbdesk.sh')
}

export function getInstallTarget(): { dir: string; path: string } {
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
      const base = process.env.LOCALAPPDATA || join(app.getPath('home'), 'AppData', 'Local')
      const dir = join(base, 'Programs', 'dbdesk')
      return { dir, path: join(dir, 'dbdesk.cmd') }
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

export function isCliInstalled(): boolean {
  try {
    return isOursTarget(getInstallTarget().path)
  } catch {
    return false
  }
}

function targetExists(targetPath: string): boolean {
  try {
    lstatSync(targetPath)
    return true
  } catch {
    return false
  }
}

function windowsWrapper(): string {
  const cliJs = join(getCliDir(), 'dist', 'index.js')
  const nodeModules = join(getCliDir(), 'node_modules')
  return (
    '@echo off\r\n' +
    'set "ELECTRON_RUN_AS_NODE=1"\r\n' +
    `set "NODE_PATH=${nodeModules}"\r\n` +
    `"${process.execPath}" "${cliJs}" %*\r\n`
  )
}

/**
 * True only when the install target exists AND was created by DBDesk:
 * a symlink pointing at our bundle (unix) or our generated wrapper (win32).
 * Never true for foreign files that happen to share the path.
 */
function isOursTarget(targetPath: string): boolean {
  try {
    if (!targetExists(targetPath)) return false
    if (process.platform === 'win32') {
      const stat = lstatSync(targetPath)
      if (!stat.isFile()) return false
      return readFileSync(targetPath, 'utf-8') === windowsWrapper()
    }
    const stat = lstatSync(targetPath)
    if (!stat.isSymbolicLink()) return false
    const linkTarget = resolve(dirname(targetPath), readlinkSync(targetPath))
    return linkTarget === getShellScript()
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

export function installCli(): { ok: true } | { ok: false; error: string } {
  const platform = process.platform
  const shellScript = getShellScript()

  if (!existsSync(shellScript)) {
    if (!app.isPackaged) {
      return {
        ok: false,
        error: 'CLI install is only available in packaged builds of DBDesk.'
      }
    }
    return {
      ok: false,
      error: `CLI shell script not found at ${shellScript}. Please reinstall DBDesk.`
    }
  }

  if (platform === 'linux' && process.env.APPIMAGE) {
    return {
      ok: false,
      error: 'AppImage cannot install a persistent CLI. Install dbdesk globally with npm instead.'
    }
  }

  const target = getInstallTarget()
  if (targetExists(target.path)) {
    if (!isOursTarget(target.path)) {
      return {
        ok: false,
        error: `"${target.path}" already exists and was not installed by DBDesk. It was left alone.`
      }
    }
    try {
      rmSync(target.path)
    } catch {
      return { ok: false, error: `Cannot replace existing "${target.path}".` }
    }
  }

  try {
    switch (platform) {
      case 'darwin':
      case 'linux': {
        const { dir, path: targetPath } = target

        // Ensure the bin directory exists
        try {
          mkdirSync(dir, { recursive: true })
        } catch {
          return {
            ok: false,
            error:
              `Cannot create "${dir}". ` +
              `Run: sudo mkdir -p "${dir}" && sudo chown $(whoami) "${dir}"`
          }
        }

        // Create symlink
        try {
          chmodSync(shellScript, 0o755)
          symlinkSync(shellScript, targetPath)
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
        const { dir, path: targetPath } = target

        try {
          mkdirSync(dir, { recursive: true })
        } catch {
          return { ok: false, error: `Cannot create "${dir}".` }
        }

        writeFileSync(targetPath, windowsWrapper())

        break
      }

      default:
        return { ok: false, error: `Unsupported platform: ${platform}` }
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
export function uninstallCli(): { ok: true } | { ok: false; error: string } {
  try {
    const { path: targetPath } = getInstallTarget()
    if (!targetExists(targetPath)) return { ok: true }
    if (!isOursTarget(targetPath)) {
      return {
        ok: false,
        error:
          `"${targetPath}" was not installed by DBDesk, so it was left alone. ` +
          `Remove it manually if you are sure it is safe.`
      }
    }
    rmSync(targetPath)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
