import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useThemeStore, ACCENT_COLORS, type AccentColor, type ThemeMode, type FontSize, type LayoutDensity } from '../store/themeStore'

export default function SettingsPage() {
  const { installedModels, hardware, detectHardware, fetchInstalled } = useAppStore()
  const theme = useThemeStore()
  const [modelsDir, setModelsDir] = useState('')
  useEffect(() => {
    fetchInstalled()
    detectHardware()
    window.airoost.getModelsDir().then(setModelsDir)
  }, [fetchInstalled, detectHardware])

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-xs text-gray-500 mb-8">Deliberately simple. Only what's necessary.</p>

        {/* Appearance */}
        <Section title="Appearance">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Theme</span>
            <div className="flex gap-1">
              {(['dark', 'light', 'system'] as ThemeMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => theme.setMode(m)}
                  className={`px-3 py-1 rounded-lg text-xs capitalize transition-colors ${
                    theme.mode === m ? 'bg-accent text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Accent colour</span>
            <div className="flex gap-1.5">
              {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((c) => (
                <button
                  key={c}
                  onClick={() => theme.setAccent(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    theme.accent === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: ACCENT_COLORS[c] }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Font size</span>
            <div className="flex gap-1">
              {(['small', 'medium', 'large'] as FontSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => theme.setFontSize(s)}
                  className={`px-3 py-1 rounded-lg text-xs capitalize transition-colors ${
                    theme.fontSize === s ? 'bg-accent text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Layout density</span>
            <div className="flex gap-1">
              {(['compact', 'comfortable'] as LayoutDensity[]).map((d) => (
                <button
                  key={d}
                  onClick={() => theme.setDensity(d)}
                  className={`px-3 py-1 rounded-lg text-xs capitalize transition-colors ${
                    theme.density === d ? 'bg-accent text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
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
          <p className="text-sm text-gray-500">Voice mode coming soon. Will include Whisper transcription and system TTS.</p>
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
