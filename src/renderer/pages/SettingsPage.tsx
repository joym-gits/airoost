import { useOllamaStore } from '../store/ollamaStore'

export default function SettingsPage() {
  const { isOllamaRunning, checkConnection } = useOllamaStore()

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Configure Airoost preferences</p>

      {/* Ollama Connection */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Ollama Connection
        </h2>
        <div className="p-4 rounded-xl bg-surface border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Ollama Server</p>
              <p className="text-xs text-gray-500 mt-1">http://localhost:11434</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isOllamaRunning ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-xs text-gray-400">
                  {isOllamaRunning ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <button
                onClick={checkConnection}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
              >
                Test
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          About
        </h2>
        <div className="p-4 rounded-xl bg-surface border border-white/5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Version</span>
            <span className="text-white">0.1.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Runtime</span>
            <span className="text-white">Electron + React</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Backend</span>
            <span className="text-white">Ollama</span>
          </div>
        </div>
      </section>
    </div>
  )
}
