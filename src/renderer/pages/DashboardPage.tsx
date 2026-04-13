import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

export default function DashboardPage() {
  const { installedModels, hardware } = useAppStore()

  const [stats, setStats] = useState<UsageStatsData | null>(null)
  const [benchmarks, setBenchmarks] = useState<BenchmarkResultData[]>([])
  const [hwLive, setHwLive] = useState<LiveHWData | null>(null)
  const [benchmarking, setBenchmarking] = useState<string | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    window.airoost.getStats().then(setStats)
    window.airoost.getBenchmarks().then(setBenchmarks)
    window.airoost.getHWLive().then(setHwLive)

    // Poll hardware stats every 2s
    intervalRef.current = setInterval(async () => {
      setHwLive(await window.airoost.getHWLive())
    }, 2000)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const handleBenchmark = async (model: InstalledModel) => {
    setBenchmarking(model.id)
    try {
      const result = await window.airoost.runBenchmark(model.path, model.name)
      setBenchmarks((prev) => {
        const filtered = prev.filter((b) => b.modelPath !== model.path)
        return [...filtered, result]
      })
    } catch (err) {
      console.error('Benchmark failed:', err)
    } finally {
      setBenchmarking(null)
    }
  }

  // ─── Derived data ──────────────────────────────────────────

  const mostUsedModel = stats
    ? Object.entries(stats.modelUsage).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None'
    : 'None'

  const avgResponseTimeData = stats
    ? Object.entries(stats.modelResponseTimes).map(([model, times]) => ({
        model: model.length > 15 ? model.slice(0, 15) + '...' : model,
        avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length / 1000 * 10) / 10
      }))
    : []

  const last30Days = () => {
    if (!stats) return []
    const data: { date: string; count: number }[] = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      data.push({ date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), count: stats.conversationsPerDay[key] ?? 0 })
    }
    return data
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Privacy Banner ── */}
        <div className="text-center py-8 px-6 rounded-2xl bg-gradient-to-r from-accent/10 via-surface to-accent/10 border border-accent/20">
          <p className="text-[11px] text-accent uppercase tracking-widest mb-2">Privacy Guarantee</p>
          <h2 className="text-4xl font-black text-white mb-1">
            0 <span className="text-lg font-normal text-gray-400">bytes sent to the cloud</span>
          </h2>
          <p className="text-sm text-gray-500">Ever. All inference runs locally on your machine.</p>
        </div>

        {/* ── Live Hardware ── */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="CPU Usage"
            value={hwLive ? `${hwLive.cpuUsagePercent}%` : '--'}
            bar={hwLive?.cpuUsagePercent}
            color={hwLive && hwLive.cpuUsagePercent > 80 ? '#e94560' : '#22c55e'}
          />
          <StatCard
            label="RAM"
            value={hwLive ? `${hwLive.ramUsedGB} / ${hwLive.ramTotalGB} GB` : '--'}
            bar={hwLive?.ramPercent}
            color={hwLive && hwLive.ramPercent > 85 ? '#e94560' : '#3b82f6'}
          />
          <StatCard
            label="Current Model"
            value={useAppStore.getState().selectedModelName ?? 'None loaded'}
            subtitle={hardware?.gpuName ?? ''}
          />
        </div>

        {/* ── Usage Stats ── */}
        <div className="grid grid-cols-4 gap-3">
          <MiniStat label="Conversations" value={stats?.totalConversations ?? 0} />
          <MiniStat label="Messages" value={stats?.totalMessages ?? 0} />
          <MiniStat label="Tokens (est.)" value={formatNumber(stats?.totalTokensEstimated ?? 0)} />
          <MiniStat label="Most Used" value={mostUsedModel.length > 18 ? mostUsedModel.slice(0, 18) + '...' : mostUsedModel} text />
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Conversations per day */}
          <div className="p-4 rounded-xl bg-surface border border-white/5">
            <h3 className="text-xs font-semibold text-gray-400 mb-3">Conversations (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={last30Days()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#666' }} interval={6} />
                <YAxis tick={{ fontSize: 9, fill: '#666' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#999' }}
                />
                <Line type="monotone" dataKey="count" stroke="#e94560" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Average response time per model */}
          <div className="p-4 rounded-xl bg-surface border border-white/5">
            <h3 className="text-xs font-semibold text-gray-400 mb-3">Avg Response Time by Model (seconds)</h3>
            {avgResponseTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={avgResponseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="model" tick={{ fontSize: 9, fill: '#666' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#666' }} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
                  />
                  <Bar dataKey="avg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[160px]">
                <p className="text-xs text-gray-600">No data yet — start chatting!</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Model Benchmarks ── */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Model Benchmarks</h3>
          <div className="grid gap-3">
            {installedModels.map((model) => {
              const bench = benchmarks.find((b) => b.modelPath === model.path)
              const isRunning = benchmarking === model.id
              return (
                <div key={model.id} className="p-4 rounded-xl bg-surface border border-white/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-white">{model.name}</h4>
                      <p className="text-[11px] text-gray-600 mt-0.5">{(model.size / 1e9).toFixed(1)} GB</p>
                    </div>
                    <button
                      onClick={() => handleBenchmark(model)}
                      disabled={isRunning || benchmarking !== null}
                      className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-[11px] font-medium hover:bg-accent/20 transition-colors disabled:opacity-50"
                    >
                      {isRunning ? 'Running...' : 'Run Benchmark'}
                    </button>
                  </div>

                  {bench && (
                    <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-white/5">
                      <div>
                        <p className="text-[10px] text-gray-600">Tokens/sec</p>
                        <p className="text-sm text-white font-medium">{bench.tokensPerSecond}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600">Response Time</p>
                        <p className="text-sm text-white font-medium">{(bench.responseTimeMs / 1000).toFixed(1)}s</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600">RAM Usage</p>
                        <p className="text-sm text-white font-medium">{bench.ramUsageMB} MB</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600">Last Benchmarked</p>
                        <p className="text-sm text-white font-medium">{new Date(bench.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}

                  {!bench && !isRunning && (
                    <p className="text-[11px] text-gray-600 mt-2">Not benchmarked yet</p>
                  )}

                  {isRunning && (
                    <div className="mt-3 flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-[11px] text-accent">Running standard test prompt...</span>
                    </div>
                  )}
                </div>
              )
            })}

            {installedModels.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No models installed to benchmark</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────

function StatCard({ label, value, bar, color, subtitle }: {
  label: string; value: string; bar?: number; color?: string; subtitle?: string
}) {
  return (
    <div className="p-4 rounded-xl bg-surface border border-white/5">
      <p className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold text-white mt-1">{value}</p>
      {subtitle && <p className="text-[10px] text-gray-600 mt-0.5 truncate">{subtitle}</p>}
      {bar !== undefined && (
        <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(bar, 100)}%`, backgroundColor: color ?? '#e94560' }}
          />
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, text }: { label: string; value: number | string; text?: boolean }) {
  return (
    <div className="p-3 rounded-xl bg-surface border border-white/5 text-center">
      <p className="text-[10px] text-gray-600">{label}</p>
      <p className={`font-semibold text-white mt-0.5 ${text ? 'text-xs' : 'text-lg'}`}>
        {value}
      </p>
    </div>
  )
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}
