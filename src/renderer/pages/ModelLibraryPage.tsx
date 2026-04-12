import { useEffect } from 'react'
import { useOllamaStore } from '../store/ollamaStore'

export default function ModelLibraryPage() {
  const { models, isOllamaRunning, fetchModels, pullModel, pullingModel } = useOllamaStore()

  useEffect(() => {
    if (isOllamaRunning) {
      fetchModels()
    }
  }, [isOllamaRunning, fetchModels])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Model Library</h1>
          <p className="text-sm text-gray-500 mt-1">Browse and manage your local AI models</p>
        </div>
      </div>

      {!isOllamaRunning ? (
        <div className="text-center py-20">
          <p className="text-gray-400 mb-2">Ollama is not running</p>
          <p className="text-sm text-gray-600">
            Start Ollama to browse and download models
          </p>
        </div>
      ) : models.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 mb-4">No models installed yet</p>
          <p className="text-sm text-gray-600 mb-6">
            Pull a model to get started
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['llama3.2', 'mistral', 'gemma2', 'phi3'].map((name) => (
              <button
                key={name}
                onClick={() => pullModel(name)}
                disabled={pullingModel !== null}
                className="px-4 py-2 bg-accent/10 text-accent rounded-lg text-sm hover:bg-accent/20 transition-colors disabled:opacity-50"
              >
                {pullingModel === name ? 'Pulling...' : `Pull ${name}`}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {models.map((model) => (
            <div
              key={model.name}
              className="flex items-center justify-between p-4 rounded-xl bg-surface border border-white/5"
            >
              <div>
                <h3 className="text-white font-medium">{model.name}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {formatSize(model.size)} &middot; Modified {formatDate(model.modified_at)}
                </p>
              </div>
              <span className="text-xs text-green-500 bg-green-500/10 px-3 py-1 rounded-full">
                Installed
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatSize(bytes: number): string {
  const gb = bytes / 1e9
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  return `${(bytes / 1e6).toFixed(0)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}
