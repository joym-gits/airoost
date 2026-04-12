import { useEffect } from 'react'
import { useAppStore } from '../store/ollamaStore'

export default function ModelLibraryPage() {
  const {
    catalog,
    installedModels,
    fetchCatalog,
    fetchInstalled,
    downloadModel,
    deleteModel,
    downloadingModel,
    downloadProgress,
    downloadStatus
  } = useAppStore()

  useEffect(() => {
    fetchCatalog()
    fetchInstalled()
  }, [fetchCatalog, fetchInstalled])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Model Library</h1>
        <p className="text-sm text-gray-500 mt-1">Download and manage AI models</p>
      </div>

      {/* Installed models */}
      {installedModels.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Installed
          </h2>
          <div className="grid gap-3">
            {installedModels.map((model) => (
              <div
                key={model.id}
                className="flex items-center justify-between p-4 rounded-xl bg-surface border border-white/5"
              >
                <div>
                  <h3 className="text-white font-medium">{model.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{formatSize(model.size)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-green-500 bg-green-500/10 px-3 py-1 rounded-full">
                    Ready
                  </span>
                  <button
                    onClick={() => deleteModel(model.id)}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available models */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Available to Download
        </h2>
        <div className="grid gap-3">
          {catalog
            .filter((m) => !m.installed)
            .map((model) => (
              <div
                key={model.id}
                className="p-4 rounded-xl bg-surface border border-white/5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">{model.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {model.description} &middot; {model.size}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadModel(model.id)}
                    disabled={downloadingModel !== null}
                    className="px-4 py-2 bg-accent/10 text-accent rounded-lg text-sm hover:bg-accent/20 transition-colors disabled:opacity-50"
                  >
                    {downloadingModel === model.id ? 'Downloading...' : 'Download'}
                  </button>
                </div>

                {/* Progress bar */}
                {downloadingModel === model.id && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">{downloadStatus}</span>
                      <span className="text-xs text-white font-medium">{downloadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-300"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          {catalog.filter((m) => !m.installed).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              All available models are installed!
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function formatSize(bytes: number): string {
  const gb = bytes / 1e9
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  return `${(bytes / 1e6).toFixed(0)} MB`
}
