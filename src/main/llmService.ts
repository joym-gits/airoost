import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, createWriteStream } from 'fs'
import { execSync } from 'child_process'
import os from 'os'
import https from 'https'
import http from 'http'

// Dynamic import hidden from Vite's static analysis
let _llamaCppModule: any = null
async function loadNodeLlamaCpp() {
  if (!_llamaCppModule) {
    const mod = ['node', 'llama', 'cpp'].join('-')
    _llamaCppModule = await (Function('m', 'return import(m)')(mod))
  }
  return _llamaCppModule
}

let _modelsDir: string | null = null
function getModelsDirPath(): string {
  if (!_modelsDir) {
    _modelsDir = join(app.getPath('userData'), 'models')
  }
  return _modelsDir
}

// ─── Model Catalog ───────────────────────────────────────────────

export interface CatalogEntry {
  id: string
  name: string
  description: string
  size: string
  sizeBytes: number
  ramRequired: number // minimum RAM in GB
  url: string
  filename: string
  category: string[]
  featured: boolean
  author: string
  badge: 'verified' | 'community'
  bundled?: boolean
}

export const MODEL_CATALOG: CatalogEntry[] = [
  // ── Bundled Default ──
  {
    id: 'phi-3-mini',
    name: 'Phi-3 Mini',
    description: 'Microsoft\'s compact powerhouse. Ships with Airoost — ready instantly.',
    size: '2.2 GB',
    sizeBytes: 2_300_000_000,
    ramRequired: 4,
    url: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf',
    filename: 'Phi-3-mini-4k-instruct-q4.gguf',
    category: ['general', 'lightweight'],
    featured: true,
    author: 'Microsoft',
    badge: 'verified',
    bundled: true
  },
  // ── Featured Models ──
  {
    id: 'llama-3.2-3b',
    name: 'Llama 3.2 3B',
    description: 'Meta\'s latest small model. Great all-rounder for everyday use.',
    size: '2.0 GB',
    sizeBytes: 2_000_000_000,
    ramRequired: 4,
    url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    category: ['general', 'featured'],
    featured: true,
    author: 'Meta',
    badge: 'verified'
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    description: 'Excellent reasoning and instruction following. The community favorite.',
    size: '4.1 GB',
    sizeBytes: 4_100_000_000,
    ramRequired: 8,
    url: 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    filename: 'mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    category: ['general', 'featured'],
    featured: true,
    author: 'Mistral AI',
    badge: 'verified'
  },
  {
    id: 'gemma-2-2b',
    name: 'Gemma 2 2B',
    description: 'Google\'s efficient model. Fast and surprisingly capable for its size.',
    size: '1.6 GB',
    sizeBytes: 1_600_000_000,
    ramRequired: 4,
    url: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    filename: 'gemma-2-2b-it-Q4_K_M.gguf',
    category: ['general', 'lightweight', 'featured'],
    featured: true,
    author: 'Google',
    badge: 'verified'
  },
  {
    id: 'codellama-7b',
    name: 'Code Llama 7B',
    description: 'Purpose-built for code generation, debugging, and explanation.',
    size: '3.8 GB',
    sizeBytes: 3_800_000_000,
    ramRequired: 8,
    url: 'https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.Q4_K_M.gguf',
    filename: 'codellama-7b-instruct.Q4_K_M.gguf',
    category: ['coding', 'featured'],
    featured: true,
    author: 'Meta',
    badge: 'verified'
  },
  {
    id: 'llama-3.2-1b',
    name: 'Llama 3.2 1B',
    description: 'Ultra-light. Runs on anything. Perfect for low-end hardware.',
    size: '750 MB',
    sizeBytes: 750_000_000,
    ramRequired: 2,
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    category: ['general', 'lightweight'],
    featured: true,
    author: 'Meta',
    badge: 'verified'
  },
  {
    id: 'smollm2-360m',
    name: 'SmolLM2 360M',
    description: 'Tiny model for basic tasks. Fits on any machine.',
    size: '229 MB',
    sizeBytes: 240_000_000,
    ramRequired: 2,
    url: 'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q8_0.gguf',
    filename: 'smollm2-360m-instruct-q8_0.gguf',
    category: ['lightweight'],
    featured: false,
    author: 'Hugging Face',
    badge: 'verified'
  }
]

