import { create } from 'zustand'

interface AppState {
  // Models
  catalog: CatalogModel[]
  installedModels: InstalledModel[]
  downloadingModel: string | null
  downloadProgress: number
  downloadStatus: string

  // Chat
  selectedModelPath: string | null
  isGenerating: boolean
  streamingText: string

  // Actions
  fetchCatalog: () => Promise<void>
  fetchInstalled: () => Promise<void>
  downloadModel: (modelId: string) => Promise<void>
  deleteModel: (modelId: string) => Promise<void>
  sendMessage: (modelPath: string, message: string) => Promise<string>
  resetChat: () => Promise<void>
  setSelectedModel: (path: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  catalog: [],
  installedModels: [],
  downloadingModel: null,
  downloadProgress: 0,
  downloadStatus: '',

  selectedModelPath: null,
  isGenerating: false,
  streamingText: '',

  fetchCatalog: async () => {
    const catalog = await window.airoost.getCatalog()
    set({ catalog })
  },

  fetchInstalled: async () => {
    const installedModels = await window.airoost.getInstalled()
    set({ installedModels })
    // Auto-select first model if none selected
    if (!get().selectedModelPath && installedModels.length > 0) {
      set({ selectedModelPath: installedModels[0].path })
    }
  },

  downloadModel: async (modelId: string) => {
    set({ downloadingModel: modelId, downloadProgress: 0, downloadStatus: 'Starting download...' })

    const cleanup = window.airoost.onDownloadProgress(({ modelId: id, percent, status }) => {
      if (id === modelId) {
        set({ downloadProgress: percent, downloadStatus: status })
      }
    })

    try {
      await window.airoost.downloadModel(modelId)
      // Refresh lists
      const catalog = await window.airoost.getCatalog()
      const installedModels = await window.airoost.getInstalled()
      set({
        catalog,
        installedModels,
        downloadingModel: null,
        downloadProgress: 100,
        downloadStatus: 'Complete!'
      })
      if (!get().selectedModelPath && installedModels.length > 0) {
        set({ selectedModelPath: installedModels[0].path })
      }
    } catch {
      set({ downloadingModel: null, downloadStatus: 'Download failed' })
    } finally {
      cleanup()
    }
  },

  deleteModel: async (modelId: string) => {
    await window.airoost.deleteModel(modelId)
    const catalog = await window.airoost.getCatalog()
    const installedModels = await window.airoost.getInstalled()
    set({ catalog, installedModels })
  },

  sendMessage: async (modelPath: string, message: string) => {
    set({ isGenerating: true, streamingText: '' })

    const cleanup = window.airoost.onChatToken(({ partial }) => {
      set({ streamingText: partial })
    })

    try {
      const response = await window.airoost.chat(modelPath, message)
      return response
    } finally {
      cleanup()
      set({ isGenerating: false, streamingText: '' })
    }
  },

  resetChat: async () => {
    await window.airoost.resetChat()
  },

  setSelectedModel: (path: string) => {
    set({ selectedModelPath: path })
  }
}))
