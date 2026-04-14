import type { Conversation } from '../store/appStore'

export interface DateRange {
  from: number // epoch ms
  to: number
}

export interface PromptMetrics {
  totalPrompts: number
  avgPromptLength: number
  regenerationRate: number
  conversationsStarted: number
}

export interface QualityBreakdown {
  length: number
  specificity: number
  personaUsage: number
  followThrough: number
  variety: number
  total: number
}

const SPECIFICITY_WORDS = [
  'who', 'what', 'why', 'how', 'when', 'where', 'which',
  'format', 'example', 'specific', 'specifically', 'detail', 'details',
  'help me', 'i need', 'i want', 'please', 'explain', 'describe',
  'step by step', 'step-by-step', 'list', 'bullet', 'table',
  'summarise', 'summarize', 'compare', 'context', 'background'
]

// ─── Filtering ───────────────────────────────────────────────────

export function filterByRange(conversations: Conversation[], range: DateRange): Conversation[] {
  return conversations.filter((c) => c.updatedAt >= range.from && c.updatedAt <= range.to)
}

function userMessages(conversations: Conversation[]) {
  return conversations.flatMap((c) =>
    c.messages.filter((m) => m.role === 'user').map((m) => ({ ...m, convoId: c.id }))
  )
}

// ─── Metrics ─────────────────────────────────────────────────────

export function computeMetrics(conversations: Conversation[]): PromptMetrics {
  const users = userMessages(conversations)
  const totalPrompts = users.length
  const totalWords = users.reduce((sum, m) => sum + m.content.trim().split(/\s+/).length, 0)
  const avgPromptLength = totalPrompts > 0 ? totalWords / totalPrompts : 0

  // Regeneration signal: if a conversation has consecutive assistant messages with same user prompt above,
  // approximate by counting message count imbalance. More robust: count duplicated user messages.
  let regenerations = 0
  for (const c of conversations) {
    const seen = new Set<string>()
    for (const m of c.messages) {
      if (m.role === 'user') {
        if (seen.has(m.content)) regenerations++
        else seen.add(m.content)
      }
    }
  }
  const regenerationRate = totalPrompts > 0 ? (regenerations / totalPrompts) * 100 : 0

  return {
    totalPrompts,
    avgPromptLength,
    regenerationRate,
    conversationsStarted: conversations.length
  }
}

// ─── Quality Score ───────────────────────────────────────────────

export function computeQualityScore(conversations: Conversation[]): QualityBreakdown {
  const users = userMessages(conversations)
  const avgWords = users.length > 0
    ? users.reduce((s, m) => s + m.content.trim().split(/\s+/).length, 0) / users.length
    : 0

  // Length score (25)
  let lengthScore = 0
  if (avgWords >= 50) lengthScore = 25
  else if (avgWords >= 20) lengthScore = 22
  else if (avgWords >= 10) lengthScore = 15
  else lengthScore = 5

  // Specificity score (25)
  const specificCount = users.filter((m) => {
    const lower = m.content.toLowerCase()
    return SPECIFICITY_WORDS.some((w) => lower.includes(w))
  }).length
  const specRatio = users.length > 0 ? specificCount / users.length : 0
  const specificityScore = Math.round(specRatio * 25)

  // Persona usage (20)
  const withPersona = conversations.filter((c) => c.personaId).length
  const personaRatio = conversations.length > 0 ? withPersona / conversations.length : 0
  const personaScore = Math.round(personaRatio * 20)

  // Follow-through (20) — avg messages per conversation
  const totalMsgs = conversations.reduce((s, c) => s + c.messages.length, 0)
  const avgMsgs = conversations.length > 0 ? totalMsgs / conversations.length : 0
  let followScore = 0
  if (avgMsgs >= 7) followScore = 20
  else if (avgMsgs >= 4) followScore = 18
  else if (avgMsgs >= 2) followScore = 12
  else followScore = 5

  // Variety (10) — unique models used
  const uniqueModels = new Set(conversations.map((c) => c.modelId)).size
  let varietyScore = 0
  if (uniqueModels >= 3) varietyScore = 10
  else if (uniqueModels >= 2) varietyScore = 7
  else if (uniqueModels >= 1) varietyScore = 3

  const total = lengthScore + specificityScore + personaScore + followScore + varietyScore

  return {
    length: lengthScore,
    specificity: specificityScore,
    personaUsage: personaScore,
    followThrough: followScore,
    variety: varietyScore,
    total
  }
}

