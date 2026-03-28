import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import type { CodexCliRateLimit } from './types'

const CODEX_USAGE_LOG_PATH = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? '~',
  '.claude',
  'codex-cli-usage.jsonl'
)

const PRO_RATE_LIMIT_MAX = 300
const RATE_LIMIT_WINDOW_HOURS = 5
const NEAR_LIMIT_THRESHOLD_PERCENT = 80

interface CodexUsageEntry {
  readonly timestamp: string
  readonly taskDescription?: string
}

export class CodexCliHelper {
  private readonly usageLogPath: string

  constructor(usageLogPath?: string) {
    this.usageLogPath = usageLogPath ?? CODEX_USAGE_LOG_PATH
  }

  isCliInstalled(): boolean {
    try {
      execSync('which codex', { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }

  buildCliCommand(taskDescription: string): string {
    const escaped = taskDescription.replace(/'/g, "'\\''")
    return `codex '${escaped}'`
  }

  recordUsage(taskDescription?: string): void {
    const entry: CodexUsageEntry = {
      timestamp: new Date().toISOString(),
      taskDescription,
    }
    try {
      const dir = path.dirname(this.usageLogPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.appendFileSync(this.usageLogPath, JSON.stringify(entry) + '\n')
    } catch (error) {
      console.error('Failed to record Codex CLI usage:', (error as Error).message)
    }
  }

  getRateLimit(): CodexCliRateLimit {
    const windowStart = new Date()
    windowStart.setHours(windowStart.getHours() - RATE_LIMIT_WINDOW_HOURS)

    const entries = this.loadUsageEntries()
    const usedInWindow = entries.filter((e) => {
      const ts = new Date(e.timestamp)
      return ts >= windowStart
    }).length

    return {
      usedInWindow,
      maxInWindow: PRO_RATE_LIMIT_MAX,
      windowHours: RATE_LIMIT_WINDOW_HOURS,
      isNearLimit: (usedInWindow / PRO_RATE_LIMIT_MAX) * 100 >= NEAR_LIMIT_THRESHOLD_PERCENT,
    }
  }

  private loadUsageEntries(): readonly CodexUsageEntry[] {
    try {
      if (!fs.existsSync(this.usageLogPath)) {
        return []
      }
      const content = fs.readFileSync(this.usageLogPath, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)
      return lines.map((line) => JSON.parse(line) as CodexUsageEntry)
    } catch (error) {
      console.error('Failed to load Codex CLI usage log:', (error as Error).message)
      return []
    }
  }
}
