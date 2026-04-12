import { create } from 'zustand'
import * as ollama from '../services/ollamaService'
import type { OllamaModel, ChatMessage } from '../../shared/types'

interface OllamaState {
  isOllamaRunning: boolean
  models: OllamaModel[]
  pullingModel: string | null

  checkConnection: () => Promise<void>
  fetchModels: () => Promise<void>
  pullModel: (name: string) => Promise<void>
  sendMessage: (model: string, messages: ChatMessage[]) => Promise<string>
}

export const useOllamaStore = create<OllamaState>((set) => ({
  isOllamaRunning: false,
  models: [],
  pullingModel: null,

  checkConnection: async () => {
    const running = await ollama.checkOllamaRunning()
    set({ isOllamaRunning: running })
  },

  fetchModels: async () => {
    try {
      const models = await ollama.listModels()
      set({ models })
    } catch {
      set({ models: [] })
    }
  },

  pullModel: async (name: string) => {
    set({ pullingModel: name })
    try {
      await ollama.pullModel(name)
      // Refresh model list after pull
      const models = await ollama.listModels()
      set({ models, pullingModel: null })
    } catch {
      set({ pullingModel: null })
    }
  },

  sendMessage: async (model: string, messages: ChatMessage[]) => {
    return ollama.chat(model, messages)
  }
}))
