import { create } from 'zustand'

// ─── Types ──────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface Folder {
  id: string
  name: string
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  modelId: string
  modelPath: string
  personaId: string | null
  personaName: string | null
  personaEmoji: string | null
  folderId: string | null
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface SearchResult {
  conversation: Conversation
  excerpt: string
  matchStart: number
  matchEnd: number
}

// ─── Persistence ────────────────────────────────────────────────

const CONVERSATIONS_KEY = 'airoost_conversations'
const FOLDERS_KEY = 'airoost_folders'

const DEFAULT_FOLDERS: Folder[] = [
  { id: 'folder_general', name: 'General' },
  { id: 'folder_work', name: 'Work' },
  { id: 'folder_research', name: 'Research' },
  { id: 'folder_personal', name: 'Personal' }
]

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY)
    const convos: Conversation[] = raw ? JSON.parse(raw) : []
    // Migrate old conversations that lack new fields
    return convos.map((c) => ({
      ...c,
      folderId: c.folderId ?? null,
      tags: c.tags ?? []
    }))
  } catch {
    return []
  }
}

function saveConversations(convos: Conversation[]): void {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convos))
}

function loadFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_FOLDERS
  } catch {
    return DEFAULT_FOLDERS
  }
}

function saveFolders(folders: Folder[]): void {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders))
}

// ─── Store Interface ────────────────────────────────────────────

interface AppState {
  // Models
  catalog: CatalogModel[]
  installedModels: InstalledModel[]
  downloadingModel: string | null
  downloadProgress: number
  downloadStatus: string
  hardware: HardwareInfo | null

  // Chat
  conversations: Conversation[]
  activeConversationId: string | null
  selectedModelPath: string | null
  selectedModelName: string | null
  activePersona: PersonaData | null
  isGenerating: boolean
  streamingText: string

  // Comparison Mode
  compareMode: boolean
  compareModelA: { path: string; name: string } | null
  compareModelB: { path: string; name: string } | null
  compareStreamA: string
  compareStreamB: string
  compareGeneratingA: boolean
  compareGeneratingB: boolean
  compareTimeA: number | null
  compareTimeB: number | null

  // Organisation
  folders: Folder[]
  activeFolderId: string | null
  activeTagFilter: string | null
  sidebarSearch: string

  // Actions - Models
  fetchCatalog: () => Promise<void>
  fetchInstalled: () => Promise<void>
  downloadModel: (modelId: string) => Promise<void>
  deleteModel: (modelId: string) => Promise<void>
  detectHardware: () => Promise<void>
  setSelectedModel: (path: string, name: string) => void

  // Actions - Persona
  setActivePersona: (persona: PersonaData | null) => void

  // Actions - Chat
  createConversation: () => void
  setActiveConversation: (id: string) => void
  deleteConversation: (id: string) => void
  sendMessage: (message: string) => Promise<void>
  regenerateLastResponse: () => Promise<void>
  resetCurrentChat: () => Promise<void>

  // Actions - Conversation Management
  renameConversation: (id: string, title: string) => void
  duplicateConversation: (id: string) => void
  moveToFolder: (convoId: string, folderId: string | null) => void
  addTag: (convoId: string, tag: string) => void
  removeTag: (convoId: string, tag: string) => void
  exportConversation: (id: string, format: 'markdown' | 'text') => string | null

  // Actions - Folders
  createFolder: (name: string) => void
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  setActiveFolderId: (id: string | null) => void

  // Actions - Comparison
  setCompareMode: (on: boolean) => void
  setCompareModelA: (path: string, name: string) => void
  setCompareModelB: (path: string, name: string) => void
  sendCompareMessage: (message: string) => Promise<void>
  adoptCompareResponse: (side: 'A' | 'B', response: string) => void

  // Actions - Filtering
  setActiveTagFilter: (tag: string | null) => void
  setSidebarSearch: (query: string) => void
  getFilteredConversations: () => Conversation[]
  searchConversations: (query: string) => SearchResult[]
  getAllTags: () => string[]
}

