import { useNavigate } from 'react-router-dom'
import { useOllamaStore } from '../store/ollamaStore'
import { useEffect } from 'react'

export default function HomePage() {
  const navigate = useNavigate()
  const { isOllamaRunning, checkConnection } = useOllamaStore()

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      {/* Hero */}
      <div className="text-center max-w-2xl">
        <h1 className="text-6xl font-bold mb-4">
          <span className="text-accent">Air</span>
          <span className="text-white">oost</span>
        </h1>
        <p className="text-xl text-gray-400 mb-2">VLC for AI Models</p>
        <p className="text-sm text-gray-500 mb-10">
          Download and run open-source AI models locally. No CLI, no setup, no cloud.
        </p>

        {/* Status */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isOllamaRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-400">
            Ollama: {isOllamaRunning ? 'Connected' : 'Not running'}
          </span>
        </div>

        {/* Quick actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/models')}
            className="px-6 py-3 bg-accent hover:bg-accent-dark rounded-lg text-white font-medium transition-colors"
          >
            Browse Models
          </button>
          <button
            onClick={() => navigate('/chat')}
            className="px-6 py-3 bg-white/10 hover:bg-white/15 rounded-lg text-white font-medium transition-colors"
          >
            Start Chatting
          </button>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-3 gap-6 mt-16 max-w-3xl">
        <FeatureCard
          title="100% Local"
          description="Your data never leaves your machine"
        />
        <FeatureCard
          title="One-Click Install"
          description="Download any model with a single click"
        />
        <FeatureCard
          title="Cross-Platform"
          description="Works on Windows, macOS, and Linux"
        />
      </div>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-5 rounded-xl bg-surface border border-white/5">
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  )
}
