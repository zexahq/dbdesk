import {
  existsSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  copyFileSync,
  lstatSync,
  readdirSync,
  statSync
} from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { skillDir } from '../lib/paths'
import { runAction, warn, writeData, reportError } from '../lib/output'
import { CliError } from '../lib/errors'
import type { Command } from 'commander'

const SKILL_NAME = 'dbdesk'

interface AgentTarget {
  id: string
  label: string
  globalDir: () => string
  projectDir: () => string
}

const AGENTS: AgentTarget[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    globalDir: () => join(homedir(), '.claude', 'skills'),
    projectDir: () => join(process.cwd(), '.claude', 'skills')
  },
  {
    id: 'codex',
    label: 'Codex',
    globalDir: () => join(homedir(), '.codex', 'skills'),
    projectDir: () => join(process.cwd(), '.agents', 'skills')
  },
  {
    id: 'cursor',
    label: 'Cursor',
    globalDir: () => join(homedir(), '.cursor', 'skills'),
    projectDir: () => join(process.cwd(), '.cursor', 'skills')
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    globalDir: () => join(homedir(), '.config', 'opencode', 'skills'),
    projectDir: () => join(process.cwd(), '.opencode', 'skills')
  }
]

function skillSourceDir(): string {
  const dir = join(skillDir(), SKILL_NAME)
  if (!existsSync(join(dir, 'SKILL.md'))) {
    throw new CliError(
      'not-found',
      'Bundled agent guide not found.',
      'Reinstall dbdesk (`npm i -g dbdesk`) to restore it.'
    )
  }
  return dir
}

function isInstalled(linkPath: string, source: string): boolean {
  try {
    const st = lstatSync(linkPath)
    if (st.isSymbolicLink()) return true
    if (st.isDirectory()) {
      return existsSync(join(linkPath, 'SKILL.md'))
    }
    void source
    return true
  } catch {
    return false
  }
}

export function registerSkillCommands(program: Command): void {
  const skillCmd = program
    .command('skill')
    .description('Install the dbdesk guide for AI coding agents')

  skillCmd
    .command('print')
    .description('Print the agent guide (SKILL.md) to stdout')
    .option('--format <format>', 'output format: raw (default) or json', 'raw')
    .action(async (opts: { format: string }) => {
      const raw = typeof opts.format === 'string' ? opts.format.toLowerCase() : 'raw'
      const format = raw === 'json' ? 'json' : 'raw'
      if (raw !== 'json' && raw !== 'raw') {
        warn(`Unknown format "${opts.format}". Valid formats: raw, json. Using raw.`)
      }
      try {
        const content = readFileSync(join(skillSourceDir(), 'SKILL.md'), 'utf-8')
        if (format === 'json') {
          writeData({ content }, 'json')
        } else {
          console.log(content)
        }
      } catch (err) {
        process.exit(reportError(err, format === 'json' ? 'json' : 'table'))
      }
    })

  skillCmd
    .command('status')
    .description('Show where the agent guide is installed')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { format: string }) =>
      runAction(opts, ['table', 'json'], () => {
        const source = skillSourceDir()
        return AGENTS.map((agent) => {
          const global = join(agent.globalDir(), SKILL_NAME)
          const project = join(agent.projectDir(), SKILL_NAME)
          return {
            agent: agent.id,
            global: isInstalled(global, source) ? global : null,
            project: isInstalled(project, source) ? project : null
          }
        })
      })
    )

  skillCmd
    .command('install')
    .description('Install the agent guide into AI coding agents (symlink; idempotent)')
    .option(
      '--agent <id>',
      'agent to target (repeatable). Default: all detected.',
      collect,
      [] as string[]
    )
    .option('--scope <scope>', 'global (default) or project (current directory)', 'global')
    .option('--copy', 'copy files instead of symlinking')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { agent: string[]; scope: string; copy?: boolean; format: string }) =>
      runAction(opts, ['table', 'json'], () => {
        if (opts.scope !== 'global' && opts.scope !== 'project') {
          throw new CliError('usage', `Invalid scope "${opts.scope}". Use "global" or "project".`)
        }
        const wanted = opts.agent.map((a) => a.toLowerCase())
        const unknown = wanted.filter((a) => !AGENTS.some((t) => t.id === a))
        if (unknown.length > 0) {
          throw new CliError(
            'usage',
            `Unknown agent(s): ${unknown.join(', ')}.`,
            `Valid agents: ${AGENTS.map((t) => t.id).join(', ')}.`
          )
        }
        const targets = AGENTS.filter((t) => wanted.length === 0 || wanted.includes(t.id))
        if (targets.length === 0) {
          throw new CliError('usage', 'No agent targets selected.')
        }

        const source = skillSourceDir()
        const results = targets.map((agent) => {
          const base = opts.scope === 'project' ? agent.projectDir() : agent.globalDir()
          const dest = join(base, SKILL_NAME)
          if (isInstalled(dest, source)) {
            return { agent: agent.id, scope: opts.scope, path: dest, action: 'already-installed' }
          }
          mkdirSync(base, { recursive: true })
          if (opts.copy) {
            mkdirSync(dest, { recursive: true })
            copyFileSync(join(source, 'SKILL.md'), join(dest, 'SKILL.md'))
            const refs = join(source, 'references')
            if (existsSync(refs)) {
              copyDir(refs, join(dest, 'references'))
            }
          } else {
            try {
              symlinkSync(source, dest, 'junction')
            } catch {
              symlinkSync(source, dest)
            }
          }
          return {
            agent: agent.id,
            scope: opts.scope,
            path: dest,
            action: opts.copy ? 'copied' : 'linked'
          }
        })
        return results
      })
    )
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value]
}

function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    const s = join(src, entry)
    const d = join(dest, entry)
    if (statSync(s).isDirectory()) copyDir(s, d)
    else copyFileSync(s, d)
  }
}
