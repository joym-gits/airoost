import { useState, useRef, useEffect } from 'react'
import { useOllamaStore } from '../store/ollamaStore'
import type { ChatMessage } from '../../shared/types'

export default function ChatPage() {
  const { models, isOllamaRunning, fetchModels, sendMessage } = useOllamaStore()
  const [selectedModel, setSelectedModel] = useState('')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOllamaRunning) fetchModels()
  }, [isOllamaRunning, fetchModels])

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].name)
    }
  }, [models, selectedModel])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !selectedModel || isStreaming) return

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsStreaming(true)

    try {
      const response = await sendMessage(selectedModel, newMessages)
      setMessages([...newMessages, { role: 'assistant', content: response }])
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Error: Failed to get response. Is Ollama running?' }
      ])
    } finally {
      setIsStreaming(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-white/10">
        <h1 className="text-lg font-semibold text-white">Chat</h1>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-surface border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 outline-none"
        >
          {models.length === 0 && <option value="">No models available</option>}
          {models.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-sm">
              {isOllamaRunning
                ? 'Send a message to start chatting'
                : 'Start Ollama to begin chatting'}
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
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
        {isStreaming && (
          <div className="flex justify-start">
            <div className="bg-surface px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
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
            placeholder={isOllamaRunning ? 'Type a message...' : 'Ollama not running...'}
            disabled={!isOllamaRunning || isStreaming}
            className="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 outline-none focus:border-accent/50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !isOllamaRunning || isStreaming}
            className="px-5 py-3 bg-accent hover:bg-accent-dark rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
