import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'

type Tab = 'featured' | 'categories' | 'explore'

const CATEGORIES = [
  { id: 'general', label: 'General Chat', icon: '\uD83D\uDCAC' },
  { id: 'coding', label: 'Coding Assistant', icon: '\uD83D\uDCBB' },
  { id: 'lightweight', label: 'Lightweight', icon: '\uD83E\uDEB6' }
]

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
    downloadStatus,
    hardware
  } = useAppStore()

  const [tab, setTab] = useState<Tab>('featured')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    fetchCatalog()
    fetchInstalled()
  }, [fetchCatalog, fetchInstalled])

  const featuredModels = catalog.filter((m) => m.featured)
  const categoryModels = selectedCategory
    ? catalog.filter((m) => m.category.includes(selectedCategory))
    : []

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Model Library</h1>
        <p className="text-xs text-gray-500 mt-1">
          {installedModels.length} model{installedModels.length !== 1 ? 's' : ''} installed
          {hardware && <span> \u00B7 {hardware.totalRamGB} GB RAM \u00B7 {hardware.gpuName}</span>}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface rounded-lg p-1 w-fit">
        {([
          { id: 'featured' as Tab, label: 'Featured' },
          { id: 'categories' as Tab, label: 'Categories' },
          { id: 'explore' as Tab, label: 'Explore All' }
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSelectedCategory(null) }}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Featured Tab ── */}
      {tab === 'featured' && (
        <div className="grid gap-3">
          {featuredModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              downloadingModel={downloadingModel}
              downloadProgress={downloadProgress}
              downloadStatus={downloadStatus}
              onDownload={() => downloadModel(model.id)}
              onDelete={() => deleteModel(model.id)}
            />
          ))}
        </div>
      )}

      {/* ── Categories Tab ── */}
      {tab === 'categories' && !selectedCategory && (
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => {
            const count = catalog.filter((m) => m.category.includes(cat.id)).length
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-white/5 hover:border-accent/30 text-left transition-colors"
              >
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <p className="text-sm text-white font-medium">{cat.label}</p>
                  <p className="text-xs text-gray-500">{count} model{count !== 1 ? 's' : ''}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {tab === 'categories' && selectedCategory && (
        <div>
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-xs text-gray-500 hover:text-white mb-4 flex items-center gap-1 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to categories
          </button>
          <div className="grid gap-3">
            {categoryModels.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                downloadingModel={downloadingModel}
                downloadProgress={downloadProgress}
                downloadStatus={downloadStatus}
                onDownload={() => downloadModel(model.id)}
                onDelete={() => deleteModel(model.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Explore All Tab (HuggingFace stub) ── */}
      {tab === 'explore' && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Hugging Face Explorer</h2>
          <p className="text-sm text-gray-400 mb-1">
            Search 500,000+ models on Hugging Face.
          </p>
          <p className="text-xs text-gray-600 mb-6">
            Filtered to GGUF format. One-click download into Airoost.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm">
            Coming Soon
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Model Card Component ─────────────────────────────────────────

function ModelCard({
  model,
  downloadingModel,
  downloadProgress,
  downloadStatus,
  onDownload,
  onDelete
}: {
  model: CatalogModel
  downloadingModel: string | null
  downloadProgress: number
  downloadStatus: string
  onDownload: () => void
  onDelete: () => void
}) {
  const isDownloading = downloadingModel === model.id
  const compat = model.compatibility

  return (
    <div className="p-4 rounded-xl bg-surface border border-white/5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-medium text-sm">{model.name}</h3>
            {model.badge === 'verified' && (
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">{model.author}</span>
            )}
            {model.bundled && (
              <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">Bundled</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-2">{model.description}</p>
          <div className="flex items-center gap-3 text-[11px] text-gray-600">
            <span>{model.size}</span>
            <span>\u00B7</span>
            <span>Needs {model.ramRequired}+ GB RAM</span>
            <span>\u00B7</span>
            {/* Compatibility indicator */}
            <span className={
              compat.status === 'smooth' ? 'text-green-500' :
              compat.status === 'slow' ? 'text-yellow-500' :
              'text-red-500'
            }>
              {compat.status === 'smooth' ? '\u2705 ' : compat.status === 'slow' ? '\u26A0\uFE0F ' : '\uD83D\uDED1 '}
              {compat.message}
            </span>
          </div>
        </div>

        {/* Action button */}
        <div className="shrink-0">
          {model.installed ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full">Installed</span>
              {!model.bundled && (
                <button onClick={onDelete} className="text-[11px] text-gray-600 hover:text-red-400 transition-colors">
                  Remove
                </button>
              )}
            </div>
          ) : compat.status === 'too-large' ? (
            <span className="text-[11px] text-red-500/50 px-2.5 py-1">Too large</span>
          ) : (
            <button
              onClick={onDownload}
              disabled={downloadingModel !== null}
              className="px-3.5 py-1.5 bg-accent/10 text-accent rounded-lg text-xs font-medium hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isDownloading && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-gray-500">{downloadStatus}</span>
            <span className="text-[11px] text-white font-medium">{downloadProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
