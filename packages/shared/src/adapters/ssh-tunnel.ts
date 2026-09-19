import type { SSHTunnelOptions } from '../types/sql'
import { spawn, type ChildProcess } from 'node:child_process'
import { createConnection, createServer } from 'node:net'
import { homedir } from 'node:os'
import { join } from 'node:path'

type TunnelTarget = { host: string; port: number }

export const expandHomePath = (path: string, home = homedir()): string =>
  path === '~' ? home : path.startsWith('~/') ? join(home, path.slice(2)) : path

export const buildSshArgs = (
  options: SSHTunnelOptions,
  target: TunnelTarget,
  localPort: number
): string[] => {
  const args = [
    '-N',
    '-T',
    '-o',
    'BatchMode=yes',
    '-o',
    'ExitOnForwardFailure=yes',
    '-o',
    'ServerAliveInterval=30',
    '-o',
    'ServerAliveCountMax=3',
    '-L',
    `127.0.0.1:${localPort}:${target.host}:${target.port}`
  ]
  if (options.port) args.push('-p', String(options.port))
  if (options.identityFile) args.push('-i', expandHomePath(options.identityFile))
  args.push(`${options.user}@${options.host}`)
  return args
}

const reserveLocalPort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close((error) => (error ? reject(error) : resolve(port)))
    })
  })

const waitForTunnel = (
  process: ChildProcess,
  localPort: number,
  getError: () => string
): Promise<void> =>
  new Promise((resolve, reject) => {
    const deadline = Date.now() + 10_000

    const fail = (message: string) => {
      cleanup()
      reject(new Error(message))
    }
    const onError = (error: Error) => fail(`Unable to start OpenSSH: ${error.message}`)
    const onExit = (code: number | null) =>
      fail(`OpenSSH tunnel exited (${code ?? 'signal'}): ${getError() || 'unknown error'}`)
    const cleanup = () => {
      process.removeListener('error', onError)
      process.removeListener('exit', onExit)
    }
    const check = () => {
      const socket = createConnection({ host: '127.0.0.1', port: localPort })
      socket.once('connect', () => {
        socket.destroy()
        cleanup()
        resolve()
      })
      socket.once('error', () => {
        socket.destroy()
        if (Date.now() >= deadline) {
          fail(`Timed out starting OpenSSH tunnel: ${getError() || 'no diagnostics'}`)
        } else {
          setTimeout(check, 100)
        }
      })
    }

    process.once('error', onError)
    process.once('exit', onExit)
    check()
  })

export class SSHTunnel {
  private constructor(
    readonly localPort: number,
    private readonly process: ChildProcess
  ) {}

  static async start(options: SSHTunnelOptions, target: TunnelTarget): Promise<SSHTunnel> {
    const localPort = await reserveLocalPort()
    let stderr = ''
    const process = spawn('ssh', buildSshArgs(options, target, localPort), {
      shell: false,
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true
    })
    process.on('error', (error) => console.error('[ssh] tunnel process error:', error.message))
    process.stderr?.on('data', (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString()}`.slice(-4000)
    })

    try {
      await waitForTunnel(process, localPort, () => stderr.trim())
      return new SSHTunnel(localPort, process)
    } catch (error) {
      process.kill()
      throw error
    }
  }

  get isActive(): boolean {
    return this.process.exitCode === null && this.process.signalCode === null
  }

  async stop(): Promise<void> {
    if (this.process.exitCode !== null || this.process.signalCode !== null) return
    this.process.kill('SIGTERM')
    await Promise.race([
      new Promise<void>((resolve) => this.process.once('close', () => resolve())),
      new Promise<void>((resolve) => setTimeout(resolve, 2000))
    ])
    if (this.process.exitCode === null && this.process.signalCode === null) {
      this.process.kill('SIGKILL')
    }
  }
}
