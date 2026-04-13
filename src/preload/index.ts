import { contextBridge, ipcRenderer, webUtils } from 'electron'

const api = {
  // Models
  getCatalog: () => ipcRenderer.invoke('llm:get-catalog'),
  getInstalled: () => ipcRenderer.invoke('llm:get-installed'),
  getModelsDir: () => ipcRenderer.invoke('llm:get-models-dir'),
  downloadModel: (modelId: string) => ipcRenderer.invoke('llm:download-model', modelId),
  deleteModel: (modelId: string) => ipcRenderer.invoke('llm:delete-model', modelId),

  // Chat
  chat: (modelPath: string, message: string) => ipcRenderer.invoke('llm:chat', modelPath, message),
  resetChat: () => ipcRenderer.invoke('llm:reset-chat'),

  // Hardware
  detectHardware: () => ipcRenderer.invoke('hw:detect'),

  // Export
  exportPDF: (data: any) => ipcRenderer.invoke('export:pdf', data),
  exportDOCX: (data: any) => ipcRenderer.invoke('export:docx', data),
  exportMarkdown: (data: any) => ipcRenderer.invoke('export:markdown', data),
  exportText: (data: any) => ipcRenderer.invoke('export:text', data),

  // Prompt Library
  getPrompts: () => ipcRenderer.invoke('prompts:get-all'),
  createPrompt: (name: string, category: string, text: string) => ipcRenderer.invoke('prompts:create', name, category, text),
  updatePrompt: (id: string, name: string, category: string, text: string) => ipcRenderer.invoke('prompts:update', id, name, category, text),
  deletePrompt: (id: string) => ipcRenderer.invoke('prompts:delete', id),
  togglePromptFav: (id: string) => ipcRenderer.invoke('prompts:toggle-fav', id),

  // Personas
  getPersonas: () => ipcRenderer.invoke('persona:get-all'),
  getPersona: (id: string) => ipcRenderer.invoke('persona:get', id),
  createPersona: (name: string, emoji: string, systemPrompt: string) => ipcRenderer.invoke('persona:create', name, emoji, systemPrompt),
  updatePersona: (id: string, name: string, emoji: string, systemPrompt: string) => ipcRenderer.invoke('persona:update', id, name, emoji, systemPrompt),
  deletePersona: (id: string) => ipcRenderer.invoke('persona:delete', id),
  chatWithPersona: (modelPath: string, systemPrompt: string, message: string) => ipcRenderer.invoke('llm:chat-persona', modelPath, systemPrompt, message),

  // File path helper (Electron's modern API for drag-drop)
  getFilePath: (file: File) => webUtils.getPathForFile(file),

  // Knowledge Bases (RAG)
  kbGetAll: () => ipcRenderer.invoke('kb:get-all'),
  kbGet: (id: string) => ipcRenderer.invoke('kb:get', id),
  kbGetDocs: (id: string) => ipcRenderer.invoke('kb:get-docs', id),
  kbCreate: (name: string, sourcePath: string) => ipcRenderer.invoke('kb:create', name, sourcePath),
  kbReindex: (id: string) => ipcRenderer.invoke('kb:reindex', id),
  kbDelete: (id: string) => ipcRenderer.invoke('kb:delete', id),
  kbSearch: (kbId: string, query: string) => ipcRenderer.invoke('kb:search', kbId, query),
  kbChat: (modelPath: string, kbId: string, message: string) => ipcRenderer.invoke('kb:chat', modelPath, kbId, message),
  kbSelectFolder: () => ipcRenderer.invoke('kb:select-folder'),
  onKBIndexProgress: (callback: (data: { processed: number; total: number; currentFile: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: { processed: number; total: number; currentFile: string }) => callback(data)
    ipcRenderer.on('kb:index-progress', handler)
    return () => ipcRenderer.removeListener('kb:index-progress', handler)
  },

  // Compare
  compareChat: (modelPathA: string, modelPathB: string, message: string) =>
    ipcRenderer.invoke('llm:compare', modelPathA, modelPathB, message),
  onCompareToken: (callback: (data: { side: 'A' | 'B'; token: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: { side: 'A' | 'B'; token: string }) => callback(data)
    ipcRenderer.on('llm:compare-token', handler)
    return () => ipcRenderer.removeListener('llm:compare-token', handler)
  },

  // Document Chat
  parseDocument: (filePath: string) => ipcRenderer.invoke('doc:parse', filePath),
  docChat: (modelPath: string, docText: string, docFilename: string, message: string) =>
    ipcRenderer.invoke('doc:chat', modelPath, docText, docFilename, message),

  // HuggingFace Explorer
  hfSearch: (query: string, limit?: number) => ipcRenderer.invoke('hf:search', query, limit ?? 20),
  hfDownload: (fileUrl: string, filename: string) => ipcRenderer.invoke('hf:download', fileUrl, filename),

  // Events
  onDownloadProgress: (callback: (data: { modelId: string; percent: number; status: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: { modelId: string; percent: number; status: string }) => callback(data)
    ipcRenderer.on('llm:download-progress', handler)
    return () => ipcRenderer.removeListener('llm:download-progress', handler)
  },

  onChatToken: (callback: (data: { token: string; partial: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: { token: string; partial: string }) => callback(data)
    ipcRenderer.on('llm:chat-token', handler)
    return () => ipcRenderer.removeListener('llm:chat-token', handler)
  }
}

export type AiroostAPI = typeof api

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('airoost', api)
} else {
  // @ts-ignore
  window.airoost = api
}
