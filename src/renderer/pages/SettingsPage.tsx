import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useVoiceStore } from '../store/voiceStore'
import * as voiceSvc from '../services/voiceService'

export default function SettingsPage() {
  const { installedModels, hardware, detectHardware, fetchInstalled } = useAppStore()
  const { settings, updateSettings, whisperLoaded } = useVoiceStore()
  const [modelsDir, setModelsDir] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([])

  useEffect(() => {
    fetchInstalled()
    detectHardware()
    window.airoost.getModelsDir().then(setModelsDir)

    // Load voice devices/voices
    const loadVoice = () => {
      setVoices(voiceSvc.getVoices())
      voiceSvc.getAudioInputDevices().then(setAudioInputs)
      voiceSvc.getAudioOutputDevices().then(setAudioOutputs)
    }
    loadVoice()
    window.speechSynthesis.onvoiceschanged = loadVoice
  }, [fetchInstalled, detectHardware])

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-xs text-gray-500 mb-8">Deliberately simple. Only what's necessary.</p>

        {/* Theme */}
        <Section title="Appearance">
          <Row label="Theme" value="Dark" hint="Light and System themes coming soon" />
        </Section>

        {/* Storage */}
        <Section title="Storage">
          <Row label="Model location" value={modelsDir || 'Loading...'} mono />
          <Row
            label="Installed models"
            value={`${installedModels.length} model${installedModels.length !== 1 ? 's' : ''}`}
          />
          <Row
            label="Disk used"
            value={`${(installedModels.reduce((sum, m) => sum + m.size, 0) / 1e9).toFixed(1)} GB`}
          />
        </Section>

        {/* Local API */}
        <Section title="Local API Server">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">OpenAI-compatible endpoint</p>
              <p className="text-xs text-gray-500 mt-0.5">
                http://localhost:11434/v1/chat/completions
              </p>
              <p className="text-[11px] text-gray-600 mt-1">
                Works with Obsidian, VS Code, or any OpenAI-compatible tool
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs">
              Coming Soon
            </div>
          </div>
        </Section>

        {/* Hardware */}
        <Section title="Your Hardware">
          {hardware ? (
            <>
              <Row label="CPU" value={hardware.cpuModel} />
              <Row label="Cores" value={`${hardware.cpuCores}`} />
              <Row label="RAM" value={`${hardware.totalRamGB} GB total \u00B7 ${hardware.availableRamGB} GB free`} />
              <Row label="GPU" value={hardware.gpuName} />
              {hardware.gpuVramGB > 0 && (
                <Row label="VRAM" value={`${hardware.gpuVramGB} GB`} />
              )}
              {hardware.diskFreeGB > 0 && (
                <Row label="Disk free" value={`${hardware.diskFreeGB} GB`} />
              )}
              <Row label="Platform" value={`${hardware.platform} / ${hardware.arch}`} />
              <div className="mt-3">
                <button
                  onClick={detectHardware}
                  className="text-xs text-gray-500 hover:text-white px-3 py-1.5 bg-white/5 rounded-lg transition-colors"
                >
                  Re-scan
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Scanning...</p>
          )}
        </Section>

        {/* About */}
        {/* Voice */}
        <Section title="Voice">
          <Row label="Whisper Model" value={whisperLoaded ? 'Loaded (whisper-tiny)' : 'Not loaded — opens on Voice page'} />

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Input device</span>
            <select
              value={settings.inputDeviceId}
              onChange={(e) => updateSettings({ inputDeviceId: e.target.value })}
              className="bg-surface-dark border border-white/10 text-white text-xs rounded px-2 py-1 outline-none max-w-[200px]"
            >
              <option value="">Default</option>
              {audioInputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId.slice(0, 20)}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Output device</span>
            <select
              value={settings.outputDeviceId}
              onChange={(e) => updateSettings({ outputDeviceId: e.target.value })}
              className="bg-surface-dark border border-white/10 text-white text-xs rounded px-2 py-1 outline-none max-w-[200px]"
            >
              <option value="">Default</option>
              {audioOutputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId.slice(0, 20)}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">TTS voice</span>
            <select
              value={settings.ttsVoiceURI}
              onChange={(e) => updateSettings({ ttsVoiceURI: e.target.value })}
              className="bg-surface-dark border border-white/10 text-white text-xs rounded px-2 py-1 outline-none max-w-[200px]"
            >
              <option value="">System default</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">TTS speed</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.ttsRate}
                onChange={(e) => updateSettings({ ttsRate: parseFloat(e.target.value) })}
                className="w-24 accent-accent"
              />
              <span className="text-xs text-white w-8">{settings.ttsRate}x</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Auto-send after speech</span>
            <button
              onClick={() => updateSettings({ autoSend: !settings.autoSend })}
              className={`w-10 h-5 rounded-full transition-colors ${settings.autoSend ? 'bg-accent' : 'bg-white/10'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.autoSend ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Transcription language</span>
            <select
              value={settings.language}
              onChange={(e) => updateSettings({ language: e.target.value })}
              className="bg-surface-dark border border-white/10 text-white text-xs rounded px-2 py-1 outline-none"
            >
              <option value="auto">Auto-detect</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="hi">Hindi</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
        </Section>

        <Section title="About">
          <Row label="Version" value="0.1.0" />
          <Row label="Engine" value="llama.cpp (built-in)" />
          <Row label="Runtime" value="Electron + React" />
          <div className="mt-3 text-[11px] text-gray-600">
            Your AI. Your machine. Your rules.
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h2>
      <div className="p-4 rounded-xl bg-surface border border-white/5 space-y-3">
        {children}
      </div>
    </section>
  )
}

function Row({ label, value, hint, mono }: { label: string; value: string; hint?: string; mono?: boolean }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className={`text-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
      </div>
      {hint && <p className="text-[11px] text-gray-600 mt-0.5 text-right">{hint}</p>}
    </div>
  )
}
