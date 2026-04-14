import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { useAppStore } from '../store/appStore'
import {
  filterByRange, computeMetrics, computeQualityScore, scoreLabel,
  promptsPerDay, modelUsageBreakdown, promptLengthDistribution,
  buildSuggestions, detectTopics, type DateRange
} from '../utils/promptAnalytics'
import { recommendModels } from '../utils/modelRecommendations'

const PIE_COLORS = ['#e94560', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899']

export default function PromptCoachPage() {
  const navigate = useNavigate()
  const { conversations, installedModels, selectedModelPath, downloadModel, catalog } = useAppStore()

  const [preset, setPreset] = useState<'7d' | '30d' | '90d' | 'all' | 'custom'>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const [aiReview, setAiReview] = useState<{ loading: boolean; text: string }>({ loading: false, text: '' })

  // ─── Date Range Resolution ──────────────────────────────────

  const range: DateRange = useMemo(() => {
    const now = Date.now()
    const day = 86400000
    switch (preset) {
      case '7d': return { from: now - 7 * day, to: now }
      case '30d': return { from: now - 30 * day, to: now }
      case '90d': return { from: now - 90 * day, to: now }
      case 'all': return { from: 0, to: now }
      case 'custom':
        return {
          from: customFrom ? new Date(customFrom).getTime() : now - 30 * day,
          to: customTo ? new Date(customTo).getTime() + day : now
        }
    }
  }, [preset, customFrom, customTo])

  // ─── Filtered data ──────────────────────────────────────────

  const filtered = useMemo(() => filterByRange(conversations, range), [conversations, range])
  const metrics = useMemo(() => computeMetrics(filtered), [filtered])
  const quality = useMemo(() => computeQualityScore(filtered), [filtered])
  const label = scoreLabel(quality.total)
  const perDay = useMemo(() => promptsPerDay(filtered, range), [filtered, range])
  const modelBreakdown = useMemo(() => modelUsageBreakdown(filtered), [filtered])
  const lengthDist = useMemo(() => promptLengthDistribution(filtered), [filtered])
  const suggestions = useMemo(() => buildSuggestions(filtered, metrics), [filtered, metrics])
  const topics = useMemo(() => detectTopics(filtered), [filtered])
  const recommendations = useMemo(() => recommendModels(topics), [topics])

  // ─── AI Coach ────────────────────────────────────────────────

  const handleAiReview = async () => {
    if (!selectedModelPath) return
    setAiReview({ loading: true, text: '' })

    const summary = [
      `A user has sent ${metrics.totalPrompts} prompts over the selected period.`,
      `Average prompt length: ${metrics.avgPromptLength.toFixed(0)} words.`,
      `Regeneration rate: ${metrics.regenerationRate.toFixed(0)}%.`,
      `Most common topics: ${topics.slice(0, 3).map((t) => t.topic).join(', ') || 'general chat'}.`,
      `Persona usage: ${Math.round((filtered.filter((c) => c.personaId).length / Math.max(1, filtered.length)) * 100)}%.`,
      `Quality score: ${quality.total}/100 (${label.label}).`,
      '',
      'In 3-4 sentences, what specific advice would you give this person to improve their AI prompting style? Be concrete and actionable.'
    ].join('\n')

    const cleanup = window.airoost.onChatToken(({ partial }) => {
      setAiReview({ loading: true, text: partial })
    })

    try {
      const response = await window.airoost.chat(selectedModelPath, summary)
      setAiReview({ loading: false, text: response })
    } catch {
      setAiReview({ loading: false, text: 'Sorry, the AI review failed. Make sure a model is loaded and try again.' })
    } finally {
      cleanup()
    }
  }

  // ─── Render ──────────────────────────────────────────────────

  const noData = filtered.length === 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Prompt Coach</h1>
          <p className="text-xs text-gray-500 mt-1">
            Personal analytics on your prompting patterns. Everything computed locally.
          </p>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { id: '7d', label: 'Last 7 days' },
            { id: '30d', label: 'Last 30 days' },
            { id: '90d', label: 'Last 90 days' },
            { id: 'all', label: 'All time' }
          ] as const).map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                preset === p.id ? 'bg-accent text-white' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => { setCustomFrom(e.target.value); setPreset('custom') }}
              className="bg-surface-dark border border-white/10 rounded px-2 py-1 text-[11px] text-white outline-none"
            />
            <span className="text-[11px] text-gray-500">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => { setCustomTo(e.target.value); setPreset('custom') }}
              className="bg-surface-dark border border-white/10 rounded px-2 py-1 text-[11px] text-white outline-none"
            />
          </div>
        </div>

        {noData ? (
          <div className="text-center py-20 bg-surface rounded-xl border border-white/5">
            <p className="text-sm text-gray-500 mb-2">No conversation data in this range</p>
            <p className="text-xs text-gray-600">Start chatting to build your prompting analytics.</p>
          </div>
        ) : (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-4 gap-3">
              <MiniStat label="Total Prompts" value={metrics.totalPrompts} />
              <MiniStat label="Avg Prompt Length" value={`${metrics.avgPromptLength.toFixed(0)} words`} />
              <MiniStat label="Regeneration Rate" value={`${metrics.regenerationRate.toFixed(0)}%`} />
              <MiniStat label="Conversations" value={metrics.conversationsStarted} />
            </div>

            {/* Quality Score */}
            <div className="flex items-center gap-6 p-6 rounded-xl bg-surface border border-white/5">
              <QualityRing score={quality.total} />
              <div className="flex-1">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">Prompt Quality Score</p>
                <p className={`text-3xl font-bold mt-1 ${label.color}`}>{label.label}</p>
                <div className="grid grid-cols-5 gap-2 mt-4">
                  <ScoreBit label="Length" value={quality.length} max={25} />
                  <ScoreBit label="Specificity" value={quality.specificity} max={25} />
                  <ScoreBit label="Persona" value={quality.personaUsage} max={20} />
                  <ScoreBit label="Follow-through" value={quality.followThrough} max={20} />
                  <ScoreBit label="Variety" value={quality.variety} max={10} />
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-4">
              {/* Prompts over time */}
              <div className="p-4 rounded-xl bg-surface border border-white/5 col-span-2">
                <h3 className="text-xs font-semibold text-gray-400 mb-3">Prompts Over Time</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={perDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#666' }} interval={Math.max(1, Math.floor(perDay.length / 10))} />
                    <YAxis tick={{ fontSize: 9, fill: '#666' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey="count" stroke="#e94560" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Model usage breakdown */}
              <div className="p-4 rounded-xl bg-surface border border-white/5">
                <h3 className="text-xs font-semibold text-gray-400 mb-3">Model Usage</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={modelBreakdown} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                      {modelBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Prompt length distribution */}
              <div className="p-4 rounded-xl bg-surface border border-white/5">
                <h3 className="text-xs font-semibold text-gray-400 mb-3">Prompt Length Distribution</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={lengthDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#666' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#666' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-white mb-3">How to improve</h2>
                <div className="grid gap-2">
                  {suggestions.map((s) => (
                    <SuggestionCard key={s.id} suggestion={s} onAction={() => navigate(s.actionPath)} />
                  ))}
                </div>
              </div>
            )}

            {/* Model Recommendations */}
            {recommendations.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-white mb-3">Models worth trying</h2>
                <div className="grid gap-2">
                  {recommendations.map(({ rec, count }) => {
                    const installed = installedModels.some((m) => m.path.endsWith(rec.filename))
                    const inCatalog = catalog.find((m) => m.filename === rec.filename)
                    return (
                      <div key={rec.filename} className="p-4 rounded-xl bg-surface border border-white/5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-white">{rec.modelName}</h3>
                            <p className="text-xs text-gray-500 mt-1">{rec.description}</p>
                            <p className="text-[11px] text-accent mt-2">{rec.why(count)}</p>
                            <p className="text-[10px] text-gray-600 mt-1">{rec.sizeGB} GB</p>
                          </div>
                          <div className="shrink-0">
                            {installed ? (
                              <span className="text-[11px] text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full">Installed</span>
                            ) : inCatalog ? (
                              <button
                                onClick={() => downloadModel(inCatalog.id)}
                                className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-xs font-medium hover:bg-accent/20 transition-colors"
                              >
                                Download
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate('/models')}
                                className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-xs font-medium hover:bg-accent/20 transition-colors"
                              >
                                Find in Library
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <button
                  onClick={() => navigate('/models')}
                  className="mt-3 text-[11px] text-accent hover:text-accent-light transition-colors"
                >
                  Compare with any model {'\u2192'}
                </button>
              </div>
            )}

            {/* AI Coach */}
            {selectedModelPath && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-accent/5 to-surface border border-accent/10">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-white">AI Coach</h2>
                  <span className="text-[10px] text-gray-600">running locally</span>
                </div>
                {!aiReview.loading && !aiReview.text && (
                  <button
                    onClick={handleAiReview}
                    className="px-4 py-2 bg-accent hover:bg-accent-dark rounded-lg text-white text-xs font-medium transition-colors"
                  >
                    Ask AI to review my prompting style
                  </button>
                )}
                {(aiReview.loading || aiReview.text) && (
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {aiReview.text}
                    {aiReview.loading && <span className="animate-pulse text-accent">{'\u258C'}</span>}
                  </p>
                )}
                <p className="text-[10px] text-gray-600 mt-3">
                  Only a statistical summary is passed to the AI — your actual prompts are never read.
                </p>
              </div>
            )}
          </>
        )}

        {/* Privacy Note */}
        <p className="text-[10px] text-gray-700 text-center pt-4 border-t border-white/5">
          All analysis is performed locally on your device. Your prompts are never read, transmitted, or stored outside this application.
        </p>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-3 rounded-xl bg-surface border border-white/5">
      <p className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-semibold text-white mt-1">{value}</p>
    </div>
  )
}

function QualityRing({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 71 ? '#22c55e' : score >= 41 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} stroke="#222" strokeWidth="8" fill="none" />
        <circle
          cx="64" cy="64" r={radius}
          stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-[9px] text-gray-500">out of 100</span>
      </div>
    </div>
  )
}

function ScoreBit({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = (value / max) * 100
  return (
    <div>
      <p className="text-[9px] text-gray-500 mb-0.5">{label}</p>
      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-gray-600 mt-0.5">{value}/{max}</p>
    </div>
  )
}

function SuggestionCard({ suggestion, onAction }: { suggestion: any; onAction: () => void }) {
  const iconColor = suggestion.icon === 'warning' ? 'text-amber-500' : suggestion.icon === 'tip' ? 'text-blue-400' : 'text-gray-400'
  const iconBg = suggestion.icon === 'warning' ? 'bg-amber-500/10' : suggestion.icon === 'tip' ? 'bg-blue-500/10' : 'bg-white/5'
  const symbol = suggestion.icon === 'warning' ? '!' : suggestion.icon === 'tip' ? '?' : 'i'

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-surface border border-white/5">
      <div className={`w-7 h-7 rounded-full ${iconBg} ${iconColor} flex items-center justify-center shrink-0 font-bold text-sm`}>
        {symbol}
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-300 leading-relaxed">{suggestion.text}</p>
        <button
          onClick={onAction}
          className="mt-2 text-[11px] text-accent hover:text-accent-light transition-colors"
        >
          {suggestion.actionLabel} {'\u2192'}
        </button>
      </div>
    </div>
  )
}
