import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '../store/appStore'

type Tab = 'featured' | 'categories' | 'explore'

// HuggingFace Explore state (local to this page)
function useHFExplore() {
  const [results, setResults] = useState<HFModel[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)
  const [dlProgress, setDlProgress] = useState(0)
  const [dlStatus, setDlStatus] = useState('')

  const search = useCallback(async (q: string) => {
    setLoading(true)
    setSearched(true)
    try {
      const models = await window.airoost.hfSearch(q, 20)
      setResults(models)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTrending = useCallback(() => search(''), [search])

  const downloadFile = useCallback(async (fileUrl: string, filename: string) => {
    setDownloadingFile(filename)
    setDlProgress(0)
    setDlStatus('Starting...')

    const cleanup = window.airoost.onDownloadProgress(({ modelId, percent, status }) => {
      if (modelId === filename) {
        setDlProgress(percent)
        setDlStatus(status)
      }
    })

    try {
      await window.airoost.hfDownload(fileUrl, filename)
      setDownloadingFile(null)
      setDlStatus('')
    } catch {
      setDlStatus('Download failed')
      setDownloadingFile(null)
    } finally {
      cleanup()
    }
  }, [])

  return { results, query, setQuery, loading, searched, search, loadTrending, downloadFile, downloadingFile, dlProgress, dlStatus }
}

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

      {/* ── Explore All Tab (HuggingFace Live) ── */}
      {tab === 'explore' && (
        <ExploreTab
          downloadingModel={downloadingModel}
          downloadProgress={downloadProgress}
          downloadStatus={downloadStatus}
          fetchInstalled={fetchInstalled}
          fetchCatalog={fetchCatalog}
        />
      )}
    </div>
  )
}

// ─── Explore Tab (HuggingFace Live Search) ───────────────────────

function ExploreTab({
  downloadingModel,
  downloadProgress,
  downloadStatus,
  fetchInstalled,
  fetchCatalog
}: {
  downloadingModel: string | null
  downloadProgress: number
  downloadStatus: string
  fetchInstalled: () => Promise<void>
  fetchCatalog: () => Promise<void>
}) {
  const hf = useHFExplore()
  const [expandedModel, setExpandedModel] = useState<string | null>(null)

  useEffect(() => {
    hf.loadTrending()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    hf.search(hf.query)
  }

  const handleDownload = async (fileUrl: string, filename: string) => {
    await hf.downloadFile(fileUrl, filename)
    // Refresh installed models after download
    await fetchInstalled()
    await fetchCatalog()
  }

  return (
    <div>
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={hf.query}
            onChange={(e) => hf.setQuery(e.target.value)}
            placeholder="Search GGUF models on Hugging Face..."
            className="w-full bg-surface border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-accent/50 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={hf.loading}
          className="px-5 py-2.5 bg-accent hover:bg-accent-dark rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {hf.loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Loading */}
      {hf.loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Searching Hugging Face...
          </div>
        </div>
      )}

      {/* Results */}
      {!hf.loading && hf.searched && hf.results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No GGUF models found. Try a different search.</p>
        </div>
      )}

      {!hf.loading && hf.results.length > 0 && (
        <div className="grid gap-3">
          {hf.results.map((model) => (
            <HFModelCard
              key={model.id}
              model={model}
              expanded={expandedModel === model.id}
              onToggle={() => setExpandedModel(expandedModel === model.id ? null : model.id)}
              onDownload={handleDownload}
              downloadingFile={hf.downloadingFile}
              dlProgress={hf.dlProgress}
              dlStatus={hf.dlStatus}
              globalDownloading={downloadingModel}
              globalProgress={downloadProgress}
              globalStatus={downloadStatus}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {!hf.loading && hf.results.length > 0 && (
        <p className="text-center text-[11px] text-gray-600 mt-6">
          Showing {hf.results.length} GGUF models from Hugging Face \u00B7 Sorted by downloads
        </p>
      )}
    </div>
  )
}

// ─── HF Model Card ───────────────────────────────────────────────

function HFModelCard({
  model,
  expanded,
  onToggle,
  onDownload,
  downloadingFile,
  dlProgress,
  dlStatus,
  globalDownloading,
  globalProgress,
  globalStatus
}: {
  model: HFModel
  expanded: boolean
  onToggle: () => void
  onDownload: (fileUrl: string, filename: string) => void
  downloadingFile: string | null
  dlProgress: number
  dlStatus: string
  globalDownloading: string | null
  globalProgress: number
  globalStatus: string
}) {
  const compat = model.compatibility
  const smallestFile = model.ggufFiles[0]
  const isAnyDownloading = downloadingFile !== null || globalDownloading !== null

  return (
    <div className="p-4 rounded-xl bg-surface border border-white/5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-white font-medium text-sm truncate">{model.name}</h3>
            {model.badge === 'verified' ? (
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded shrink-0">{model.author}</span>
            ) : (
              <span className="text-[10px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded shrink-0">{model.author}</span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
            <span>{formatBytes(model.totalSizeBytes)}</span>
            <span>\u00B7</span>
            <span>{formatDownloads(model.downloads)} downloads</span>
            <span>\u00B7</span>
            <span>{model.likes} likes</span>
            {model.pipelineTag && (
              <>
                <span>\u00B7</span>
                <span className="text-gray-600">{model.pipelineTag}</span>
              </>
            )}
            <span>\u00B7</span>
            <span className={
              compat.status === 'smooth' ? 'text-green-500' :
              compat.status === 'slow' ? 'text-yellow-500' :
              compat.status === 'too-large' ? 'text-red-500' :
              'text-gray-500'
            }>
              {compat.status === 'smooth' ? '\u2705' : compat.status === 'slow' ? '\u26A0\uFE0F' : compat.status === 'too-large' ? '\uD83D\uDED1' : '\u2753'}
              {' '}{compat.message}
            </span>
          </div>
        </div>

        {/* Quick download (smallest file) or expand */}
        <div className="shrink-0 flex items-center gap-2">
          {model.ggufFiles.length > 0 && (
            <>
              {model.ggufFiles.length > 1 && (
                <button
                  onClick={onToggle}
                  className="text-[11px] text-gray-500 hover:text-white transition-colors"
                >
                  {expanded ? 'Hide' : `${model.ggufFiles.length} files`}
                </button>
              )}
              {smallestFile && compat.status !== 'too-large' && (
                <button
                  onClick={() => onDownload(smallestFile.url, smallestFile.filename)}
                  disabled={isAnyDownloading}
                  className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-xs font-medium hover:bg-accent/20 transition-colors disabled:opacity-50"
                >
                  {downloadingFile === smallestFile.filename ? 'Downloading...' : `Download ${formatBytes(smallestFile.sizeBytes)}`}
                </button>
              )}
            </>
          )}
          {model.ggufFiles.length === 0 && (
            <span className="text-[11px] text-gray-600">No GGUF files</span>
          )}
        </div>
      </div>

      {/* Download progress */}
      {downloadingFile && model.ggufFiles.some(f => f.filename === downloadingFile) && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-gray-500">{dlStatus}</span>
            <span className="text-[11px] text-white font-medium">{dlProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${dlProgress}%` }} />
          </div>
        </div>
      )}

      {/* Expanded file list */}
      {expanded && model.ggufFiles.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Available GGUF files</p>
          {model.ggufFiles.map((file) => (
            <div key={file.filename} className="flex items-center justify-between py-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-300 truncate">{file.filename}</p>
                <p className="text-[11px] text-gray-600">{formatBytes(file.sizeBytes)}</p>
              </div>
              <button
                onClick={() => onDownload(file.url, file.filename)}
                disabled={isAnyDownloading}
                className="shrink-0 ml-3 px-3 py-1 bg-white/5 hover:bg-accent/10 text-gray-400 hover:text-accent rounded-lg text-[11px] transition-colors disabled:opacity-50"
              >
                {downloadingFile === file.filename ? `${dlProgress}%` : 'Download'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (!bytes) return 'Unknown size'
  const gb = bytes / 1e9
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  return `${(bytes / 1e6).toFixed(0)} MB`
}

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
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
