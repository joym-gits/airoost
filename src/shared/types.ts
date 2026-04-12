export interface OllamaModel {
  name: string
  size: number
  digest: string
  modified_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface OllamaChatResponse {
  model: string
  message: ChatMessage
  done: boolean
}

export interface OllamaListResponse {
  models: OllamaModel[]
}
