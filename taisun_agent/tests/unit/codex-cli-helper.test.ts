import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import { CodexCliHelper } from '../../src/performance/CodexCliHelper'

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}))

const TEST_LOG_DIR = path.join(__dirname, '..', '.tmp')
const TEST_USAGE_LOG = path.join(TEST_LOG_DIR, 'test-codex-usage.jsonl')

beforeEach(() => {
  jest.clearAllMocks()
  if (fs.existsSync(TEST_USAGE_LOG)) {
    fs.unlinkSync(TEST_USAGE_LOG)
  }
  if (!fs.existsSync(TEST_LOG_DIR)) {
    fs.mkdirSync(TEST_LOG_DIR, { recursive: true })
  }
})

afterAll(() => {
  if (fs.existsSync(TEST_USAGE_LOG)) {
    fs.unlinkSync(TEST_USAGE_LOG)
  }
})

describe('CodexCliHelper', () => {
  describe('isCliInstalled', () => {
    it('should return true when codex CLI is found', () => {
      const mockExec = execSync as jest.MockedFunction<typeof execSync>
      mockExec.mockReturnValue(Buffer.from('/usr/local/bin/codex'))

      const cli = new CodexCliHelper(TEST_USAGE_LOG)
      expect(cli.isCliInstalled()).toBe(true)
      expect(mockExec).toHaveBeenCalledWith('which codex', { stdio: 'ignore' })
    })

    it('should return false when codex CLI is not found', () => {
      const mockExec = execSync as jest.MockedFunction<typeof execSync>
      mockExec.mockImplementation(() => {
        throw new Error('not found')
      })

      const cli = new CodexCliHelper(TEST_USAGE_LOG)
      expect(cli.isCliInstalled()).toBe(false)
    })
  })

  describe('buildCliCommand', () => {
    it('should build a codex CLI command from task description', () => {
      const cli = new CodexCliHelper(TEST_USAGE_LOG)
      const cmd = cli.buildCliCommand('Fix the login bug')
      expect(cmd).toBe("codex 'Fix the login bug'")
    })

    it('should escape single quotes in task description', () => {
      const cli = new CodexCliHelper(TEST_USAGE_LOG)
      const cmd = cli.buildCliCommand("Fix the user's profile page")
      expect(cmd).toBe("codex 'Fix the user'\\''s profile page'")
    })

    it('should handle empty description', () => {
      const cli = new CodexCliHelper(TEST_USAGE_LOG)
      const cmd = cli.buildCliCommand('')
      expect(cmd).toBe("codex ''")
    })
  })

  describe('recordUsage', () => {
    it('should append usage entry to log file', () => {
      const cli = new CodexCliHelper(TEST_USAGE_LOG)
      cli.recordUsage('Fix authentication bug')

      const content = fs.readFileSync(TEST_USAGE_LOG, 'utf-8')
      const lines = content.trim().split('\n')
      expect(lines).toHaveLength(1)

      const entry = JSON.parse(lines[0])
      expect(entry.timestamp).toBeDefined()
      expect(entry.taskDescription).toBe('Fix authentication bug')
    })

    it('should append multiple entries', () => {
      const cli = new CodexCliHelper(TEST_USAGE_LOG)
      cli.recordUsage('Task 1')
      cli.recordUsage('Task 2')
      cli.recordUsage('Task 3')

      const content = fs.readFileSync(TEST_USAGE_LOG, 'utf-8')
      const lines = content.trim().split('\n')
      expect(lines).toHaveLength(3)
    })

    it('should record entry without task description', () => {
      const cli = new CodexCliHelper(TEST_USAGE_LOG)
      cli.recordUsage()

      const content = fs.readFileSync(TEST_USAGE_LOG, 'utf-8')
      const entry = JSON.parse(content.trim())
      expect(entry.timestamp).toBeDefined()
      expect(entry.taskDescription).toBeUndefined()
    })

    it('should create directory if it does not exist', () => {
      const nestedPath = path.join(TEST_LOG_DIR, 'nested', 'codex-usage.jsonl')
      const cli = new CodexCliHelper(nestedPath)
      cli.recordUsage('Test')

      expect(fs.existsSync(nestedPath)).toBe(true)

      // cleanup
      fs.unlinkSync(nestedPath)
      fs.rmdirSync(path.join(TEST_LOG_DIR, 'nested'))
    })
  })

  describe('getRateLimit', () => {
    it('should return zero usage when no log exists', () => {
      const cli = new CodexCliHelper(TEST_USAGE_LOG)
      const limit = cli.getRateLimit()

      expect(limit.usedInWindow).toBe(0)
      expect(limit.maxInWindow).toBe(300)
      expect(limit.windowHours).toBe(5)
      expect(limit.isNearLimit).toBe(false)
    })

    it('should count entries within the 5-hour window', () => {
      const cli = new CodexCliHelper(TEST_USAGE_LOG)

      const now = new Date()
      const entries = [
        { timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString() },
        { timestamp: new Date(now.getTime() - 1000 * 60 * 60).toISOString() },
        { timestamp: new Date(now.getTime() - 1000 * 60 * 120).toISOString() },
      ]
      fs.writeFileSync(
        TEST_USAGE_LOG,
        entries.map((e) => JSON.stringify(e)).join('\n') + '\n'
      )

      const limit = cli.getRateLimit()
      expect(limit.usedInWindow).toBe(3)
      expect(limit.isNearLimit).toBe(false)
    })

    it('should exclude entries outside the 5-hour window', () => {
      const cli = new CodexCliHelper(TEST_USAGE_LOG)

      const now = new Date()
      const entries = [
        { timestamp: new Date(now.getTime() - 1000 * 60 * 60).toISOString() },
        { timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 6).toISOString() },
        { timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString() },
      ]
      fs.writeFileSync(
        TEST_USAGE_LOG,
        entries.map((e) => JSON.stringify(e)).join('\n') + '\n'
      )

      const limit = cli.getRateLimit()
      expect(limit.usedInWindow).toBe(1)
    })

    it('should report near limit when usage exceeds 80%', () => {
      const cli = new CodexCliHelper(TEST_USAGE_LOG)

      const now = new Date()
      const entries = Array.from({ length: 245 }, (_, i) => ({
        timestamp: new Date(now.getTime() - 1000 * i).toISOString(),
      }))
      fs.writeFileSync(
        TEST_USAGE_LOG,
        entries.map((e) => JSON.stringify(e)).join('\n') + '\n'
      )

      const limit = cli.getRateLimit()
      expect(limit.usedInWindow).toBe(245)
      expect(limit.isNearLimit).toBe(true)
    })
  })
})
