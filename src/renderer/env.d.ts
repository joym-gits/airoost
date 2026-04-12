interface Window {
  airoost: {
    getCatalog: () => Promise<CatalogModel[]>
    getInstalled: () => Promise<InstalledModel[]>
    downloadModel: (modelId: string) => Promise<string>
    deleteModel: (modelId: string) => Promise<void>
    chat: (modelPath: string, message: string) => Promise<string>
    resetChat: () => Promise<void>
    onDownloadProgress: (callback: (data: { modelId: string; percent: number; status: string }) => void) => () => void
    onChatToken: (callback: (data: { token: string; partial: string }) => void) => () => void
  }
}

interface CatalogModel {
  id: string
  name: string
  description: string
  size: string
  sizeBytes: number
  url: string
  filename: string
  installed: boolean
}

interface InstalledModel {
  id: string
  name: string
  size: number
  path: string
}
