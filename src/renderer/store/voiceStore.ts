import { create } from 'zustand'

const VOICE_SETTINGS_KEY = 'airoost_voice_settings'

export interface VoiceSettings {
  inputDeviceId: string
  outputDeviceId: string
  ttsVoiceURI: string
  ttsRate: number
  autoSend: boolean
  language: string
}

const defaultSettings: VoiceSettings = {
  inputDeviceId: '',
  outputDeviceId: '',
  ttsVoiceURI: '',
  ttsRate: 1.0,
  autoSend: false,
  language: 'auto'
}

function loadSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(VOICE_SETTINGS_KEY)
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings
  } catch {
    return defaultSettings
  }
}

function saveSettings(settings: VoiceSettings): void {
  localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings))
}

interface VoiceState {
  // Model
  whisperLoaded: boolean
  whisperLoading: boolean
  whisperProgress: number
  whisperError: string | null

  // Recording
  isRecording: boolean
  isTranscribing: boolean
  transcript: string
  voiceActive: boolean

  // Settings
  settings: VoiceSettings

  // Actions
  setWhisperLoaded: (loaded: boolean) => void
  setWhisperLoading: (loading: boolean, progress?: number) => void
  setWhisperError: (error: string | null) => void
  setRecording: (recording: boolean) => void
  setTranscribing: (transcribing: boolean) => void
  setTranscript: (text: string) => void
  setVoiceActive: (active: boolean) => void
  updateSettings: (partial: Partial<VoiceSettings>) => void
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  whisperLoaded: false,
  whisperLoading: false,
  whisperProgress: 0,
  whisperError: null,

  isRecording: false,
  isTranscribing: false,
  transcript: '',
  voiceActive: false,

  settings: loadSettings(),

  setWhisperLoaded: (loaded) => set({ whisperLoaded: loaded }),
  setWhisperLoading: (loading, progress) => set({ whisperLoading: loading, whisperProgress: progress ?? 0 }),
  setWhisperError: (error) => set({ whisperError: error }),
  setRecording: (recording) => set({ isRecording: recording, voiceActive: recording }),
  setTranscribing: (transcribing) => set({ isTranscribing: transcribing }),
  setTranscript: (text) => set({ transcript: text }),
  setVoiceActive: (active) => set({ voiceActive: active }),
  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial }
    saveSettings(settings)
    set({ settings })
  }
}))