// ─── Store Implementation ───────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  // State
  catalog: [],
  installedModels: [],
  downloadingModel: null,
  downloadProgress: 0,
  downloadStatus: '',
  hardware: null,

  conversations: loadConversations(),
  activeConversationId: null,
  selectedModelPath: null,
  selectedModelName: null,
  activePersona: null,
  isGenerating: false,
  streamingText: '',

  compareMode: false,
  compareModelA: null,
  compareModelB: null,
  compareStreamA: '',
  compareStreamB: '',
  compareGeneratingA: false,
  compareGeneratingB: false,
  compareTimeA: null,
  compareTimeB: null,

  folders: loadFolders(),
  activeFolderId: null,
  activeTagFilter: null,
  sidebarSearch: '',

  // ─── Model Actions ───────────────────────────────────────────

  fetchCatalog: async () => {
    const catalog = await window.airoost.getCatalog()
    set({ catalog })
  },

  fetchInstalled: async () => {
    const installedModels = await window.airoost.getInstalled()
    set({ installedModels })
    if (!get().selectedModelPath && installedModels.length > 0) {
      set({ selectedModelPath: installedModels[0].path, selectedModelName: installedModels[0].name })
    }
  },

  downloadModel: async (modelId: string) => {
    set({ downloadingModel: modelId, downloadProgress: 0, downloadStatus: 'Starting download...' })
    const cleanup = window.airoost.onDownloadProgress(({ modelId: id, percent, status }) => {
      if (id === modelId) set({ downloadProgress: percent, downloadStatus: status })
    })
    try {
      await window.airoost.downloadModel(modelId)
      const catalog = await window.airoost.getCatalog()
      const installedModels = await window.airoost.getInstalled()
      set({ catalog, installedModels, downloadingModel: null, downloadProgress: 100, downloadStatus: 'Complete!' })
      if (!get().selectedModelPath && installedModels.length > 0) {
        set({ selectedModelPath: installedModels[0].path, selectedModelName: installedModels[0].name })
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

  detectHardware: async () => {
    const hardware = await window.airoost.detectHardware()
    set({ hardware })
  },

  setSelectedModel: (path, name) => set({ selectedModelPath: path, selectedModelName: name }),

  // ─── Persona Actions ────────────────────────────────────────

  setActivePersona: (persona) => set({ activePersona: persona }),

  // ─── Chat Actions ────────────────────────────────────────────

  createConversation: () => {
    const { selectedModelPath, selectedModelName, installedModels, activePersona, activeFolderId } = get()
    const modelPath = selectedModelPath ?? installedModels[0]?.path ?? ''
    const modelName = selectedModelName ?? installedModels[0]?.name ?? 'Unknown'

    const convo: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'New Chat',
      messages: [],
      modelId: modelName,
      modelPath,
      personaId: activePersona?.id ?? null,
      personaName: activePersona?.name ?? null,
      personaEmoji: activePersona?.emoji ?? null,
      folderId: activeFolderId,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    const conversations = [convo, ...get().conversations]
    saveConversations(conversations)
    set({ conversations, activeConversationId: convo.id })
    window.airoost.resetChat()
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id })
    window.airoost.resetChat().catch(() => {})
  },

  deleteConversation: (id) => {
    const conversations = get().conversations.filter((c) => c.id !== id)
    saveConversations(conversations)
    const activeId = get().activeConversationId === id ? null : get().activeConversationId
    set({ conversations, activeConversationId: activeId })
  },

  sendMessage: async (message: string) => {
    const { activeConversationId, conversations, selectedModelPath, installedModels } = get()
    const modelPath = selectedModelPath ?? installedModels[0]?.path
    if (!modelPath) return

    let convoId = activeConversationId
    let convos = [...conversations]

    if (!convoId) {
      get().createConversation()
      convoId = get().activeConversationId
      convos = get().conversations
    }

    const convo = convos.find((c) => c.id === convoId)
    if (!convo) return

    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: Date.now() }
    convo.messages.push(userMsg)

    if (convo.messages.length === 1) {
      convo.title = message.slice(0, 50) + (message.length > 50 ? '...' : '')
    }

    convo.updatedAt = Date.now()
    saveConversations(convos)
    set({ conversations: [...convos], isGenerating: true, streamingText: '' })

    const cleanup = window.airoost.onChatToken(({ partial }) => {
      set({ streamingText: partial })
    })

    try {
      const { activePersona, selectedModelName } = get()
      const startTime = Date.now()
      const response = activePersona
        ? await window.airoost.chatWithPersona(modelPath, activePersona.systemPrompt, message)
        : await window.airoost.chat(modelPath, message)
      const elapsed = Date.now() - startTime
      const tokenEstimate = response.split(/\s+/).length
      const assistantMsg: ChatMessage = { role: 'assistant', content: response, timestamp: Date.now() }
      convo.messages.push(assistantMsg)
      convo.updatedAt = Date.now()
      saveConversations(convos)
      set({ conversations: [...convos] })

      // Record stats
      window.airoost.recordMessage(selectedModelName ?? 'Unknown', elapsed, tokenEstimate).catch(() => {})
    } catch (err: any) {
      const rawMsg = err?.message ?? String(err)
      let userMsg = `Error: ${rawMsg}`

      // Translate common llama.cpp errors into helpful messages
      if (rawMsg.includes('unknown model architecture') || rawMsg.includes('unsupported')) {
        userMsg = `This model\'s architecture isn\'t supported by the built-in AI engine. Try a different GGUF file — look for models with "llama", "mistral", "gemma", "phi", or "qwen2" in the name.`
      } else if (rawMsg.includes('load') && rawMsg.includes('fail')) {
        userMsg = `Failed to load model. The GGUF file may be corrupted or incomplete — try re-downloading it from the Model Library.`
      } else if (rawMsg.includes('No active session') || rawMsg.includes('No active context')) {
        userMsg = `Model isn\'t ready yet. Wait a moment and try again, or pick a different model from the dropdown above.`
      } else if (rawMsg.includes('out of memory') || rawMsg.includes('allocate')) {
        userMsg = `Not enough memory to run this model on your machine. Try a smaller model (look for "1B" or "3B" variants).`
      }

      convo.messages.push({ role: 'assistant', content: userMsg, timestamp: Date.now() })
      saveConversations(convos)
      set({ conversations: [...convos] })
    } finally {
      cleanup()
      set({ isGenerating: false, streamingText: '' })
    }
  },

  regenerateLastResponse: async () => {
    const { activeConversationId, conversations } = get()
    const convo = conversations.find((c) => c.id === activeConversationId)
    if (!convo || convo.messages.length < 2) return
    const lastMsg = convo.messages[convo.messages.length - 1]
    if (lastMsg.role !== 'assistant') return
    convo.messages.pop()
    const lastUserMsg = convo.messages[convo.messages.length - 1]
    if (!lastUserMsg || lastUserMsg.role !== 'user') return
    saveConversations(conversations)
    set({ conversations: [...conversations] })
    await window.airoost.resetChat()
    await get().sendMessage(lastUserMsg.content)
  },

  resetCurrentChat: async () => {
    await window.airoost.resetChat()
    const { activeConversationId, conversations } = get()
    const convo = conversations.find((c) => c.id === activeConversationId)
    if (convo) {
      convo.messages = []
      convo.title = 'New Chat'
      saveConversations(conversations)
      set({ conversations: [...conversations] })
    }
  },

  // ─── Conversation Management ─────────────────────────────────

  renameConversation: (id, title) => {
    const convos = get().conversations
    const convo = convos.find((c) => c.id === id)
    if (convo) {
      convo.title = title
      saveConversations(convos)
      set({ conversations: [...convos] })
    }
  },

  duplicateConversation: (id) => {
    const convos = get().conversations
    const original = convos.find((c) => c.id === id)
    if (!original) return
    const dup: Conversation = {
      ...JSON.parse(JSON.stringify(original)),
      id: `conv_${Date.now()}`,
      title: `${original.title} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    const updated = [dup, ...convos]
    saveConversations(updated)
    set({ conversations: updated, activeConversationId: dup.id })
  },

  moveToFolder: (convoId, folderId) => {
    const convos = get().conversations
    const convo = convos.find((c) => c.id === convoId)
    if (convo) {
      convo.folderId = folderId
      saveConversations(convos)
      set({ conversations: [...convos] })
    }
  },

  addTag: (convoId, tag) => {
    const clean = tag.replace(/^#/, '').trim().toLowerCase()
    if (!clean) return
    const convos = get().conversations
    const convo = convos.find((c) => c.id === convoId)
    if (convo && !convo.tags.includes(clean)) {
      convo.tags.push(clean)
      saveConversations(convos)
      set({ conversations: [...convos] })
    }
  },

  removeTag: (convoId, tag) => {
    const convos = get().conversations
    const convo = convos.find((c) => c.id === convoId)
    if (convo) {
      convo.tags = convo.tags.filter((t) => t !== tag)
      saveConversations(convos)
      set({ conversations: [...convos] })
    }
  },

  exportConversation: (id, format) => {
    const convo = get().conversations.find((c) => c.id === id)
    if (!convo) return null

    if (format === 'markdown') {
      const lines = [`# ${convo.title}\n`]
      lines.push(`*Model: ${convo.modelId}*`)
      if (convo.personaName) lines.push(`*Persona: ${convo.personaEmoji ?? ''} ${convo.personaName}*`)
      lines.push(`*Date: ${new Date(convo.createdAt).toLocaleString()}*\n---\n`)
      for (const msg of convo.messages) {
        const label = msg.role === 'user' ? '**You**' : '**AI**'
        lines.push(`${label}: ${msg.content}\n`)
      }
      return lines.join('\n')
    }

    // Plain text
    const lines = [convo.title, '']
    for (const msg of convo.messages) {
      const label = msg.role === 'user' ? 'You' : 'AI'
      lines.push(`${label}: ${msg.content}`, '')
    }
    return lines.join('\n')
  },

  // ─── Folders ──────────────────────────────────────────────────

  createFolder: (name) => {
    const folder: Folder = { id: `folder_${Date.now()}`, name }
    const folders = [...get().folders, folder]
    saveFolders(folders)
    set({ folders })
  },

  renameFolder: (id, name) => {
    const folders = get().folders.map((f) => (f.id === id ? { ...f, name } : f))
    saveFolders(folders)
    set({ folders })
  },

  deleteFolder: (id) => {
    // Move conversations out of deleted folder
    const convos = get().conversations.map((c) =>
      c.folderId === id ? { ...c, folderId: null } : c
    )
    saveConversations(convos)
    const folders = get().folders.filter((f) => f.id !== id)
    saveFolders(folders)
    const activeFolderId = get().activeFolderId === id ? null : get().activeFolderId
    set({ folders, conversations: convos, activeFolderId })
  },

  setActiveFolderId: (id) => set({ activeFolderId: id, activeTagFilter: null }),

  // ─── Comparison Mode ──────────────────────────────────────────

  setCompareMode: (on) => {
    const { installedModels } = get()
    if (on && installedModels.length >= 1) {
      set({
        compareMode: true,
        compareModelA: { path: installedModels[0].path, name: installedModels[0].name },
        compareModelB: installedModels.length >= 2
          ? { path: installedModels[1].path, name: installedModels[1].name }
          : { path: installedModels[0].path, name: installedModels[0].name },
        compareStreamA: '',
        compareStreamB: '',
        compareGeneratingA: false,
        compareGeneratingB: false,
        compareTimeA: null,
        compareTimeB: null
      })
    } else {
      set({ compareMode: false })
    }
  },

  setCompareModelA: (path, name) => set({ compareModelA: { path, name } }),
  setCompareModelB: (path, name) => set({ compareModelB: { path, name } }),

  sendCompareMessage: async (message: string) => {
    const { compareModelA, compareModelB } = get()
    if (!compareModelA || !compareModelB) return

    set({
      compareGeneratingA: true,
      compareGeneratingB: false,
      compareStreamA: '',
      compareStreamB: '',
      compareTimeA: null,
      compareTimeB: null
    })

    // Model A
    const startA = Date.now()
    let responseA = ''
    {
      const cleanup = window.airoost.onChatToken(({ partial }) => {
        set({ compareStreamA: partial })
      })
      try {
        responseA = await window.airoost.chat(compareModelA.path, message)
      } catch {
        responseA = 'Error generating response.'
      } finally {
        cleanup()
      }
    }
    set({ compareGeneratingA: false, compareTimeA: Date.now() - startA, compareStreamA: responseA })

    // Reset before model B
    await window.airoost.resetChat()
    set({ compareGeneratingB: true })

    // Model B
    const startB = Date.now()
    let responseB = ''
    {
      const cleanup = window.airoost.onChatToken(({ partial }) => {
        set({ compareStreamB: partial })
      })
      try {
        responseB = await window.airoost.chat(compareModelB.path, message)
      } catch {
        responseB = 'Error generating response.'
      } finally {
        cleanup()
      }
    }
    set({ compareGeneratingB: false, compareTimeB: Date.now() - startB, compareStreamB: responseB })

    // Save comparison to conversation history
    const { activePersona, activeFolderId } = get()
    const convo: Conversation = {
      id: `conv_${Date.now()}`,
      title: `Compare: ${message.slice(0, 40)}${message.length > 40 ? '...' : ''}`,
      messages: [
        { role: 'user', content: message, timestamp: Date.now() },
        { role: 'assistant', content: `[${compareModelA.name}]: ${responseA}`, timestamp: Date.now() },
        { role: 'assistant', content: `[${compareModelB.name}]: ${responseB}`, timestamp: Date.now() }
      ],
      modelId: `${compareModelA.name} vs ${compareModelB.name}`,
      modelPath: compareModelA.path,
      personaId: activePersona?.id ?? null,
      personaName: activePersona?.name ?? null,
      personaEmoji: activePersona?.emoji ?? null,
      folderId: activeFolderId,
      tags: ['comparison'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    const convos = [convo, ...get().conversations]
    saveConversations(convos)
    set({ conversations: convos })
  },

  adoptCompareResponse: (side, response) => {
    const { compareModelA, compareModelB, installedModels } = get()
    const model = side === 'A' ? compareModelA : compareModelB
    if (!model) return

    // Switch to normal mode with the chosen model
    set({
      compareMode: false,
      selectedModelPath: model.path,
      selectedModelName: model.name
    })

    // Create a new conversation with the adopted response
    const convo: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'Continued from comparison',
      messages: [
        { role: 'assistant', content: response, timestamp: Date.now() }
      ],
      modelId: model.name,
      modelPath: model.path,
      personaId: null,
      personaName: null,
      personaEmoji: null,
      folderId: null,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    const convos = [convo, ...get().conversations]
    saveConversations(convos)
    set({ conversations: convos, activeConversationId: convo.id })
  },

  // ─── Filtering & Search ──────────────────────────────────────

  setActiveTagFilter: (tag) => set({ activeTagFilter: tag, activeFolderId: null }),

  setSidebarSearch: (query) => set({ sidebarSearch: query }),

  getFilteredConversations: () => {
    const { conversations, activeFolderId, activeTagFilter, sidebarSearch } = get()
    let result = conversations

    if (activeFolderId) {
      result = result.filter((c) => c.folderId === activeFolderId)
    }

    if (activeTagFilter) {
      result = result.filter((c) => c.tags.includes(activeTagFilter))
    }

    if (sidebarSearch.trim()) {
      const q = sidebarSearch.toLowerCase()
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.tags.some((t) => t.includes(q)) ||
          c.messages.some((m) => m.content.toLowerCase().includes(q))
      )
    }

    return result.sort((a, b) => b.updatedAt - a.updatedAt)
  },

  searchConversations: (query: string) => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const results: SearchResult[] = []

    for (const convo of get().conversations) {
      // Search in title
      if (convo.title.toLowerCase().includes(q)) {
        results.push({ conversation: convo, excerpt: convo.title, matchStart: convo.title.toLowerCase().indexOf(q), matchEnd: convo.title.toLowerCase().indexOf(q) + q.length })
        continue
      }
      // Search in messages
      for (const msg of convo.messages) {
        const idx = msg.content.toLowerCase().indexOf(q)
        if (idx !== -1) {
          const start = Math.max(0, idx - 40)
          const end = Math.min(msg.content.length, idx + q.length + 40)
          const excerpt = (start > 0 ? '...' : '') + msg.content.slice(start, end) + (end < msg.content.length ? '...' : '')
          results.push({ conversation: convo, excerpt, matchStart: idx - start + (start > 0 ? 3 : 0), matchEnd: idx - start + q.length + (start > 0 ? 3 : 0) })
          break
        }
      }
    }

    return results
  },

  getAllTags: () => {
    const tags = new Set<string>()
    for (const c of get().conversations) {
      for (const t of c.tags) tags.add(t)
    }
    return [...tags].sort()
  }
}))
