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
    downloadUpdate: () => Promise<void>
    installUpdate: () => Promise<void>
    onUpdateAvailable: (callback: (data: { version: string }) => void) => () => void
    onUpdateDownloaded: (callback: () => void) => () => void
    getStats: () => Promise<UsageStatsData>
    recordConvo: () => Promise<void>
    recordMessage: (modelName: string, responseTimeMs: number, tokenCount: number) => Promise<void>
    getBenchmarks: () => Promise<BenchmarkResultData[]>
    runBenchmark: (modelPath: string, modelName: string) => Promise<BenchmarkResultData>
    getHWLive: () => Promise<LiveHWData>
    kbGetAll: () => Promise<KnowledgeBaseData[]>
    kbGet: (id: string) => Promise<KnowledgeBaseData | null>
    kbGetDocs: (id: string) => Promise<KBDocumentData[]>
    kbCreate: (name: string, sourcePath: string) => Promise<KnowledgeBaseData>
    kbReindex: (id: string) => Promise<KnowledgeBaseData | null>
    kbDelete: (id: string) => Promise<void>
    kbSearch: (kbId: string, query: string) => Promise<KBSearchResultData[]>
    kbChat: (modelPath: string, kbId: string, message: string) => Promise<{ response: string; sources: KBSearchResultData[] }>
    kbSelectFolder: () => Promise<string | null>
    onKBIndexProgress: (callback: (data: { processed: number; total: number; currentFile: string }) => void) => () => void
    compareChat: (modelPathA: string, modelPathB: string, message: string) => Promise<{ responseA: string; responseB: string }>
    onCompareToken: (callback: (data: { side: 'A' | 'B'; token: string }) => void) => () => void
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

interface UsageStatsData {
  totalConversations: number
  totalMessages: number
  totalTokensEstimated: number
  modelUsage: Record<string, number>
  modelResponseTimes: Record<string, number[]>
  conversationsPerDay: Record<string, number>
}

interface BenchmarkResultData {
  modelName: string
  modelPath: string
  tokensPerSecond: number
  responseTimeMs: number
  ramUsageMB: number
  timestamp: number
}

interface LiveHWData {
  cpuUsagePercent: number
  ramUsedGB: number
  ramTotalGB: number
  ramPercent: number
}

interface KnowledgeBaseData {
  id: string
  name: string
  sourcePath: string
  documentCount: number
  chunkCount: number
  indexSizeBytes: number
  createdAt: number
  updatedAt: number
}

interface KBDocumentData {
  filename: string
  path: string
  chunkCount: number
  sizeBytes: number
}

interface KBSearchResultData {
  text: string
  score: number
  source: string
  chunkIndex: number
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
