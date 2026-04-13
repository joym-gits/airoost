import https from 'https'
import http from 'http'
import { join } from 'path'
import { existsSync, mkdirSync, createWriteStream } from 'fs'

const HF_API = 'https://huggingface.co/api'

const VERIFIED_ORGS = new Set([
  'meta-llama', 'google', 'mistralai', 'microsoft', 'Qwen',
  'alibaba', 'HuggingFaceTB', 'bartowski', 'TheBloke',
  'unsloth', 'NousResearch', 'deepseek-ai', 'tiiuae'
])

// ─── Types ───────────────────────────────────────────────────────

export interface HFModel {
  id: string
  author: string
  name: string
  downloads: number
  likes: number
  tags: string[]
  pipelineTag: string
  badge: 'verified' | 'community'
  ggufFiles: HFGGUFFile[]
  totalSizeBytes: number
  compatibility: { status: string; message: string }
}

export interface HFGGUFFile {
  filename: string
  sizeBytes: number
  url: string
}

// ─── API Functions ───────────────────────────────────────────────

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, { headers: { 'User-Agent': 'Airoost/0.1' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpGet(res.headers.location).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      let body = ''
      res.on('data', (chunk: Buffer) => (body += chunk.toString()))
      res.on('end', () => resolve(body))
    }).on('error', reject)
  })
}

/**
 * Search HuggingFace for GGUF models.
 */
export async function searchModels(
  query: string,
  limit: number = 20,
  ramGB: number = 16
): Promise<HFModel[]> {
  const search = query ? `&search=${encodeURIComponent(query + ' gguf')}` : '&search=gguf'
  const url = `${HF_API}/models?sort=downloads&direction=-1&limit=${limit}${search}`

  const body = await httpGet(url)
  const results: any[] = JSON.parse(body)

  // Filter to only models with 'gguf' in tags or id
  const ggufResults = results.filter((m) =>
    m.tags?.includes('gguf') || m.id?.toLowerCase().includes('gguf')
  )

  // Fetch GGUF file details for each model (in parallel, max 5)
  const models: HFModel[] = []
  const batches = []
  for (let i = 0; i < ggufResults.length; i += 5) {
    batches.push(ggufResults.slice(i, i + 5))
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (m: any) => {
        const author = m.id?.split('/')[0] ?? 'unknown'
        const name = m.id?.split('/').pop() ?? m.id
        const ggufFiles = await fetchGGUFFiles(m.id).catch(() => [])

        const totalSize = ggufFiles.length > 0
          ? Math.min(...ggufFiles.map((f) => f.sizeBytes))
          : 0

        const ramRequired = Math.ceil(totalSize / 1e9) + 1 // rough: model size + 1GB overhead

        let compatibility: { status: string; message: string }
        if (totalSize === 0) {
          compatibility = { status: 'unknown', message: 'Size unknown' }
        } else if (ramRequired > ramGB) {
          compatibility = { status: 'too-large', message: 'Too large for your machine' }
        } else if (ramRequired > ramGB * 0.6) {
          compatibility = { status: 'slow', message: 'May run slowly' }
        } else {
          compatibility = { status: 'smooth', message: 'Runs smoothly on your machine' }
        }

        return {
          id: m.id,
          author,
          name,
          downloads: m.downloads ?? 0,
          likes: m.likes ?? 0,
          tags: m.tags ?? [],
          pipelineTag: m.pipeline_tag ?? '',
          badge: VERIFIED_ORGS.has(author) ? 'verified' as const : 'community' as const,
          ggufFiles,
          totalSizeBytes: totalSize,
          compatibility
        }
      })
    )
    models.push(...batchResults)
  }

  return models
}

/**
 * Fetch GGUF files for a specific model from the HF API.
 */
async function fetchGGUFFiles(modelId: string): Promise<HFGGUFFile[]> {
  const url = `${HF_API}/models/${modelId}?blobs=true`
  const body = await httpGet(url)
  const data = JSON.parse(body)

  const siblings: any[] = data.siblings ?? []
  return siblings
    .filter((s: any) => s.rfilename?.endsWith('.gguf'))
    .map((s: any) => ({
      filename: s.rfilename,
      sizeBytes: s.size ?? 0,
      url: `https://huggingface.co/${modelId}/resolve/main/${s.rfilename}`
    }))
    .sort((a, b) => a.sizeBytes - b.sizeBytes)
}

/**
 * Download a GGUF file from HuggingFace into the models directory.
 */
export async function downloadHFModel(
  fileUrl: string,
  filename: string,
  modelsDir: string,
  onProgress: (percent: number, status: string) => void
): Promise<string> {
  if (!existsSync(modelsDir)) {
    mkdirSync(modelsDir, { recursive: true })
  }

  const destPath = join(modelsDir, filename)

  if (existsSync(destPath)) {
    onProgress(100, 'Already downloaded')
    return destPath
  }

  return new Promise((resolve, reject) => {
    const follow = (url: string) => {
      const client = url.startsWith('https') ? https : http
      client.get(url, { headers: { 'User-Agent': 'Airoost/0.1' } }, (res) => {
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
      }).on('error', reject)
    }

    onProgress(0, 'Starting download...')
    follow(fileUrl)
  })
}

/**
 * Format download count.
 */
export function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}
