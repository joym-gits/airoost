import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../store/ollamaStore'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPage() {
  const {
    installedModels,
    selectedModelPath,
    setSelectedModel,
    sendMessage,
    resetChat,
    isGenerating,
    streamingText,
    fetchInstalled
  } = useAppStore()

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchInstalled()
  }, [fetchInstalled])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const handleSend = async () => {
    if (!input.trim() || !selectedModelPath || isGenerating) return

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')

    try {
      const response = await sendMessage(selectedModelPath, input.trim())
      setMessages([...newMessages, { role: 'assistant', content: response }])
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Error: Failed to generate response. Please try again.' }
      ])
    }
  }

  const handleNewChat = async () => {
    await resetChat()
    setMessages([])
  }

  const noModels = installedModels.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-white/10">
        <h1 className="text-lg font-semibold text-white">Chat</h1>
        <select
          value={selectedModelPath ?? ''}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-surface border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 outline-none"
        >
          {noModels && <option value="">No models installed</option>}
          {installedModels.map((m) => (
            <option key={m.path} value={m.path}>
              {m.name}
            </option>
          ))}
        </select>
        {messages.length > 0 && (
          <button
            onClick={handleNewChat}
            className="ml-auto text-xs text-gray-400 hover:text-white px-3 py-1.5 bg-white/5 rounded-lg transition-colors"
          >
            New Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && !isGenerating && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-sm">
              {noModels
                ? 'Download a model from the Model Library to start chatting'
                : 'Send a message to start chatting'}
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent text-white rounded-br-md'
                  : 'bg-surface text-gray-200 rounded-bl-md'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {/* Streaming response */}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="max-w-[70%] bg-surface px-4 py-3 rounded-2xl rounded-bl-md text-sm text-gray-200 leading-relaxed">
              {streamingText ? (
                <p className="whitespace-pre-wrap">{streamingText}<span className="animate-pulse">▌</span></p>
              ) : (
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={noModels ? 'Download a model first...' : 'Type a message...'}
            disabled={noModels || isGenerating}
            className="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 outline-none focus:border-accent/50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || noModels || isGenerating}
            className="px-5 py-3 bg-accent hover:bg-accent-dark rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
