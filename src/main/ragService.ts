import { app } from 'electron'
import { join } from 'path'
import {
  existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync,
  statSync, unlinkSync, rmdirSync
} from 'fs'
import { extname, basename } from 'path'

// ─── Dynamic module import (ASAR-aware) ──────────────────────────
//
// In packaged apps, require('pkg') tries to load from inside app.asar
// which doesn't work for native modules or binary-dependent packages.
// These are unpacked to app.asar.unpacked/node_modules/ via electron-
// builder's asarUnpack config. We resolve the absolute path there.

const _modCache: Record<string, any> = {}

async function dynamicImport(packageName: string): Promise<any> {
  if (_modCache[packageName]) return _modCache[packageName]

  // Try absolute path via app.asar.unpacked first (production)
  // Fall back to bare specifier (dev / if already cached in Node)
  const candidates: string[] = []
  if (app.isPackaged) {
    const unpackedBase = app.getAppPath().replace(/app\.asar$/, 'app.asar.unpacked')
    candidates.push(join(unpackedBase, 'node_modules', packageName))
  }
  candidates.push(packageName)

  let lastErr: any = null
  for (const spec of candidates) {
    try {
      const mod = await (Function('m', 'return import(m)')(spec))
      _modCache[packageName] = mod
      return mod
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr ?? new Error(`Could not load ${packageName}`)
}

// ─── Types ───────────────────────────────────────────────────────

export interface KnowledgeBase {
  id: string
  name: string
  sourcePath: string
  documentCount: number
  chunkCount: number
  indexSizeBytes: number
  createdAt: number
  updatedAt: number
  failedFiles?: { filename: string; reason: string }[]
}

export interface KBDocument {
  filename: string
  path: string
  chunkCount: number
  sizeBytes: number
}

export interface KBSearchResult {
  text: string
  score: number
  source: string
  chunkIndex: number
}

interface ChunkMeta {
  source: string
  chunkIndex: number
  totalChunks: number
}

// ─── Paths ───────────────────────────────────────────────────────

let _kbDir: string | null = null
function getKBDir(): string {
  if (!_kbDir) {
    _kbDir = join(app.getPath('userData'), 'knowledge-bases')
    if (!existsSync(_kbDir)) mkdirSync(_kbDir, { recursive: true })
  }
  return _kbDir
}

function getKBPath(kbId: string): string {
  return join(getKBDir(), kbId)
}

function getKBMetaFile(): string {
  return join(getKBDir(), 'kb-index.json')
}

// ─── KB Registry ─────────────────────────────────────────────────

function loadKBRegistry(): KnowledgeBase[] {
  const file = getKBMetaFile()
  if (!existsSync(file)) return []
  try { return JSON.parse(readFileSync(file, 'utf-8')) } catch { return [] }
}

function saveKBRegistry(kbs: KnowledgeBase[]): void {
  writeFileSync(getKBMetaFile(), JSON.stringify(kbs, null, 2))
}

export function getAllKnowledgeBases(): KnowledgeBase[] {
  return loadKBRegistry()
}

export function getKnowledgeBase(id: string): KnowledgeBase | null {
  return loadKBRegistry().find((kb) => kb.id === id) ?? null
}

// ─── Text Extraction ─────────────────────────────────────────────

const SUPPORTED_EXTS = ['.pdf', '.docx', '.txt', '.md']

async function extractText(filePath: string): Promise<string> {
  const ext = extname(filePath).toLowerCase()
  switch (ext) {
    case '.pdf': {
      const pdfMod = await dynamicImport('pdf-parse')
      const PDFParse = pdfMod.PDFParse ?? pdfMod.default?.PDFParse ?? pdfMod.default
      const buffer = readFileSync(filePath)
      const parser = new PDFParse({ data: new Uint8Array(buffer) })
      try {
        const result = await parser.getText()
        return result?.text ?? ''
      } finally {
        await parser.destroy()
      }
    }
    case '.docx': {
      const mammoth = await dynamicImport('mammoth')
      const extractFn = mammoth.extractRawText ?? mammoth.default?.extractRawText
      const buffer = readFileSync(filePath)
      const result = await extractFn({ buffer })
      return result.value ?? ''
    }
    case '.txt':
    case '.md':
      return readFileSync(filePath, 'utf-8')
    default:
      return ''
  }
}

// ─── Chunking ────────────────────────────────────────────────────

function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
  const words = text.split(/\s+/)
  if (words.length <= chunkSize) return [text]

  const chunks: string[] = []
  let i = 0
  while (i < words.length) {
    const end = Math.min(i + chunkSize, words.length)
    chunks.push(words.slice(i, end).join(' '))
    i += chunkSize - overlap
  }
  return chunks
}

// ─── Embeddings ──────────────────────────────────────────────────

let embeddingPipeline: any = null

async function getEmbeddingPipeline(): Promise<any> {
  if (embeddingPipeline) return embeddingPipeline
  const { pipeline } = await dynamicImport('@huggingface/transformers')
  embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    dtype: 'fp32'
  })
  return embeddingPipeline
}

