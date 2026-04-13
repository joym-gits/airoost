import { create } from 'zustand'

// ─── Conversation Types ──────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  modelId: string
  modelPath: string
  createdAt: number
  updatedAt: number
}

// ─── Store ───────────────────────────────────────────────────────

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
  isGenerating: boolean
  streamingText: string

  // Actions - Models
  fetchCatalog: () => Promise<void>
  fetchInstalled: () => Promise<void>
  downloadModel: (modelId: string) => Promise<void>
  deleteModel: (modelId: string) => Promise<void>
  detectHardware: () => Promise<void>
  setSelectedModel: (path: string, name: string) => void

  // Actions - Chat
  createConversation: () => void
  setActiveConversation: (id: string) => void
  deleteConversation: (id: string) => void
  sendMessage: (message: string) => Promise<void>
  regenerateLastResponse: () => Promise<void>
  resetCurrentChat: () => Promise<void>
  searchConversations: (query: string) => Conversation[]
}

const CONVERSATIONS_KEY = 'airoost_conversations'

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveConversations(convos: Conversation[]): void {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convos))
}

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
  isGenerating: false,
  streamingText: '',

  // ─── Model Actions ───────────────────────────────────────────

  fetchCatalog: async () => {
    const catalog = await window.airoost.getCatalog()
    set({ catalog })
  },

  fetchInstalled: async () => {
    const installedModels = await window.airoost.getInstalled()
    set({ installedModels })
    // Auto-select first model if none selected
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

  // ─── Chat Actions ────────────────────────────────────────────

  createConversation: () => {
    const { selectedModelPath, selectedModelName, installedModels } = get()
    const modelPath = selectedModelPath ?? installedModels[0]?.path ?? ''
    const modelName = selectedModelName ?? installedModels[0]?.name ?? 'Unknown'

    const convo: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'New Chat',
      messages: [],
      modelId: modelName,
      modelPath,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    const conversations = [convo, ...get().conversations]
    saveConversations(conversations)
    set({ conversations, activeConversationId: convo.id })

    // Reset llm session for new conversation
    window.airoost.resetChat()
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id })
    window.airoost.resetChat()
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

    // Create conversation if none active
    let convoId = activeConversationId
    let convos = [...conversations]

    if (!convoId) {
      get().createConversation()
      convoId = get().activeConversationId
      convos = get().conversations
    }

    const convo = convos.find((c) => c.id === convoId)
    if (!convo) return

    // Add user message
    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: Date.now() }
    convo.messages.push(userMsg)

    // Update title from first message
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
      const response = await window.airoost.chat(modelPath, message)
      const assistantMsg: ChatMessage = { role: 'assistant', content: response, timestamp: Date.now() }
      convo.messages.push(assistantMsg)
      convo.updatedAt = Date.now()
      saveConversations(convos)
      set({ conversations: [...convos] })
    } catch {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error generating a response. Please try again.',
        timestamp: Date.now()
      }
      convo.messages.push(errMsg)
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

    // Remove last assistant message
    const lastMsg = convo.messages[convo.messages.length - 1]
    if (lastMsg.role !== 'assistant') return
    convo.messages.pop()

    // Get last user message
    const lastUserMsg = convo.messages[convo.messages.length - 1]
    if (!lastUserMsg || lastUserMsg.role !== 'user') return

    saveConversations(conversations)
    set({ conversations: [...conversations] })

    // Re-send
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

  searchConversations: (query: string) => {
    const q = query.toLowerCase()
    return get().conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    )
  }
}))
