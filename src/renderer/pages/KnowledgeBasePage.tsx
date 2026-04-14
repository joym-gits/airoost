import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'

type View = 'list' | 'creating' | 'chat'

interface KBMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: KBSearchResultData[]
}

export default function KnowledgeBasePage() {
  const { installedModels, selectedModelPath } = useAppStore()

  const [view, setView] = useState<View>('list')
  const [kbs, setKbs] = useState<KnowledgeBaseData[]>([])
  const [activeKB, setActiveKB] = useState<KnowledgeBaseData | null>(null)
  const [kbDocs, setKbDocs] = useState<KBDocumentData[]>([])

  // Create form
  const [newName, setNewName] = useState('')
  const [newPath, setNewPath] = useState('')
  const [indexing, setIndexing] = useState(false)
  const [indexProgress, setIndexProgress] = useState({ processed: 0, total: 0, currentFile: '' })

  // Chat
  const [messages, setMessages] = useState<KBMessage[]>([])
  const [input, setInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [streamText, setStreamText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchKBs = async () => {
    const data = await window.airoost.kbGetAll()
    setKbs(data)
  }

  useEffect(() => { fetchKBs() }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  // ─── Create ─────────────────────────────────────────────────

  const handleSelectFolder = async () => {
    const path = await window.airoost.kbSelectFolder()
    if (path) setNewPath(path)
  }

  const handleCreate = async () => {
    if (!newName.trim() || !newPath) return
    setIndexing(true)
    setIndexProgress({ processed: 0, total: 0, currentFile: 'Starting...' })

    const cleanup = window.airoost.onKBIndexProgress((data) => {
      setIndexProgress(data)
    })

    try {
      await window.airoost.kbCreate(newName.trim(), newPath)
      await fetchKBs()
      setView('list')
      setNewName('')
      setNewPath('')
    } catch (err: any) {
      console.error('KB create error:', err)
    } finally {
      cleanup()
      setIndexing(false)
    }
  }

  // ─── Open KB ────────────────────────────────────────────────

  const handleOpenKB = async (kb: KnowledgeBaseData) => {
    setActiveKB(kb)
    const docs = await window.airoost.kbGetDocs(kb.id)
    setKbDocs(docs)
    setMessages([])
    setView('chat')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ─── Chat ───────────────────────────────────────────────────

  const handleSend = async () => {
    if (!input.trim() || !activeKB || !selectedModelPath || generating) return
    const msg = input.trim()
    setInput('')

    const userMsg: KBMessage = { role: 'user', content: msg }
    setMessages((prev) => [...prev, userMsg])
    setGenerating(true)
    setStreamText('')

    const cleanup = window.airoost.onChatToken(({ partial }) => {
      setStreamText(partial)
    })

    try {
      const { response, sources } = await window.airoost.kbChat(selectedModelPath, activeKB.id, msg)
      setMessages((prev) => [...prev, { role: 'assistant', content: response, sources }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error generating response.' }])
    } finally {
      cleanup()
      setGenerating(false)
      setStreamText('')
    }
  }

  // ─── Management ─────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    await window.airoost.kbDelete(id)
    if (activeKB?.id === id) { setActiveKB(null); setView('list') }
    fetchKBs()
  }

  const handleReindex = async (id: string) => {
    setIndexing(true)
    setIndexProgress({ processed: 0, total: 0, currentFile: 'Starting...' })
    const cleanup = window.airoost.onKBIndexProgress(setIndexProgress)
    try {
      const updated = await window.airoost.kbReindex(id)
      await fetchKBs()
      // If we're currently viewing this KB's chat, refresh its state and docs
      if (activeKB?.id === id && updated) {
        setActiveKB(updated)
        const docs = await window.airoost.kbGetDocs(id)
        setKbDocs(docs)
      }
    } finally {
      cleanup()
      setIndexing(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5">
        <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
        <h1 className="text-sm font-semibold text-white">Knowledge Bases</h1>

        {view === 'chat' && activeKB && (
          <>
            <span className="text-[11px] text-gray-500">/</span>
            <span className="text-[11px] text-accent">{activeKB.name}</span>
            <span className="text-[10px] text-gray-600">{activeKB.documentCount} docs \u00B7 {activeKB.chunkCount} chunks</span>
          </>
        )}

        <div className="flex-1" />

        {view !== 'list' && (
          <button
            onClick={() => { setView('list'); setActiveKB(null) }}
            className="text-[11px] text-gray-500 hover:text-white px-3 py-1 bg-white/5 rounded-lg transition-colors"
          >
            Back to list
          </button>
        )}
      </div>

      {/* ── List View ── */}
      {view === 'list' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs text-gray-500">{kbs.length} knowledge base{kbs.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => setView('creating')}
              className="px-4 py-2 bg-accent hover:bg-accent-dark rounded-lg text-white text-xs font-medium transition-colors"
            >
              + New Knowledge Base
            </button>
          </div>

          {kbs.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <p className="text-sm text-gray-400 mb-2">No knowledge bases yet</p>
              <p className="text-xs text-gray-600">Index a folder of documents to chat with them using AI</p>
            </div>
          )}

          <div className="grid gap-3">
            {kbs.map((kb) => (
              <div key={kb.id} className="group p-4 rounded-xl bg-surface border border-white/5 hover:border-accent/20 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="cursor-pointer flex-1" onClick={() => handleOpenKB(kb)}>
                    <h3 className="text-sm font-medium text-white">{kb.name}</h3>
                    <p className="text-[11px] text-gray-500 mt-1">
                      {kb.documentCount} documents \u00B7 {kb.chunkCount} chunks \u00B7 {(kb.indexSizeBytes / 1e6).toFixed(1)} MB index
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5 truncate">{kb.sourcePath}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <button onClick={() => handleOpenKB(kb)} className="text-[10px] text-accent bg-accent/10 px-2 py-1 rounded transition-colors">Chat</button>
                    <button onClick={() => handleReindex(kb.id)} className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded hover:text-white transition-colors">Re-index</button>
                    <button onClick={() => handleDelete(kb.id)} className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded hover:text-red-400 transition-colors">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Creating View ── */}
      {view === 'creating' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-lg mx-auto">
            <h2 className="text-lg font-semibold text-white mb-4">New Knowledge Base</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. My Research Papers"
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 outline-none focus:border-accent/50"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Source Folder</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-400 truncate">
                    {newPath || 'No folder selected'}
                  </div>
                  <button
                    onClick={handleSelectFolder}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-white transition-colors"
                  >
                    Browse
                  </button>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Supports: PDF, Word, TXT, Markdown</p>
              </div>

              {indexing && (
                <div className="p-4 rounded-xl bg-surface border border-white/5">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-gray-400">Indexing...</span>
                    <span className="text-xs text-white">{indexProgress.processed} / {indexProgress.total}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${indexProgress.total > 0 ? (indexProgress.processed / indexProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">{indexProgress.currentFile}</p>
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={!newName.trim() || !newPath || indexing}
                className="w-full py-3 bg-accent hover:bg-accent-dark rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {indexing ? 'Indexing...' : 'Create & Index'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat View ── */}
      {view === 'chat' && activeKB && (
        <>
          {/* Indexing progress (shown when re-indexing from chat view) */}
          {indexing && (
            <div className="mx-5 mt-3 p-3 rounded-lg bg-surface border border-white/5">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-gray-400">Indexing...</span>
                <span className="text-xs text-white">{indexProgress.processed} / {indexProgress.total}</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${indexProgress.total > 0 ? (indexProgress.processed / indexProgress.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 truncate">{indexProgress.currentFile}</p>
            </div>
          )}

          {/* Empty KB warning */}
          {!indexing && activeKB.chunkCount === 0 && (
            <div className="mx-5 mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <div className="flex-1">
                <p className="text-xs text-amber-400 font-medium">This knowledge base has 0 chunks</p>
                <p className="text-[11px] text-amber-300/70 mt-0.5">
                  Indexing may have failed. If this KB contains PDFs and was created before v1.0.1, the PDFs were silently skipped. Re-index to fix.
                </p>
              </div>
              <button
                onClick={() => handleReindex(activeKB.id)}
                disabled={indexing}
                className="shrink-0 px-3 py-1 bg-amber-500 hover:bg-amber-600 rounded text-xs text-black font-medium transition-colors disabled:opacity-50"
              >
                {indexing ? 'Indexing...' : 'Re-index now'}
              </button>
            </div>
          )}

          {/* Documents panel (collapsible) */}
          <div className="px-5 py-2 border-b border-white/5 flex items-center gap-2 overflow-x-auto">
            {kbDocs.map((doc) => (
              <span key={doc.filename} className="shrink-0 text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded">
                {doc.filename} ({doc.chunkCount} chunks)
              </span>
            ))}
            {kbDocs.length === 0 && activeKB.chunkCount === 0 && (
              <span className="text-[10px] text-gray-600">No indexed content yet</span>
            )}
            {/* Always-visible re-index shortcut */}
            <button
              onClick={() => handleReindex(activeKB.id)}
              disabled={indexing}
              className="ml-auto shrink-0 text-[10px] text-gray-500 hover:text-accent px-2 py-1 rounded bg-white/5 transition-colors disabled:opacity-50"
              title="Re-scan the source folder and rebuild the index"
            >
              {indexing ? 'Indexing...' : 'Re-index'}
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 && !generating && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-sm text-gray-400 mb-2">Ask anything about <span className="text-accent">{activeKB.name}</span></p>
                <p className="text-xs text-gray-600">{activeKB.documentCount} documents indexed \u00B7 {activeKB.chunkCount} chunks</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%]">
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-accent text-white rounded-br-md'
                      : 'bg-surface text-gray-200 rounded-bl-md'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.sources.map((src, si) => (
                        <div key={si} className="flex items-center gap-2 text-[10px] text-gray-600">
                          <svg className="w-3 h-3 text-accent/50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Source: {src.source} \u2014 Chunk {src.chunkIndex + 1} (relevance: {(src.score * 100).toFixed(0)}%)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {generating && (
              <div className="flex justify-start">
                <div className="max-w-[80%] bg-surface px-4 py-3 rounded-2xl rounded-bl-md text-sm text-gray-200">
                  {streamText ? (
                    <p className="whitespace-pre-wrap">{streamText}<span className="animate-pulse text-accent">{'\u258C'}</span></p>
                  ) : (
                    <div className="flex gap-1 py-1">
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t border-white/5">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={`Ask about ${activeKB.name}...`}
                disabled={generating || installedModels.length === 0}
                className="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 outline-none focus:border-accent/50 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || generating || installedModels.length === 0}
                className="px-5 py-3 bg-accent hover:bg-accent-dark rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-30"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