async function embed(text: string): Promise<number[]> {
  const pipe = await getEmbeddingPipeline()
  const result = await pipe(text, { pooling: 'mean', normalize: true })
  return Array.from(result.data as Float32Array).slice(0, 384) // MiniLM outputs 384 dims
}

// ─── Vector Store (simple JSON-based) ────────────────────────────

interface VectorEntry {
  vector: number[]
  text: string
  meta: ChunkMeta
}

function getVectorStorePath(kbId: string): string {
  return join(getKBPath(kbId), 'vectors.json')
}

function loadVectorStore(kbId: string): VectorEntry[] {
  const file = getVectorStorePath(kbId)
  if (!existsSync(file)) return []
  try { return JSON.parse(readFileSync(file, 'utf-8')) } catch { return [] }
}

function saveVectorStore(kbId: string, entries: VectorEntry[]): void {
  const dir = getKBPath(kbId)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(getVectorStorePath(kbId), JSON.stringify(entries))
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-8)
}

// ─── Create & Index ──────────────────────────────────────────────

export async function createKnowledgeBase(
  name: string,
  sourcePath: string,
  onProgress: (processed: number, total: number, currentFile: string) => void
): Promise<KnowledgeBase> {
  const kbId = `kb_${Date.now()}`
  const kbPath = getKBPath(kbId)
  mkdirSync(kbPath, { recursive: true })

  // Find all supported files
  const files = findFiles(sourcePath)
  const allEntries: VectorEntry[] = []
  const failedFiles: { filename: string; reason: string }[] = []
  let totalChunks = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const filename = basename(file)
    onProgress(i, files.length, filename)

    try {
      const text = await extractText(file)
      if (!text.trim()) {
        failedFiles.push({ filename, reason: 'No text could be extracted (file may be empty, image-only PDF, or protected)' })
        console.warn(`RAG: no text extracted from ${file}`)
        continue
      }

      const chunks = chunkText(text)
      for (let ci = 0; ci < chunks.length; ci++) {
        const vector = await embed(chunks[ci])
        allEntries.push({
          vector,
          text: chunks[ci],
          meta: { source: filename, chunkIndex: ci, totalChunks: chunks.length }
        })
        totalChunks++
      }
      console.log(`RAG: indexed ${filename} (${chunks.length} chunks)`)
    } catch (err: any) {
      const reason = err?.message ?? String(err)
      failedFiles.push({ filename, reason })
      console.error(`RAG: failed to index ${file}:`, reason)
    }
  }

  onProgress(files.length, files.length, 'Done')

  saveVectorStore(kbId, allEntries)

  const indexSize = existsSync(getVectorStorePath(kbId))
    ? statSync(getVectorStorePath(kbId)).size
    : 0

  const kb: KnowledgeBase = {
    id: kbId,
    name,
    sourcePath,
    documentCount: files.length,
    chunkCount: totalChunks,
    indexSizeBytes: indexSize,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    failedFiles
  }

  console.log(`RAG: created KB "${name}" — ${totalChunks} chunks from ${files.length - failedFiles.length}/${files.length} files. Failed: ${failedFiles.length}`)

  const registry = loadKBRegistry()
  registry.push(kb)
  saveKBRegistry(registry)

  return kb
}

function findFiles(dirPath: string): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)
      if (entry.isDirectory()) {
        results.push(...findFiles(fullPath))
      } else if (SUPPORTED_EXTS.includes(extname(entry.name).toLowerCase())) {
        results.push(fullPath)
      }
    }
  } catch {
    // Permission error, skip
  }
  return results
}

// ─── Search ──────────────────────────────────────────────────────

export async function searchKnowledgeBase(
  kbId: string,
  query: string,
  topK: number = 5
): Promise<KBSearchResult[]> {
  const entries = loadVectorStore(kbId)
  if (entries.length === 0) return []

  const queryVector = await embed(query)

  const scored = entries.map((entry) => ({
    ...entry,
    score: cosineSimilarity(queryVector, entry.vector)
  }))

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, topK).map((s) => ({
    text: s.text,
    score: s.score,
    source: s.meta.source,
    chunkIndex: s.meta.chunkIndex
  }))
}

