import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../store/appStore'

export default function CompareView() {
  const {
    installedModels,
    compareModelA,
    compareModelB,
    compareStreamA,
    compareStreamB,
    compareGeneratingA,
    compareGeneratingB,
    compareTimeA,
    compareTimeB,
    setCompareModelA,
    setCompareModelB,
    sendCompareMessage,
    adoptCompareResponse,
    setCompareMode
  } = useAppStore()

  const [input, setInput] = useState('')
  const [history, setHistory] = useState<{ prompt: string; a: string; b: string; timeA: number | null; timeB: number | null }[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isGenerating = compareGeneratingA || compareGeneratingB

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [compareStreamA, compareStreamB, history])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // When both finish, push to history
  useEffect(() => {
    if (!compareGeneratingA && !compareGeneratingB && compareStreamA && compareStreamB) {
      setHistory((prev) => [
        ...prev,
        { prompt: prev.length > 0 ? '' : '', a: compareStreamA, b: compareStreamB, timeA: compareTimeA, timeB: compareTimeB }
      ])
    }
  }, [compareGeneratingA, compareGeneratingB]) // eslint-disable-line

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return
    const msg = input.trim()
    setInput('')
    // Save prompt to history entry
    setHistory((prev) => [...prev, { prompt: msg, a: '', b: '', timeA: null, timeB: null }])
    await sendCompareMessage(msg)
    // Update last history entry with results
    setHistory((prev) => {
      const copy = [...prev]
      if (copy.length > 0) {
        const last = copy[copy.length - 1]
        const state = useAppStore.getState()
        last.a = state.compareStreamA
        last.b = state.compareStreamB
        last.timeA = state.compareTimeA
        last.timeB = state.compareTimeB
      }
      return copy
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5">
        <span className="text-xs font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded">Compare</span>

        {/* Model A selector */}
        <select
          value={compareModelA?.path ?? ''}
          onChange={(e) => {
            const m = installedModels.find((m) => m.path === e.target.value)
            if (m) setCompareModelA(m.path, m.name)
          }}
          className="bg-surface-dark border border-blue-500/30 text-white text-xs rounded-lg px-3 py-1.5 outline-none"
        >
          {installedModels.map((m) => (
            <option key={m.path} value={m.path}>{m.name}</option>
          ))}
        </select>

        <span className="text-xs text-gray-600">vs</span>

        {/* Model B selector */}
        <select
          value={compareModelB?.path ?? ''}
          onChange={(e) => {
            const m = installedModels.find((m) => m.path === e.target.value)
            if (m) setCompareModelB(m.path, m.name)
          }}
          className="bg-surface-dark border border-purple-500/30 text-white text-xs rounded-lg px-3 py-1.5 outline-none"
        >
          {installedModels.map((m) => (
            <option key={m.path} value={m.path}>{m.name}</option>
          ))}
        </select>

        <div className="flex-1" />

        <button
          onClick={() => setCompareMode(false)}
          className="text-[11px] text-gray-500 hover:text-white px-3 py-1.5 bg-white/5 rounded-lg transition-colors"
        >
          Exit Compare
        </button>
      </div>

      {/* Split panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel A */}
        <div className="flex-1 border-r border-white/5 flex flex-col">
          <div className="px-4 py-2 border-b border-white/5">
            <span className="text-[11px] font-medium text-blue-400">{compareModelA?.name ?? 'Model A'}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {history.map((entry, i) => (
              <div key={i}>
                {entry.prompt && (
                  <div className="flex justify-end mb-2">
                    <div className="bg-accent px-3 py-2 rounded-2xl rounded-br-md text-sm text-white max-w-[85%]">
                      <p className="whitespace-pre-wrap">{entry.prompt}</p>
                    </div>
                  </div>
                )}
                {entry.a && (
                  <ResponseBubble
                    text={entry.a}
                    time={entry.timeA}
                    color="blue"
                    onCopy={() => navigator.clipboard.writeText(entry.a)}
                    onAdopt={() => adoptCompareResponse('A', entry.a)}
                    showActions={!isGenerating}
                  />
                )}
              </div>
            ))}
            {/* Live streaming */}
            {compareGeneratingA && (
              <div className="bg-surface px-4 py-3 rounded-2xl rounded-bl-md text-sm text-gray-200">
                {compareStreamA ? (
                  <p className="whitespace-pre-wrap">{compareStreamA}<span className="animate-pulse text-blue-400">{'\u258C'}</span></p>
                ) : (
                  <Dots />
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Panel B */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 border-b border-white/5">
            <span className="text-[11px] font-medium text-purple-400">{compareModelB?.name ?? 'Model B'}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {history.map((entry, i) => (
              <div key={i}>
                {entry.prompt && (
                  <div className="flex justify-end mb-2">
                    <div className="bg-accent px-3 py-2 rounded-2xl rounded-br-md text-sm text-white max-w-[85%]">
                      <p className="whitespace-pre-wrap">{entry.prompt}</p>
                    </div>
                  </div>
                )}
                {entry.b && (
                  <ResponseBubble
                    text={entry.b}
                    time={entry.timeB}
                    color="purple"
                    onCopy={() => navigator.clipboard.writeText(entry.b)}
                    onAdopt={() => adoptCompareResponse('B', entry.b)}
                    showActions={!isGenerating}
                  />
                )}
              </div>
            ))}
            {compareGeneratingB && (
              <div className="bg-surface px-4 py-3 rounded-2xl rounded-bl-md text-sm text-gray-200">
                {compareStreamB ? (
                  <p className="whitespace-pre-wrap">{compareStreamB}<span className="animate-pulse text-purple-400">{'\u258C'}</span></p>
                ) : (
                  <Dots />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shared input */}
      <div className="px-5 py-4 border-t border-white/5">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Same prompt goes to both models..."
            disabled={isGenerating}
            className="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 outline-none focus:border-accent/50 transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="px-5 py-3 bg-accent hover:bg-accent-dark rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  )
}

function ResponseBubble({
  text, time, color, onCopy, onAdopt, showActions
}: {
  text: string
  time: number | null
  color: 'blue' | 'purple'
  onCopy: () => void
  onAdopt: () => void
  showActions: boolean
}) {
  const timeStr = time ? `${(time / 1000).toFixed(1)}s` : null
  const tokens = text.split(/\s+/).length
  const tokPerSec = time && time > 0 ? (tokens / (time / 1000)).toFixed(1) : null

  return (
    <div className="group">
      <div className="bg-surface px-4 py-3 rounded-2xl rounded-bl-md text-sm text-gray-200 leading-relaxed">
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
      <div className="flex items-center gap-2 mt-1">
        {timeStr && (
          <span className={`text-[10px] ${color === 'blue' ? 'text-blue-500/60' : 'text-purple-500/60'}`}>
            {timeStr} {tokPerSec && `\u00B7 ~${tokPerSec} tok/s`}
          </span>
        )}
        {showActions && (
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity ml-auto">
            <button
              onClick={onCopy}
              className="text-[10px] text-gray-600 hover:text-gray-300 px-2 py-0.5 rounded bg-white/5 transition-colors"
            >
              Copy
            </button>
            <button
              onClick={onAdopt}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                color === 'blue'
                  ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
                  : 'text-purple-400 bg-purple-500/10 hover:bg-purple-500/20'
              }`}
            >
              Use this one
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Dots() {
  return (
    <div className="flex gap-1 py-1">
      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.1s]" />
      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
    </div>
  )
}
