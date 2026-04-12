import { create } from 'zustand'

export type OnboardingStep = 'welcome' | 'download-model' | 'ready'

interface OnboardingState {
  isFirstLaunch: boolean
  currentStep: OnboardingStep
  modelDownloading: boolean
  modelDownloaded: boolean
  downloadStatus: string
  downloadProgress: number

  setStep: (step: OnboardingStep) => void
  downloadDefaultModel: () => Promise<void>
  completeOnboarding: () => void
}

const ONBOARDING_KEY = 'airoost_onboarding_complete'
const DEFAULT_MODEL_ID = 'smollm2-360m'

export const useOnboardingStore = create<OnboardingState>((set) => ({
  isFirstLaunch: localStorage.getItem(ONBOARDING_KEY) !== 'true',
  currentStep: 'welcome',
  modelDownloading: false,
  modelDownloaded: false,
  downloadStatus: '',
  downloadProgress: 0,

  setStep: (step) => set({ currentStep: step }),

  downloadDefaultModel: async () => {
    set({ modelDownloading: true, downloadStatus: 'Starting download...', downloadProgress: 0 })

    const cleanup = window.airoost.onDownloadProgress(({ percent, status }) => {
      set({ downloadStatus: status, downloadProgress: percent })
    })

    try {
      await window.airoost.downloadModel(DEFAULT_MODEL_ID)
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
    } finally {
      cleanup()
    }
  },

  completeOnboarding: () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    set({ isFirstLaunch: false })
  }
}))
