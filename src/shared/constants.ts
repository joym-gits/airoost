export const OLLAMA_BASE_URL = 'http://localhost:11434'

export const OLLAMA_ENDPOINTS = {
  TAGS: '/api/tags',
  CHAT: '/api/chat',
  PULL: '/api/pull',
  HEALTH: '/'
} as const