export function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 71) return { label: 'Advanced', color: 'text-green-500' }
  if (score >= 41) return { label: 'Capable', color: 'text-amber-500' }
  return { label: 'Developing', color: 'text-red-500' }
}

// ─── Chart Data ──────────────────────────────────────────────────

export function promptsPerDay(conversations: Conversation[], range: DateRange): { date: string; count: number }[] {
  const buckets = new Map<string, number>()
  // Initialize all days in range
  const dayMs = 86400000
  for (let t = range.from; t <= range.to; t += dayMs) {
    const key = new Date(t).toISOString().split('T')[0]
    buckets.set(key, 0)
  }

  for (const c of conversations) {
    for (const m of c.messages) {
      if (m.role !== 'user') continue
      const key = new Date(m.timestamp).toISOString().split('T')[0]
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1)
      }
    }
  }

  return [...buckets.entries()].map(([date, count]) => ({
    date: new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    count
  }))
}

export function modelUsageBreakdown(conversations: Conversation[]): { name: string; value: number }[] {
  const counts = new Map<string, number>()
  for (const c of conversations) {
    const model = c.modelId || 'Unknown'
    for (const m of c.messages) {
      if (m.role === 'user') counts.set(model, (counts.get(model) ?? 0) + 1)
    }
  }
  return [...counts.entries()].map(([name, value]) => ({ name, value }))
}

export function promptLengthDistribution(conversations: Conversation[]): { bucket: string; count: number }[] {
  const buckets = { '1-10': 0, '11-25': 0, '26-50': 0, '51+': 0 }
  for (const m of userMessages(conversations)) {
    const w = m.content.trim().split(/\s+/).length
    if (w <= 10) buckets['1-10']++
    else if (w <= 25) buckets['11-25']++
    else if (w <= 50) buckets['26-50']++
    else buckets['51+']++
  }
  return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }))
}

// ─── Suggestions ─────────────────────────────────────────────────

export interface Suggestion {
  id: string
  icon: 'warning' | 'tip' | 'info'
  text: string
  actionLabel: string
  actionPath: string
  severity: number // higher = more impactful
}

