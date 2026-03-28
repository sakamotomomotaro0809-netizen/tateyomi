#!/usr/bin/env npx ts-node
/**
 * LLM Auto-Switching System v1.0 - Cost Report CLI
 * Usage: npx ts-node scripts/cost-report.ts [--period=day|week|month] [--json]
 */
import * as fs from 'fs'
import * as path from 'path'

interface CostRecord {
  readonly timestamp: string
  readonly model: string
  readonly provider: string
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cachedTokens: number
  readonly cost: number
}

function parseArgs(): { period: string; json: boolean } {
  const args = process.argv.slice(2)
  let period = 'day'
  let json = false
  for (const arg of args) {
    if (arg.startsWith('--period=')) period = arg.split('=')[1]
    if (arg === '--json') json = true
  }
  return { period, json }
}

function loadRecords(logPath: string): CostRecord[] {
  if (!fs.existsSync(logPath)) return []
  return fs.readFileSync(logPath, 'utf-8').trim().split('\n').filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line) as CostRecord] } catch { return [] }
  })
}

function filterByPeriod(records: CostRecord[], period: string): CostRecord[] {
  const now = new Date()
  let cutoff: Date
  switch (period) {
    case 'week': { const d = new Date(now); d.setDate(d.getDate() - 7); cutoff = d; break }
    case 'month': cutoff = new Date(now.getFullYear(), now.getMonth(), 1); break
    default: cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  return records.filter((r) => new Date(r.timestamp) >= cutoff)
}

function main(): void {
  const { period, json } = parseArgs()
  const projLog = path.join(process.cwd(), 'logs', 'cost-tracking.jsonl')
  const globalLog = path.join(process.env.HOME ?? '~', '.claude', 'global-cost-tracking.jsonl')
  const all = [...loadRecords(projLog), ...loadRecords(globalLog)]

  if (all.length === 0) { console.log('No cost records found.'); return }

  const filtered = filterByPeriod(all, period)
  const totalCost = filtered.reduce((s, r) => s + r.cost, 0)
  const byModel: Record<string, { cost: number; reqs: number }> = {}
  const byProvider: Record<string, { cost: number; reqs: number }> = {}

  for (const r of filtered) {
    if (!byModel[r.model]) byModel[r.model] = { cost: 0, reqs: 0 }
    byModel[r.model].cost += r.cost; byModel[r.model].reqs += 1
    if (!byProvider[r.provider]) byProvider[r.provider] = { cost: 0, reqs: 0 }
    byProvider[r.provider].cost += r.cost; byProvider[r.provider].reqs += 1
  }

  const report = { period, totalCost: Math.round(totalCost * 10000) / 10000, requests: filtered.length, byModel, byProvider }

  if (json) { console.log(JSON.stringify(report, null, 2)); return }

  console.log('\n============================================')
  console.log('  LLM Cost Report - Period:', period)
  console.log('============================================')
  console.log('  Total Cost:     $' + report.totalCost)
  console.log('  Total Requests: ' + report.requests)
  console.log('\n  --- By Model ---')
  for (const [m, d] of Object.entries(byModel).sort((a, b) => b[1].cost - a[1].cost)) {
    console.log('  ' + m.padEnd(22) + '$' + d.cost.toFixed(4).padStart(8) + '  (' + d.reqs + ' reqs)')
  }
  console.log('\n  --- By Provider ---')
  for (const [p, d] of Object.entries(byProvider).sort((a, b) => b[1].cost - a[1].cost)) {
    console.log('  ' + p.padEnd(22) + '$' + d.cost.toFixed(4).padStart(8) + '  (' + d.reqs + ' reqs)')
  }
  console.log('============================================')
}

main()