// ─── Build Context ───────────────────────────────────────────────

export function buildRAGContext(results: KBSearchResult[]): string {
  if (results.length === 0) return ''

  const sections = results.map((r, i) =>
    `[Excerpt ${i + 1} — from "${r.source}"]\n${r.text}`
  )

  return [
    'You are a knowledge base assistant. You have been given excerpts from the user\'s documents below. Your job is to answer the user\'s question using ONLY the information in these excerpts.',
    '',
    'Rules:',
    '1. Base your answer primarily on the excerpts provided.',
    '2. When referencing information, mention which document it came from (e.g., "According to [filename]...").',
    '3. If the excerpts do not contain enough information to answer, say so honestly. Do not make up information.',
    '4. Be specific and quote relevant passages when helpful.',
    '',
    '=== KNOWLEDGE BASE EXCERPTS ===',
    ...sections,
    '=== END OF EXCERPTS ==='
  ].join('\n')
}

// ─── Management ──────────────────────────────────────────────────

export function getKBDocuments(kbId: string): KBDocument[] {
  const entries = loadVectorStore(kbId)
  const docMap = new Map<string, { chunkCount: number }>()

  for (const entry of entries) {
    const existing = docMap.get(entry.meta.source)
    if (existing) {
      existing.chunkCount++
    } else {
      docMap.set(entry.meta.source, { chunkCount: 1 })
    }
  }

  return [...docMap.entries()].map(([filename, data]) => ({
    filename,
    path: filename,
    chunkCount: data.chunkCount,
    sizeBytes: 0
  }))
}

export async function reindexKnowledgeBase(
  kbId: string,
  onProgress: (processed: number, total: number, currentFile: string) => void
): Promise<KnowledgeBase | null> {
  const kb = getKnowledgeBase(kbId)
  if (!kb) return null

  // Re-index from source path
  const files = findFiles(kb.sourcePath)
  const allEntries: VectorEntry[] = []
  const failedFiles: { filename: string; reason: string }[] = []
  let totalChunks = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const filename = basename(file)
    onProgress(i, files.length, filename)

    try {
      const text = await extractText(file)
      if (!text.trim()) {
        failedFiles.push({ filename, reason: 'No text could be extracted (file may be empty, image-only PDF, or protected)' })
        console.warn(`RAG: no text extracted from ${file}`)
        continue
      }

      const chunks = chunkText(text)
      for (let ci = 0; ci < chunks.length; ci++) {
        const vector = await embed(chunks[ci])
        allEntries.push({
          vector,
          text: chunks[ci],
          meta: { source: filename, chunkIndex: ci, totalChunks: chunks.length }
        })
        totalChunks++
      }
      console.log(`RAG: re-indexed ${filename} (${chunks.length} chunks)`)
    } catch (err: any) {
      const reason = err?.message ?? String(err)
      failedFiles.push({ filename, reason })
      console.error(`RAG: failed to re-index ${file}:`, reason)
    }
  }

  onProgress(files.length, files.length, 'Done')
  console.log(`RAG: re-indexed KB — ${totalChunks} chunks from ${files.length - failedFiles.length}/${files.length} files`)
  saveVectorStore(kbId, allEntries)

  const indexSize = existsSync(getVectorStorePath(kbId))
    ? statSync(getVectorStorePath(kbId)).size
    : 0

  // Update registry
  const registry = loadKBRegistry()
  const idx = registry.findIndex((r) => r.id === kbId)
  if (idx !== -1) {
    registry[idx].documentCount = files.length
    registry[idx].chunkCount = totalChunks
    registry[idx].indexSizeBytes = indexSize
    registry[idx].updatedAt = Date.now()
    registry[idx].failedFiles = failedFiles
    saveKBRegistry(registry)
    return registry[idx]
  }

  return null
}

export function deleteKnowledgeBase(kbId: string): void {
  // Remove vector store
  const kbPath = getKBPath(kbId)
  if (existsSync(kbPath)) {
    const files = readdirSync(kbPath)
    for (const f of files) unlinkSync(join(kbPath, f))
    rmdirSync(kbPath)
  }

  // Remove from registry
  const registry = loadKBRegistry().filter((kb) => kb.id !== kbId)
  saveKBRegistry(registry)
}