export function buildSuggestions(
  conversations: Conversation[],
  metrics: PromptMetrics
): Suggestion[] {
  const out: Suggestion[] = []

  if (metrics.avgPromptLength < 15 && metrics.totalPrompts > 3) {
    out.push({
      id: 'short-prompts',
      icon: 'warning',
      text: 'Your prompts tend to be brief. Add context about who you are, what you\'re trying to achieve, and what format you want. Detailed prompts get dramatically better responses.',
      actionLabel: 'Browse prompt templates',
      actionPath: '/',
      severity: 8
    })
  }

  if (metrics.regenerationRate > 20) {
    out.push({
      id: 'high-regen',
      icon: 'warning',
      text: 'You regenerate responses often — this usually means the original prompt lacked specificity. Try stating your exact requirements upfront: length, format, tone, and depth.',
      actionLabel: 'Open Prompt Library',
      actionPath: '/',
      severity: 9
    })
  }

  const withPersona = conversations.filter((c) => c.personaId).length
  const personaRatio = conversations.length > 0 ? withPersona / conversations.length : 0
  if (personaRatio < 0.3 && conversations.length > 2) {
    out.push({
      id: 'low-persona',
      icon: 'tip',
      text: 'You rarely use personas. Assigning a role (Legal Reviewer, Code Reviewer, Medical Summariser) significantly improves response quality for professional tasks.',
      actionLabel: 'Explore Personas',
      actionPath: '/personas',
      severity: 7
    })
  }

  // Single model dominance
  const modelCounts = modelUsageBreakdown(conversations)
  const totalUses = modelCounts.reduce((s, x) => s + x.value, 0)
  const topModel = modelCounts.sort((a, b) => b.value - a.value)[0]
  if (topModel && totalUses > 5 && (topModel.value / totalUses) > 0.9) {
    out.push({
      id: 'single-model',
      icon: 'tip',
      text: `You rely on one model (${topModel.name}) for almost everything. Different models excel at different tasks — try a coding-focused model for code and a reasoning model for analysis.`,
      actionLabel: 'Browse Model Library',
      actionPath: '/models',
      severity: 5
    })
  }

  // Single-message conversations
  const totalMsgs = conversations.reduce((s, c) => s + c.messages.length, 0)
  const avgMsgs = conversations.length > 0 ? totalMsgs / conversations.length : 0
  if (avgMsgs <= 2 && conversations.length > 2) {
    out.push({
      id: 'no-followup',
      icon: 'info',
      text: 'Most of your conversations are single-message. AI responds better in dialogue — give feedback, ask follow-ups, and refine. The best responses come from back-and-forth.',
      actionLabel: 'Start a conversation',
      actionPath: '/',
      severity: 6
    })
  }

  // Document chat usage = 0 (infer from conversation tags or just check if any exist — simple proxy: check if any conversation has modelId with "Document" or nothing to check, just show if prompts are long)
  const longPromptRatio = conversations.length > 0
    ? userMessages(conversations).filter((m) => m.content.length > 500).length / Math.max(1, metrics.totalPrompts)
    : 0
  if (longPromptRatio > 0.2) {
    out.push({
      id: 'use-docs',
      icon: 'info',
      text: 'You sometimes paste large blocks of text into chat. Document Chat handles long text better — maintains full context and lets you ask multiple questions about the same file.',
      actionLabel: 'Open Document Chat',
      actionPath: '/documents',
      severity: 4
    })
  }

  return out.sort((a, b) => b.severity - a.severity).slice(0, 4)
}

// ─── Topic Detection ─────────────────────────────────────────────

const TOPIC_KEYWORDS: Record<string, string[]> = {
  coding: ['code', 'function', 'bug', 'error', 'debug', 'typescript', 'javascript', 'python', 'compile', 'api', 'variable', 'class', 'method', 'syntax', 'programming'],
  research: ['summarise', 'summarize', 'paper', 'research', 'study', 'article', 'journal', 'abstract', 'conclusion', 'methodology', 'analysis', 'findings'],
  writing: ['write', 'edit', 'draft', 'tone', 'grammar', 'rewrite', 'polish', 'improve', 'article', 'blog', 'essay', 'copy', 'email'],
  medical: ['medical', 'clinical', 'patient', 'diagnosis', 'symptom', 'treatment', 'disease', 'doctor', 'medicine', 'health'],
  legal: ['legal', 'contract', 'clause', 'liability', 'agreement', 'law', 'obligation', 'terms', 'compliance', 'regulation'],
  analysis: ['analyse', 'analyze', 'compare', 'evaluate', 'reason', 'think', 'why', 'because', 'argument', 'logic']
}

export function detectTopics(conversations: Conversation[]): { topic: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const m of userMessages(conversations)) {
    const lower = m.content.toLowerCase()
    for (const [topic, words] of Object.entries(TOPIC_KEYWORDS)) {
      for (const w of words) {
        if (lower.includes(w)) {
          counts.set(topic, (counts.get(topic) ?? 0) + 1)
          break // count at most once per message per topic
        }
      }
    }
  }
  return [...counts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
}
