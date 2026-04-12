import { create } from 'zustand'
import * as ollama from '../services/ollamaService'
import type { OllamaModel, ChatMessage } from '../../shared/types'

interface OllamaState {
  isOllamaRunning: boolean
  models: OllamaModel[]
  pullingModel: string | null
  pullStatus: string
  pullProgress: number

  checkConnection: () => Promise<void>
  fetchModels: () => Promise<void>
  pullModel: (name: string) => Promise<void>
  sendMessage: (model: string, messages: ChatMessage[]) => Promise<string>
}

export const useOllamaStore = create<OllamaState>((set) => ({
  isOllamaRunning: false,
  models: [],
  pullingModel: null,
  pullStatus: '',
  pullProgress: 0,

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
    set({ pullingModel: name, pullStatus: 'Starting download...', pullProgress: 0 })
    try {
      await ollama.pullModel(name, (status, progress) => {
        set({ pullStatus: status, pullProgress: progress })
      })
      const models = await ollama.listModels()
      set({ models, pullingModel: null, pullStatus: '', pullProgress: 0 })
    } catch {
      set({ pullingModel: null, pullStatus: 'Download failed', pullProgress: 0 })
    }
  },

  sendMessage: async (model: string, messages: ChatMessage[]) => {
    return ollama.chat(model, messages)
  }
}))
