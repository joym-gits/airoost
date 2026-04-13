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
    getFilePath: (file: File) => string
    exportPDF: (data: any) => Promise<string | null>
    exportDOCX: (data: any) => Promise<string | null>
    exportMarkdown: (data: any) => Promise<string>
    exportText: (data: any) => Promise<string>
    getPrompts: () => Promise<PromptData[]>
    createPrompt: (name: string, category: string, text: string) => Promise<PromptData>
    updatePrompt: (id: string, name: string, category: string, text: string) => Promise<PromptData | null>
    deletePrompt: (id: string) => Promise<void>
    togglePromptFav: (id: string) => Promise<boolean>
    getPersonas: () => Promise<PersonaData[]>
    getPersona: (id: string) => Promise<PersonaData | null>
    createPersona: (name: string, emoji: string, systemPrompt: string) => Promise<PersonaData>
    updatePersona: (id: string, name: string, emoji: string, systemPrompt: string) => Promise<PersonaData | null>
    deletePersona: (id: string) => Promise<void>
    chatWithPersona: (modelPath: string, systemPrompt: string, message: string) => Promise<string>
    parseDocument: (filePath: string) => Promise<ParsedDocument>
    docChat: (modelPath: string, docText: string, docFilename: string, message: string) => Promise<string>
    hfSearch: (query: string, limit?: number) => Promise<HFModel[]>
    hfDownload: (fileUrl: string, filename: string) => Promise<string>
    onDownloadProgress: (callback: (data: { modelId: string; percent: number; status: string }) => void) => () => void
    onChatToken: (callback: (data: { token: string; partial: string }) => void) => () => void
  }
}

interface PromptData {
  id: string
  name: string
  category: string
  text: string
  favourite: boolean
  builtin: boolean
}

interface PersonaData {
  id: string
  name: string
  emoji: string
  systemPrompt: string
  builtin: boolean
}

interface ParsedDocument {
  filename: string
  extension: string
  text: string
  pageCount: number
  charCount: number
  truncated: boolean
}

interface HFModel {
  id: string
  author: string
  name: string
  downloads: number
  likes: number
  tags: string[]
  pipelineTag: string
  badge: 'verified' | 'community'
  ggufFiles: { filename: string; sizeBytes: number; url: string }[]
  totalSizeBytes: number
  compatibility: { status: string; message: string }
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
