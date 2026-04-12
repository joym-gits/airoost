import axios from 'axios'
import { OLLAMA_BASE_URL, OLLAMA_ENDPOINTS } from '../../shared/constants'
import type { OllamaModel, ChatMessage, OllamaListResponse } from '../../shared/types'

const client = axios.create({
  baseURL: OLLAMA_BASE_URL,
  timeout: 30000
})

/**
 * Check if Ollama is running and reachable.
 */
export async function checkOllamaRunning(): Promise<boolean> {
  try {
    const res = await client.get(OLLAMA_ENDPOINTS.HEALTH, { timeout: 3000 })
    return res.status === 200
  } catch {
    return false
  }
}

/**
 * Fetch all locally installed models.
 */
export async function listModels(): Promise<OllamaModel[]> {
  const res = await client.get<OllamaListResponse>(OLLAMA_ENDPOINTS.TAGS)
  return res.data.models ?? []
}

/**
 * Pull (download) a model by name.
 */
export async function pullModel(
  name: string,
  onProgress?: (status: string) => void
): Promise<void> {
  const res = await fetch(`${OLLAMA_BASE_URL}${OLLAMA_ENDPOINTS.PULL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })

  if (!res.ok) throw new Error(`Failed to pull model: ${res.statusText}`)
  if (!res.body) return

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value)
    for (const line of text.split('\n').filter(Boolean)) {
      try {
        const data = JSON.parse(line)
        onProgress?.(data.status ?? '')
      } catch {
        // skip malformed lines
      }
    }
  }
}

/**
 * Send a chat message and get a complete response.
 * Uses streaming internally but returns the full assembled response.
 */
export async function chat(
  model: string,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE_URL}${OLLAMA_ENDPOINTS.CHAT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true })
  })

  if (!res.ok) throw new Error(`Chat failed: ${res.statusText}`)
  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let fullResponse = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value)
    for (const line of text.split('\n').filter(Boolean)) {
      try {
        const data = JSON.parse(line)
        if (data.message?.content) {
          fullResponse += data.message.content
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  return fullResponse
}
