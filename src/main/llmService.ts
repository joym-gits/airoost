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
    id: 'phi-3-mini-bundled',
    name: 'Phi-3 Mini (Bundled)',
    description: 'Microsoft\'s compact powerhouse. Ships with Airoost — ready instantly.',
    size: '2.4 GB',
    sizeBytes: 2_400_000_000,
    ramRequired: 4,
    url: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf',
    filename: 'bundled-model.gguf',
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
let activeSequence: any = null
let loadedModelPath: string | null = null

function ensureModelsDir(): void {
  if (!existsSync(getModelsDirPath())) {
    mkdirSync(getModelsDirPath(), { recursive: true })
  }
}

/**
 * Copy bundled model from app resources to user's models folder on first launch.
 * Sends progress events to the renderer for the loading screen.
 */
export function copyBundledModel(onProgress?: (percent: number, status: string) => void): boolean {
  ensureModelsDir()

  // Check multiple possible locations for bundled models
  const possibleDirs = [
    join(process.resourcesPath, 'models'),
    join(app.getAppPath(), 'resources', 'models'),
    join(app.getAppPath(), '..', 'resources', 'models')
  ]

  let bundledDir: string | null = null
  for (const dir of possibleDirs) {
    if (existsSync(dir)) {
      const ggufFiles = readdirSync(dir).filter((f) => f.endsWith('.gguf'))
      if (ggufFiles.length > 0) {
        bundledDir = dir
        break
      }
    }
  }

  if (!bundledDir) {
    onProgress?.(100, 'No bundled model found')
    return false
  }

  const files = readdirSync(bundledDir).filter((f) => f.endsWith('.gguf'))
  let copied = false

  for (const file of files) {
    const src = join(bundledDir, file)
    const dest = join(getModelsDirPath(), file)
    if (!existsSync(dest)) {
      onProgress?.(10, `Setting up ${file}...`)
      console.log('Copying bundled model:', file)

      // Copy with progress (chunked for large files)
      const srcSize = statSync(src).size
      const srcFd = require('fs').openSync(src, 'r')
      const destFd = require('fs').openSync(dest, 'w')
      const bufSize = 1024 * 1024 // 1MB chunks
      const buf = Buffer.alloc(bufSize)
      let bytesCopied = 0

      while (true) {
        const bytesRead = require('fs').readSync(srcFd, buf, 0, bufSize, null)
        if (bytesRead === 0) break
        require('fs').writeSync(destFd, buf, 0, bytesRead)
        bytesCopied += bytesRead
        const percent = Math.round((bytesCopied / srcSize) * 90) + 10 // 10-100%
        onProgress?.(percent, `Copying model: ${(bytesCopied / 1e6).toFixed(0)} / ${(srcSize / 1e6).toFixed(0)} MB`)
      }

      require('fs').closeSync(srcFd)
      require('fs').closeSync(destFd)
      console.log('Bundled model ready:', file)
      copied = true
    }
  }

  onProgress?.(100, 'Ready')
  return copied
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
  activeSequence = activeContext.getSequence()
  const { LlamaChatSession } = await loadNodeLlamaCpp()
  activeSession = new LlamaChatSession({ contextSequence: activeSequence })
  loadedModelPath = modelPath
}

export async function unloadModel(): Promise<void> {
  activeSession = null
  if (activeSequence) {
    activeSequence.dispose()
    activeSequence = null
  }
  if (activeContext) {
    await activeContext.dispose()
    activeContext = null
  }
  if (loadedModel) {
    await loadedModel.dispose()
    loadedModel = null
  }
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
  if (activeContext && loadedModel && activeSequence) {
    try {
      // Erase the sequence to free context space, then create fresh session
      if (activeSequence.nextTokenIndex > 0) {
        activeSequence.eraseContextTokenRanges([{ start: 0, end: activeSequence.nextTokenIndex }])
      }
      const { LlamaChatSession } = await loadNodeLlamaCpp()
      activeSession = new LlamaChatSession({ contextSequence: activeSequence })
    } catch (err) {
      console.error('resetChat error (non-fatal):', err)
    }
  }
}

/**
 * Chat with a custom system prompt (used for document chat).
 * Creates a fresh session each time to apply the system prompt.
 */
export async function chatWithContext(
  modelPath: string,
  systemPrompt: string,
  userMessage: string,
  onToken?: (token: string) => void
): Promise<string> {
  await loadModel(modelPath)
  if (!activeContext || !activeSequence) throw new Error('No active context')

  // Erase existing context and create a fresh session with system prompt
  if (activeSequence.nextTokenIndex > 0) {
    activeSequence.eraseContextTokenRanges([{ start: 0, end: activeSequence.nextTokenIndex }])
  }
  const { LlamaChatSession } = await loadNodeLlamaCpp()
  activeSession = new LlamaChatSession({
    contextSequence: activeSequence,
    systemPrompt
  })

  const response = await activeSession.prompt(userMessage, {
    onTextChunk: onToken
  })

  return response
}

/**
 * Run two models in parallel for comparison mode.
 * Loads both models into separate contexts and runs inference simultaneously.
 */
export async function compareChat(
  modelPathA: string,
  modelPathB: string,
  message: string,
  onTokenA?: (token: string) => void,
  onTokenB?: (token: string) => void
): Promise<{ responseA: string; responseB: string }> {
  if (!llamaInstance) await initLlama()

  const { LlamaChatSession } = await loadNodeLlamaCpp()

  // Load both models (may be the same model file — that's ok)
  const modelA = await llamaInstance.loadModel({ modelPath: modelPathA })
  const modelB = modelPathA === modelPathB
    ? modelA
    : await llamaInstance.loadModel({ modelPath: modelPathB })

  const ctxA = await modelA.createContext()
  const ctxB = modelPathA === modelPathB
    ? await modelA.createContext()
    : await modelB.createContext()

  const seqA = ctxA.getSequence()
  const seqB = ctxB.getSequence()

  const sessionA = new LlamaChatSession({ contextSequence: seqA })
  const sessionB = new LlamaChatSession({ contextSequence: seqB })

  // Run both in parallel
  const [responseA, responseB] = await Promise.all([
    sessionA.prompt(message, { onTextChunk: onTokenA }),
    sessionB.prompt(message, { onTextChunk: onTokenB })
  ])

  // Cleanup comparison contexts (don't disturb the main session)
  seqA.dispose()
  seqB.dispose()
  await ctxA.dispose()
  await ctxB.dispose()
  if (modelPathA !== modelPathB) {
    await modelB.dispose()
  }
  await modelA.dispose()

  return { responseA, responseB }
}

export function getModelsDir(): string {
  return getModelsDirPath()
}