// ─── Hardware Detection ──────────────────────────────────────────

export interface HardwareInfo {
  totalRamGB: number
  availableRamGB: number
  cpuModel: string
  cpuCores: number
  gpuName: string
  gpuVramGB: number
  diskFreeGB: number
  platform: string
  arch: string
}

export function detectHardware(): HardwareInfo {
  const totalRamGB = Math.round(os.totalmem() / 1e9 * 10) / 10
  const availableRamGB = Math.round(os.freemem() / 1e9 * 10) / 10
  const cpuModel = os.cpus()[0]?.model ?? 'Unknown'
  const cpuCores = os.cpus().length

  let gpuName = 'Unknown'
  let gpuVramGB = 0

  try {
    if (process.platform === 'darwin') {
      const spOutput = execSync('system_profiler SPDisplaysDataType 2>/dev/null', { encoding: 'utf-8', timeout: 5000 })
      const gpuMatch = spOutput.match(/Chipset Model:\s*(.+)/i) || spOutput.match(/Chip:\s*(.+)/i)
      if (gpuMatch) gpuName = gpuMatch[1].trim()
      const vramMatch = spOutput.match(/VRAM.*?:\s*(\d+)\s*(MB|GB)/i)
      if (vramMatch) {
        gpuVramGB = vramMatch[2] === 'GB' ? parseInt(vramMatch[1]) : parseInt(vramMatch[1]) / 1024
      }
      // Apple Silicon shares unified memory
      if (cpuModel.includes('Apple') || gpuName.includes('Apple')) {
        gpuVramGB = totalRamGB
      }
    } else if (process.platform === 'win32') {
      const wmicOutput = execSync('wmic path win32_VideoController get name,adapterram /format:csv 2>nul', { encoding: 'utf-8', timeout: 5000 })
      const lines = wmicOutput.split('\n').filter(l => l.trim() && !l.includes('Node'))
      if (lines.length > 0) {
        const parts = lines[0].split(',')
        if (parts.length >= 3) {
          gpuName = parts[2]?.trim() ?? 'Unknown'
          gpuVramGB = parseInt(parts[1] ?? '0') / 1e9
        }
      }
    }
  } catch {
    // Hardware detection is best-effort
  }

  let diskFreeGB = 0
  try {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      const dfOutput = execSync("df -g / 2>/dev/null | tail -1 | awk '{print $4}'", { encoding: 'utf-8', timeout: 3000 })
      diskFreeGB = parseInt(dfOutput.trim()) || 0
    }
  } catch {
    // best-effort
  }

  return {
    totalRamGB,
    availableRamGB,
    cpuModel,
    cpuCores,
    gpuName,
    gpuVramGB,
    diskFreeGB,
    platform: process.platform,
    arch: process.arch
  }
}

export type ModelCompatibility = 'smooth' | 'slow' | 'too-large'

export function checkModelCompatibility(model: CatalogEntry, hw: HardwareInfo): { status: ModelCompatibility; message: string } {
  if (model.ramRequired > hw.totalRamGB) {
    return { status: 'too-large', message: 'This model is too large for your current setup' }
  }
  if (model.ramRequired > hw.totalRamGB * 0.6) {
    return { status: 'slow', message: 'This model may run slowly \u2014 your machine has limited memory' }
  }
  return { status: 'smooth', message: 'This model runs smoothly on your machine' }
}

// ─── LLM Engine ──────────────────────────────────────────────────

let llamaInstance: any = null
let loadedModel: any = null
let activeContext: any = null
let activeSession: any = null
let loadedModelPath: string | null = null

function ensureModelsDir(): void {
  if (!existsSync(getModelsDirPath())) {
    mkdirSync(getModelsDirPath(), { recursive: true })
  }
}

export async function initLlama(): Promise<void> {
  ensureModelsDir()
  const { getLlama } = await loadNodeLlamaCpp()
  llamaInstance = await getLlama()
}

