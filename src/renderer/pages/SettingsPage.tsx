import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useThemeStore, ACCENT_COLORS, type AccentColor, type ThemeMode, type FontSize, type LayoutDensity } from '../store/themeStore'

export default function SettingsPage() {
  const { installedModels, hardware, detectHardware, fetchInstalled, deleteModel, conversations } = useAppStore()
  const theme = useThemeStore()
  const [modelsDir, setModelsDir] = useState('')
  const [personas, setPersonas] = useState<PersonaData[]>([])
  const [clearConfirm, setClearConfirm] = useState(false)
  const [apiEnabled, setApiEnabled] = useState(false)
  const [apiPort, setApiPort] = useState('11434')

  useEffect(() => {
    fetchInstalled()
    detectHardware()
    window.airoost.getModelsDir().then(setModelsDir)
    window.airoost.getPersonas().then(setPersonas)
  }, [fetchInstalled, detectHardware])

  const totalModelSize = installedModels.reduce((sum, m) => sum + m.size, 0)
  const convoStorageKB = Math.round(JSON.stringify(conversations).length / 1024)

  const handleClearHistory = () => {
    localStorage.removeItem('airoost_conversations')
    window.location.reload()
  }

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(`http://localhost:${apiPort}/v1/chat/completions`)
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-xs text-gray-500 mb-8">Your AI. Your machine. Your rules.</p>

        {/* ── General ── */}
        <Section title="General">
          <SettingRow label="Default model">
            <select
              className="bg-surface-dark border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none max-w-[200px]"
              defaultValue=""
            >
              <option value="">Auto (first installed)</option>
              {installedModels.map((m) => (
                <option key={m.path} value={m.path}>{m.name}</option>
              ))}
            </select>
          </SettingRow>

          <SettingRow label="Default persona">
            <select
              className="bg-surface-dark border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none max-w-[200px]"
              defaultValue=""
            >
              <option value="">No Persona</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
              ))}
            </select>
          </SettingRow>

          <SettingRow label="UI Language">
            <select className="bg-surface-dark border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none">
              <option value="en">English</option>
              <option value="es">Espa{'\u00F1'}ol</option>
              <option value="fr">Fran{'\u00E7'}ais</option>
              <option value="de">Deutsch</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
            </select>
          </SettingRow>

          <SettingRow label="Launch at login">
            <Toggle checked={false} onChange={() => {}} />
          </SettingRow>

          <SettingRow label="Check for updates">
            <Toggle checked={true} onChange={() => {}} />
          </SettingRow>
        </Section>

        {/* ── Appearance ── */}
        <Section title="Appearance">
          <SettingRow label="Theme">
            <div className="flex gap-1">
              {(['dark', 'light', 'system'] as ThemeMode[]).map((m) => (
                <button key={m} onClick={() => theme.setMode(m)}
                  className={`px-3 py-1 rounded-lg text-xs capitalize transition-colors ${
                    theme.mode === m ? 'bg-accent text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}>{m}</button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Accent colour">
            <div className="flex gap-1.5">
              {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((c) => (
                <button key={c} onClick={() => theme.setAccent(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    theme.accent === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: ACCENT_COLORS[c] }} title={c} />
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Font size">
            <div className="flex gap-1">
              {(['small', 'medium', 'large'] as FontSize[]).map((s) => (
                <button key={s} onClick={() => theme.setFontSize(s)}
                  className={`px-3 py-1 rounded-lg text-xs capitalize transition-colors ${
                    theme.fontSize === s ? 'bg-accent text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}>{s}</button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Layout density">
            <div className="flex gap-1">
              {(['compact', 'comfortable'] as LayoutDensity[]).map((d) => (
                <button key={d} onClick={() => theme.setDensity(d)}
                  className={`px-3 py-1 rounded-lg text-xs capitalize transition-colors ${
                    theme.density === d ? 'bg-accent text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}>{d}</button>
              ))}
            </div>
          </SettingRow>
        </Section>

        {/* ── Storage ── */}
        <Section title="Storage">
          <SettingRow label="Models folder">
            <span className="text-xs text-gray-300 font-mono truncate max-w-[250px] block">{modelsDir}</span>
          </SettingRow>

          <SettingRow label="Total model storage">
            <span className="text-xs text-white">{(totalModelSize / 1e9).toFixed(1)} GB</span>
          </SettingRow>

          {/* Per-model breakdown */}
          {installedModels.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              {installedModels.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-300">{m.name}</span>
                    <span className="text-[10px] text-gray-600 ml-2">{(m.size / 1e9).toFixed(1)} GB</span>
                  </div>
                  <button
                    onClick={() => deleteModel(m.id)}
                    className="text-[10px] text-gray-600 hover:text-red-400 px-2 py-0.5 rounded bg-white/5 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          <SettingRow label="Conversation history">
            <span className="text-xs text-white">{convoStorageKB} KB ({conversations.length} conversations)</span>
          </SettingRow>

          <div className="pt-2 border-t border-white/5">
            {!clearConfirm ? (
              <button
                onClick={() => setClearConfirm(true)}
                className="text-xs text-gray-500 hover:text-red-400 px-3 py-1.5 bg-white/5 rounded-lg transition-colors"
              >
                Clear conversation history
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Delete all conversations?</span>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg transition-colors"
                >
                  Yes, clear all
                </button>
                <button
                  onClick={() => setClearConfirm(false)}
                  className="text-xs text-gray-400 px-3 py-1 bg-white/5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* ── Privacy ── */}
        <Section title="Privacy">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-white mb-3">What stays on your machine</h3>
            <div className="space-y-2">
              {[
                'All conversations',
                'All documents you upload',
                'All voice recordings',
                'Your prompts and personas',
                'Model inference — every token'
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="text-green-500 text-sm">{'\u2705'}</span>
                  <span className="text-xs text-gray-300">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-white/5">
            <SettingRow label="Anonymous crash reports">
              <Toggle checked={false} onChange={() => {}} />
            </SettingRow>
            <p className="text-[10px] text-gray-600 mt-1">
              Help improve Airoost by sending anonymous crash reports. No conversation data is ever included. Off by default.
            </p>
          </div>
        </Section>

        {/* ── Local API ── */}
        <Section title="Local API Server">
          <SettingRow label="Enable API server">
            <Toggle checked={apiEnabled} onChange={() => setApiEnabled(!apiEnabled)} />
          </SettingRow>

          {apiEnabled && (
            <>
              <SettingRow label="Port">
                <input
                  type="text"
                  value={apiPort}
                  onChange={(e) => setApiPort(e.target.value.replace(/\D/g, ''))}
                  className="w-20 bg-surface-dark border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none text-center"
                />
              </SettingRow>

              <div className="p-3 rounded-lg bg-surface-dark border border-white/5">
                <p className="text-[10px] text-gray-600 mb-1">API Endpoint</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-accent font-mono">http://localhost:{apiPort}/v1/chat/completions</code>
                  <button
                    onClick={handleCopyEndpoint}
                    className="text-[10px] text-gray-500 hover:text-white px-2 py-0.5 bg-white/5 rounded transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-gray-600">
                OpenAI-compatible endpoint. Works with Obsidian, VS Code, Continue, or any tool that supports custom endpoints.
              </p>
            </>
          )}

          {!apiEnabled && (
            <p className="text-[10px] text-gray-600">
              Enable to expose an OpenAI-compatible API on localhost. No API key required by default.
            </p>
          )}
        </Section>

        {/* ── Hardware ── */}
        <Section title="Hardware">
          {hardware ? (
            <>
              <Row label="CPU" value={hardware.cpuModel} />
              <Row label="Cores" value={`${hardware.cpuCores}`} />
              <Row label="RAM" value={`${hardware.totalRamGB} GB total \u00B7 ${hardware.availableRamGB} GB free`} />
              <Row label="GPU" value={hardware.gpuName} />
              {hardware.gpuVramGB > 0 && <Row label="VRAM" value={`${hardware.gpuVramGB} GB`} />}
              {hardware.diskFreeGB > 0 && <Row label="Disk free" value={`${hardware.diskFreeGB} GB`} />}
              <Row label="Platform" value={`${hardware.platform} / ${hardware.arch}`} />
              <div className="mt-3">
                <button onClick={detectHardware} className="text-xs text-gray-500 hover:text-white px-3 py-1.5 bg-white/5 rounded-lg transition-colors">
                  Re-scan
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Scanning...</p>
          )}
        </Section>

        {/* ── About ── */}
        <Section title="About">
          <Row label="Airoost" value="v1.0.0" />
          <Row label="Engine" value="llama.cpp via node-llama-cpp" />
          <Row label="Runtime" value="Electron 37 + React 18" />
          <Row label="Embeddings" value="all-MiniLM-L6-v2" />

          <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
            <a
              href="https://github.com/joym-gits/airoost"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-accent px-3 py-1.5 bg-white/5 rounded-lg transition-colors"
            >
              GitHub
            </a>
            <button className="text-xs text-gray-500 hover:text-white px-3 py-1.5 bg-white/5 rounded-lg transition-colors">
              Check for updates
            </button>
            <button className="text-xs text-gray-500 hover:text-white px-3 py-1.5 bg-white/5 rounded-lg transition-colors">
              Open source licences
            </button>
          </div>

          <div className="mt-3 text-center">
            <p className="text-[11px] text-gray-600">Your AI. Your machine. Your rules.</p>
            <p className="text-[10px] text-gray-700 mt-1">Made with privacy in mind.</p>
          </div>
        </Section>
      </div>
    </div>
  )
}

// ─── Components ──────────────────────────────────────────────────

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-400">{label}</span>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-10 h-5 rounded-full transition-colors relative ${checked ? 'bg-accent' : 'bg-white/10'}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${checked ? 'left-5' : 'left-0.5'}`} />
    </button>
  )
}
