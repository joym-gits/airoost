import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'

export default function ChatPage() {
  const navigate = useNavigate()
  const {
    installedModels,
    selectedModelPath,
    selectedModelName,
    setSelectedModel,
    conversations,
    activeConversationId,
    createConversation,
    sendMessage,
    regenerateLastResponse,
    isGenerating,
    streamingText,
    activePersona,
    setActivePersona
  } = useAppStore()

  const [input, setInput] = useState('')
  const [personas, setPersonas] = useState<PersonaData[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeConvo = conversations.find((c) => c.id === activeConversationId)
  const messages = activeConvo?.messages ?? []
  const noModels = installedModels.length === 0

  // Fetch personas on mount
  useEffect(() => {
    window.airoost.getPersonas().then(setPersonas)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  useEffect(() => {
    inputRef.current?.focus()
  }, [activeConversationId])

  const handleSend = async () => {
    if (!input.trim() || isGenerating || noModels) return
    const msg = input.trim()
    setInput('')

    if (!activeConversationId) {
      createConversation()
    }

    await sendMessage(msg)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Bundled model banner
  const isBundledModel = selectedModelName?.includes('Phi-3')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5">
        {/* Model selector */}
        <select
          value={selectedModelPath ?? ''}
          onChange={(e) => {
            const model = installedModels.find((m) => m.path === e.target.value)
            if (model) setSelectedModel(model.path, model.name)
          }}
          className="bg-surface-dark border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none"
        >
          {noModels && <option value="">No models installed</option>}
          {installedModels.map((m) => (
            <option key={m.path} value={m.path}>{m.name}</option>
          ))}
        </select>

        {/* Persona selector */}
        <select
          value={activePersona?.id ?? ''}
          onChange={(e) => {
            const p = personas.find((p) => p.id === e.target.value)
            setActivePersona(p ?? null)
          }}
          className="bg-surface-dark border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none"
        >
          <option value="">No Persona</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
          ))}
        </select>

        {/* Active persona badge */}
        {activePersona && (
          <span className="text-[11px] text-accent/70">
            {activePersona.emoji} {activePersona.name}
          </span>
        )}

        {isBundledModel && !activePersona && (
          <button
            onClick={() => navigate('/models')}
            className="text-[11px] text-gray-500 hover:text-accent transition-colors"
          >
            Running Phi-3 Mini \u2014 explore more powerful models in the library \u2192
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Empty state */}
        {messages.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {noModels ? (
              <>
                <p className="text-gray-500 text-sm mb-4">Download a model to start chatting</p>
                <button
                  onClick={() => navigate('/models')}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-dark rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Browse Models
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-white mb-1">
                  <span className="text-accent">Air</span>oost
                </h2>
                <p className="text-sm text-gray-500 mb-6">AI that stays home.</p>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  {['Explain quantum computing simply', 'Write a haiku about coding', 'Help me plan a weekend trip', 'Summarize the theory of relativity'].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => { setInput(prompt); inputRef.current?.focus() }}
                      className="text-left px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`group relative max-w-[75%] ${msg.role === 'user' ? '' : ''}`}>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent text-white rounded-br-md'
                    : 'bg-surface text-gray-200 rounded-bl-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>

              {/* Actions on assistant messages */}
              {msg.role === 'assistant' && !isGenerating && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1">
                  <button
                    onClick={() => handleCopy(msg.content)}
                    className="text-[10px] text-gray-600 hover:text-gray-300 px-2 py-0.5 rounded bg-white/5 transition-colors"
                  >
                    Copy
                  </button>
                  {i === messages.length - 1 && (
                    <button
                      onClick={regenerateLastResponse}
                      className="text-[10px] text-gray-600 hover:text-gray-300 px-2 py-0.5 rounded bg-white/5 transition-colors"
                    >
                      Regenerate
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming response */}
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

      {/* Input */}
      <div className="px-5 py-4 border-t border-white/5">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={noModels ? 'Download a model first...' : 'Type a message...'}
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
    </div>
  )
}
