interface Window {
  airoost: {
    getCatalog: () => Promise<CatalogModel[]>
    getInstalled: () => Promise<InstalledModel[]>
    getModelsDir: () => Promise<string>
    downloadModel: (modelId: string) => Promise<string>
    deleteModel: (modelId: string) => Promise<void>
    chat: (modelPath: string, message: string) => Promise<string>
    resetChat: () => Promise<void>
    detectHardware: () => Promise<HardwareInfo>
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
  ramRequired: number
  url: string
  filename: string
  category: string[]
  featured: boolean
  author: string
  badge: 'verified' | 'community'
  bundled?: boolean
  installed: boolean
  compatibility: { status: 'smooth' | 'slow' | 'too-large'; message: string }
}

interface InstalledModel {
  id: string
  name: string
  size: number
  path: string
}

interface HardwareInfo {
  totalRamGB: number
  availableRamGB: number
  cpuModel: string
  cpuCores: number
  gpuName: string
  gpuVramGB: number
  diskFreeGB: number
  platform: string
  arch: string
}
