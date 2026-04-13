import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../store/appStore'

interface DocMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function DocumentsPage() {
  const { installedModels, selectedModelPath, selectedModelName, setSelectedModel, fetchInstalled } =
    useAppStore()

  const [doc, setDoc] = useState<ParsedDocument | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [messages, setMessages] = useState<DocMessage[]>([])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchInstalled()
  }, [fetchInstalled])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // ─── Drag & Drop ────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const file = files[0]
    if (!file) return

    const validExts = ['.pdf', '.docx', '.txt', '.md', '.csv']
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!validExts.includes(ext)) {
      setParseError(`Unsupported file type: ${ext}. Supported: ${validExts.join(', ')}`)
      return
    }

    await loadDocument(file.path)
  }, [])

  const loadDocument = async (filePath: string) => {
    setParsing(true)
    setParseError('')
    setMessages([])
    setDoc(null)

    try {
      const parsed = await window.airoost.parseDocument(filePath)
      setDoc(parsed)
    } catch (err: any) {
      setParseError(err?.message ?? 'Failed to parse document')
    } finally {
      setParsing(false)
      inputRef.current?.focus()
    }
  }

  // ─── Chat ───────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!input.trim() || !doc || !selectedModelPath || isGenerating) return

    const userMsg: DocMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setIsGenerating(true)
    setStreamingText('')

    const cleanup = window.airoost.onChatToken(({ partial }) => {
      setStreamingText(partial)
    })

    try {
      const response = await window.airoost.docChat(
        selectedModelPath,
        doc.text,
        doc.filename,
        input.trim()
      )
      setMessages([...newMessages, { role: 'assistant', content: response }])
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ])
    } finally {
      cleanup()
      setIsGenerating(false)
      setStreamingText('')
    }
  }

  const handleCopy = (text: string) => navigator.clipboard.writeText(text)

  const handleRemoveDoc = () => {
    setDoc(null)
    setMessages([])
    setParseError('')
  }

  const noModels = installedModels.length === 0

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5">
        <h1 className="text-sm font-semibold text-white">Document Chat</h1>
        <select
          value={selectedModelPath ?? ''}
          onChange={(e) => {
            const m = installedModels.find((m) => m.path === e.target.value)
            if (m) setSelectedModel(m.path, m.name)
          }}
          className="bg-surface-dark border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none"
        >
          {noModels && <option value="">No models installed</option>}
          {installedModels.map((m) => (
            <option key={m.path} value={m.path}>{m.name}</option>
          ))}
        </select>

        {/* Document info badge */}
        {doc && (
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-accent/10">
              <DocIcon ext={doc.extension} />
              <span className="text-xs text-accent font-medium">{doc.filename}</span>
              {doc.pageCount > 1 && (
                <span className="text-[10px] text-accent/60">{doc.pageCount} pages</span>
              )}
              <span className="text-[10px] text-accent/60">
                {(doc.charCount / 1000).toFixed(1)}K chars
              </span>
              {doc.truncated && (
                <span className="text-[10px] text-yellow-500">truncated</span>
              )}
            </div>
            <button
              onClick={handleRemoveDoc}
              className="text-gray-500 hover:text-red-400 transition-colors"
              title="Remove document"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Drop zone / empty state */}
        {!doc && !parsing && (
          <div className={`flex flex-col items-center justify-center h-full px-8 transition-colors ${
            isDragOver ? 'bg-accent/5' : ''
          }`}>
            <div className={`w-full max-w-md p-10 rounded-2xl border-2 border-dashed transition-colors text-center ${
              isDragOver
                ? 'border-accent bg-accent/5'
                : 'border-white/10 hover:border-white/20'
            }`}>
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                {isDragOver ? 'Drop your document here' : 'Drop a document to start'}
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Drag and drop a file onto this area
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['PDF', 'DOCX', 'TXT', 'MD', 'CSV'].map((ext) => (
                  <span key={ext} className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded">
                    .{ext.toLowerCase()}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-gray-600 mt-4">
                Your document never leaves your machine. Not one byte.
              </p>
            </div>

            {parseError && (
              <p className="text-sm text-red-400 mt-4">{parseError}</p>
            )}
          </div>
        )}

        {/* Parsing state */}
        {parsing && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-6 h-6 animate-spin text-accent mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-400">Reading document...</p>
            </div>
          </div>
        )}

        {/* Chat messages */}
        {doc && !parsing && (
          <div className="px-6 py-4 space-y-4">
            {/* Welcome message */}
            {messages.length === 0 && !isGenerating && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 mb-4">
                  Document loaded. Ask anything about <span className="text-accent">{doc.filename}</span>
                </p>
                <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                  {[
                    'Summarize this document',
                    'What are the key points?',
                    'What is the main conclusion?',
                    'List all important dates or numbers'
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => { setInput(prompt); inputRef.current?.focus() }}
                      className="text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="group relative max-w-[75%]">
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-accent text-white rounded-br-md'
                        : 'bg-surface text-gray-200 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'assistant' && !isGenerating && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1">
                      <button
                        onClick={() => handleCopy(msg.content)}
                        className="text-[10px] text-gray-600 hover:text-gray-300 px-2 py-0.5 rounded bg-white/5 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming */}
            {isGenerating && (
              <div className="flex justify-start">
                <div className="max-w-[75%] bg-surface px-4 py-3 rounded-2xl rounded-bl-md text-sm text-gray-200 leading-relaxed">
                  {streamingText ? (
                    <p className="whitespace-pre-wrap">{streamingText}<span className="animate-pulse text-accent">{'\u258C'}</span></p>
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
        )}
      </div>

      {/* Input bar — visible when document is loaded */}
      {doc && (
        <div className="px-5 py-4 border-t border-white/5">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={noModels ? 'Download a model first...' : `Ask about ${doc.filename}...`}
              disabled={noModels || isGenerating}
              className="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 outline-none focus:border-accent/50 transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || noModels || isGenerating}
              className="px-5 py-3 bg-accent hover:bg-accent-dark rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {isDragOver && doc && (
        <div className="absolute inset-0 bg-surface-dark/80 flex items-center justify-center z-50 pointer-events-none">
          <div className="p-8 rounded-2xl border-2 border-dashed border-accent bg-accent/5 text-center">
            <p className="text-lg text-accent font-semibold">Drop to replace document</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Doc Icon ─────────────────────────────────────────────────────

function DocIcon({ ext }: { ext: string }) {
  const colors: Record<string, string> = {
    '.pdf': 'text-red-400',
    '.docx': 'text-blue-400',
    '.txt': 'text-gray-400',
    '.md': 'text-purple-400',
    '.csv': 'text-green-400'
  }
  return (
    <svg className={`w-3.5 h-3.5 ${colors[ext] ?? 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