export function getInstalledModels(): { id: string; name: string; size: number; path: string }[] {
  ensureModelsDir()
  const files = readdirSync(getModelsDirPath()).filter((f) => f.endsWith('.gguf'))
  return files.map((filename) => {
    const filePath = join(getModelsDirPath(), filename)
    const stats = statSync(filePath)
    const catalogEntry = MODEL_CATALOG.find((m) => m.filename === filename)
    return {
      id: catalogEntry?.id ?? filename,
      name: catalogEntry?.name ?? filename.replace('.gguf', ''),
      size: stats.size,
      path: filePath
    }
  })
}

export function getCatalog(hw?: HardwareInfo) {
  const installed = getInstalledModels()
  const installedFiles = new Set(installed.map((m) => m.path))
  const hardware = hw ?? detectHardware()
  return MODEL_CATALOG.map((m) => ({
    ...m,
    installed: installedFiles.has(join(getModelsDirPath(), m.filename)),
    compatibility: checkModelCompatibility(m, hardware)
  }))
}

export async function downloadModel(
  modelId: string,
  onProgress: (percent: number, status: string) => void
): Promise<string> {
  const entry = MODEL_CATALOG.find((m) => m.id === modelId)
  if (!entry) throw new Error(`Model ${modelId} not found in catalog`)

  ensureModelsDir()
  const destPath = join(getModelsDirPath(), entry.filename)

  if (existsSync(destPath)) {
    onProgress(100, 'Already downloaded')
    return destPath
  }

  return new Promise((resolve, reject) => {
    const follow = (url: string) => {
      const client = url.startsWith('https') ? https : http
      client
        .get(url, { headers: { 'User-Agent': 'Airoost/0.1' } }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            follow(res.headers.location)
            return
          }
          if (res.statusCode !== 200) {
            reject(new Error(`Download failed: HTTP ${res.statusCode}`))
            return
          }

          const totalBytes = parseInt(res.headers['content-length'] ?? '0', 10)
          let downloadedBytes = 0

          const file = createWriteStream(destPath)
          res.on('data', (chunk: Buffer) => {
            downloadedBytes += chunk.length
            const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0
            const mbDown = (downloadedBytes / 1e6).toFixed(0)
            const mbTotal = (totalBytes / 1e6).toFixed(0)
            onProgress(percent, `Downloading: ${mbDown} MB / ${mbTotal} MB`)
          })

          res.pipe(file)
          file.on('finish', () => {
            file.close()
            onProgress(100, 'Download complete')
            resolve(destPath)
          })
          file.on('error', (err) => {
            file.close()
            reject(err)
          })
        })
        .on('error', reject)
    }

    onProgress(0, 'Starting download...')
    follow(entry.url)
  })
}

export async function deleteModel(modelId: string): Promise<void> {
  const entry = MODEL_CATALOG.find((m) => m.id === modelId)
  if (!entry) return
  const filePath = join(getModelsDirPath(), entry.filename)
  if (existsSync(filePath)) {
    unlinkSync(filePath)
  }
  if (loadedModelPath === filePath) {
    await unloadModel()
  }
}

export async function loadModel(modelPath: string): Promise<void> {
  if (!llamaInstance) await initLlama()
  if (loadedModelPath === modelPath) return

  await unloadModel()

  loadedModel = await llamaInstance.loadModel({ modelPath })
  activeContext = await loadedModel.createContext()
  const { LlamaChatSession } = await loadNodeLlamaCpp()
  activeSession = new LlamaChatSession({ contextSequence: activeContext.getSequence() })
  loadedModelPath = modelPath
}

export async function unloadModel(): Promise<void> {
  if (activeContext) {
    await activeContext.dispose()
    activeContext = null
  }
  if (loadedModel) {
    await loadedModel.dispose()
    loadedModel = null
  }
  activeSession = null
  loadedModelPath = null
}

export async function chat(
  modelPath: string,
  userMessage: string,
  onToken?: (token: string) => void
): Promise<string> {
  await loadModel(modelPath)
  if (!activeSession) throw new Error('No active session')

  const response = await activeSession.prompt(userMessage, {
    onTextChunk: onToken
  })

  return response
}

export async function resetChat(): Promise<void> {
  if (activeContext && loadedModel) {
    const { LlamaChatSession } = await loadNodeLlamaCpp()
    activeSession = new LlamaChatSession({ contextSequence: activeContext.getSequence() })
  }
}

export function getModelsDir(): string {
  return getModelsDirPath()
}
