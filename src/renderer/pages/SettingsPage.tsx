import { useAppStore } from '../store/ollamaStore'
import { useEffect } from 'react'

export default function SettingsPage() {
  const { installedModels, fetchInstalled } = useAppStore()

  useEffect(() => {
    fetchInstalled()
  }, [fetchInstalled])

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Configure Airoost preferences</p>

      {/* Engine info */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          AI Engine
        </h2>
        <div className="p-4 rounded-xl bg-surface border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Built-in Engine</p>
              <p className="text-xs text-gray-500 mt-1">Powered by llama.cpp (node-llama-cpp)</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-400">Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* Models */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Installed Models
        </h2>
        <div className="p-4 rounded-xl bg-surface border border-white/5 space-y-2">
          {installedModels.length === 0 ? (
            <p className="text-sm text-gray-500">No models installed</p>
          ) : (
            installedModels.map((m) => (
              <div key={m.id} className="flex justify-between text-sm">
                <span className="text-gray-400">{m.name}</span>
                <span className="text-white">{(m.size / 1e9).toFixed(1)} GB</span>
              </div>
            ))
          )}
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
            <span className="text-gray-500">AI Engine</span>
            <span className="text-white">llama.cpp (built-in)</span>
          </div>
        </div>
      </section>
    </div>
  )
}
