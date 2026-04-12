import { create } from 'zustand'
import * as ollama from '../services/ollamaService'

export type OnboardingStep = 'welcome' | 'check-ollama' | 'download-model' | 'ready'

interface OnboardingState {
  isFirstLaunch: boolean
  currentStep: OnboardingStep
  ollamaInstalled: boolean
  modelDownloading: boolean
  modelDownloaded: boolean
  downloadStatus: string
  downloadProgress: number
  selectedModel: string

  setStep: (step: OnboardingStep) => void
  checkOllama: () => Promise<void>
  downloadDefaultModel: () => Promise<void>
  completeOnboarding: () => void
}

const ONBOARDING_KEY = 'airoost_onboarding_complete'
const DEFAULT_MODEL = 'llama3.2'

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  isFirstLaunch: localStorage.getItem(ONBOARDING_KEY) !== 'true',
  currentStep: 'welcome',
  ollamaInstalled: false,
  modelDownloading: false,
  modelDownloaded: false,
  downloadStatus: '',
  downloadProgress: 0,
  selectedModel: DEFAULT_MODEL,

  setStep: (step) => set({ currentStep: step }),

  checkOllama: async () => {
    const running = await ollama.checkOllamaRunning()
    set({ ollamaInstalled: running })

    if (running) {
      // Check if any models already exist
      const models = await ollama.listModels()
      if (models.length > 0) {
        set({ modelDownloaded: true, currentStep: 'ready' })
      } else {
        set({ currentStep: 'download-model' })
      }
    }
  },

  downloadDefaultModel: async () => {
    const { selectedModel } = get()
    set({ modelDownloading: true, downloadStatus: 'Starting download...', downloadProgress: 0 })
    try {
      await ollama.pullModel(selectedModel, (status, percent) => {
        set({ downloadStatus: status, downloadProgress: percent })
      })
      set({
        modelDownloading: false,
        modelDownloaded: true,
        downloadStatus: 'Download complete!',
        downloadProgress: 100,
        currentStep: 'ready'
      })
    } catch {
      set({
        modelDownloading: false,
        downloadStatus: 'Download failed. Please try again.'
      })
    }
  },

  completeOnboarding: () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    set({ isFirstLaunch: false })
  }
}))
