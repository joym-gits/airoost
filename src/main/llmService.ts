import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, createWriteStream } from 'fs'
import { createRequire } from 'module'
import https from 'https'
import http from 'http'

// Dynamic require to prevent Vite from bundling node-llama-cpp
const _require = createRequire(import.meta.url)
const modulePath = 'node-llama-cpp'
function loadNodeLlamaCpp() {
  return _require(modulePath)
}

const MODELS_DIR = join(app.getPath('userData'), 'models')

export const MODEL_CATALOG = [
  {
    id: 'smollm2-360m',
    name: 'SmolLM2 360M',
    description: 'Tiny & fast, great for testing — 360M params',
    size: '229 MB',
    sizeBytes: 240_000_000,
    url: 'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q8_0.gguf',
    filename: 'smollm2-360m-instruct-q8_0.gguf'
  },
  {
    id: 'smollm2-1.7b',
    name: 'SmolLM2 1.7B',
    description: 'Small but capable — 1.7B params',
    size: '1.0 GB',
    sizeBytes: 1_060_000_000,
    url: 'https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF/resolve/main/smollm2-1.7b-instruct-q4_k_m.gguf',
    filename: 'smollm2-1.7b-instruct-q4_k_m.gguf'
  },
  {
    id: 'llama-3.2-1b',
    name: 'Llama 3.2 1B',
    description: "Meta's compact model — 1B params",
    size: '750 MB',
    sizeBytes: 750_000_000,
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf'
  }
]

let llamaInstance: any = null
let loadedModel: any = null
let activeContext: any = null
let activeSession: any = null
let loadedModelPath: string | null = null

function ensureModelsDir(): void {
  if (!existsSync(MODELS_DIR)) {
    mkdirSync(MODELS_DIR, { recursive: true })
  }
}

export async function initLlama(): Promise<void> {
  ensureModelsDir()
  const { getLlama } = loadNodeLlamaCpp()
  llamaInstance = await getLlama()
}

export function getInstalledModels(): { id: string; name: string; size: number; path: string }[] {
  ensureModelsDir()
  const files = readdirSync(MODELS_DIR).filter((f) => f.endsWith('.gguf'))
  return files.map((filename) => {
    const filePath = join(MODELS_DIR, filename)
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

export function getCatalog() {
  const installed = getInstalledModels()
  const installedFiles = new Set(installed.map((m) => m.path))
  return MODEL_CATALOG.map((m) => ({
    ...m,
    installed: installedFiles.has(join(MODELS_DIR, m.filename))
  }))
}

export async function downloadModel(
  modelId: string,
  onProgress: (percent: number, status: string) => void
): Promise<string> {
  const entry = MODEL_CATALOG.find((m) => m.id === modelId)
  if (!entry) throw new Error(`Model ${modelId} not found in catalog`)

  ensureModelsDir()
  const destPath = join(MODELS_DIR, entry.filename)

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
  const filePath = join(MODELS_DIR, entry.filename)
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
  const { LlamaChatSession } = loadNodeLlamaCpp()
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
    const { LlamaChatSession } = loadNodeLlamaCpp()
    activeSession = new LlamaChatSession({ contextSequence: activeContext.getSequence() })
  }
}
