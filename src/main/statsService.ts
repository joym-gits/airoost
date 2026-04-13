import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import os from 'os'

// ─── Types ───────────────────────────────────────────────────────

export interface UsageStats {
  totalConversations: number
  totalMessages: number
  totalTokensEstimated: number
  modelUsage: Record<string, number> // model name -> message count
  modelResponseTimes: Record<string, number[]> // model name -> response times in ms
  conversationsPerDay: Record<string, number> // YYYY-MM-DD -> count
}

export interface BenchmarkResult {
  modelName: string
  modelPath: string
  tokensPerSecond: number
  responseTimeMs: number
  ramUsageMB: number
  timestamp: number
}

export interface LiveHardwareStats {
  cpuUsagePercent: number
  ramUsedGB: number
  ramTotalGB: number
  ramPercent: number
}

// ─── Persistence ─────────────────────────────────────────────────

let _configDir: string | null = null
function getConfigDir(): string {
  if (!_configDir) {
    _configDir = join(app.getPath('userData'), 'config')
    if (!existsSync(_configDir)) mkdirSync(_configDir, { recursive: true })
  }
  return _configDir
}

function getStatsFile(): string { return join(getConfigDir(), 'usage-stats.json') }
function getBenchmarksFile(): string { return join(getConfigDir(), 'benchmarks.json') }

function loadStats(): UsageStats {
  const file = getStatsFile()
  if (!existsSync(file)) return {
    totalConversations: 0, totalMessages: 0, totalTokensEstimated: 0,
    modelUsage: {}, modelResponseTimes: {}, conversationsPerDay: {}
  }
  try { return JSON.parse(readFileSync(file, 'utf-8')) } catch { return loadStats() }
}

function saveStats(stats: UsageStats): void {
  writeFileSync(getStatsFile(), JSON.stringify(stats, null, 2))
}

function loadBenchmarks(): BenchmarkResult[] {
  const file = getBenchmarksFile()
  if (!existsSync(file)) return []
  try { return JSON.parse(readFileSync(file, 'utf-8')) } catch { return [] }
}

function saveBenchmarks(benchmarks: BenchmarkResult[]): void {
  writeFileSync(getBenchmarksFile(), JSON.stringify(benchmarks, null, 2))
}

// ─── Stats API ───────────────────────────────────────────────────

export function getUsageStats(): UsageStats {
  return loadStats()
}

export function recordConversation(): void {
  const stats = loadStats()
  stats.totalConversations++
  const today = new Date().toISOString().split('T')[0]
  stats.conversationsPerDay[today] = (stats.conversationsPerDay[today] ?? 0) + 1
  saveStats(stats)
}

export function recordMessage(modelName: string, responseTimeMs: number, tokenCount: number): void {
  const stats = loadStats()
  stats.totalMessages++
  stats.totalTokensEstimated += tokenCount
  stats.modelUsage[modelName] = (stats.modelUsage[modelName] ?? 0) + 1
  if (!stats.modelResponseTimes[modelName]) stats.modelResponseTimes[modelName] = []
  stats.modelResponseTimes[modelName].push(responseTimeMs)
  // Keep only last 100 response times per model
  if (stats.modelResponseTimes[modelName].length > 100) {
    stats.modelResponseTimes[modelName] = stats.modelResponseTimes[modelName].slice(-100)
  }
  saveStats(stats)
}

export function getMostUsedModel(): string | null {
  const stats = loadStats()
  let max = 0
  let best: string | null = null
  for (const [model, count] of Object.entries(stats.modelUsage)) {
    if (count > max) { max = count; best = model }
  }
  return best
}

// ─── Benchmarks ──────────────────────────────────────────────────

export function getBenchmarks(): BenchmarkResult[] {
  return loadBenchmarks()
}

export function saveBenchmark(result: BenchmarkResult): void {
  const benchmarks = loadBenchmarks()
  // Replace existing benchmark for same model or add new
  const idx = benchmarks.findIndex((b) => b.modelPath === result.modelPath)
  if (idx !== -1) benchmarks[idx] = result
  else benchmarks.push(result)
  saveBenchmarks(benchmarks)
}

// ─── Live Hardware ───────────────────────────────────────────────

let prevCpuTimes: { idle: number; total: number } | null = null

export function getLiveHardwareStats(): LiveHardwareStats {
  // CPU usage
  const cpus = os.cpus()
  let idle = 0, total = 0
  for (const cpu of cpus) {
    idle += cpu.times.idle
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle
  }

  let cpuUsagePercent = 0
  if (prevCpuTimes) {
    const idleDiff = idle - prevCpuTimes.idle
    const totalDiff = total - prevCpuTimes.total
    cpuUsagePercent = totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0
  }
  prevCpuTimes = { idle, total }

  // RAM
  const ramTotalGB = Math.round(os.totalmem() / 1e9 * 10) / 10
  const ramFreeGB = Math.round(os.freemem() / 1e9 * 10) / 10
  const ramUsedGB = Math.round((ramTotalGB - ramFreeGB) * 10) / 10
  const ramPercent = Math.round((ramUsedGB / ramTotalGB) * 100)

  return { cpuUsagePercent, ramUsedGB, ramTotalGB, ramPercent }
}
