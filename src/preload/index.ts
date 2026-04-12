import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getCatalog: () => ipcRenderer.invoke('llm:get-catalog'),
  getInstalled: () => ipcRenderer.invoke('llm:get-installed'),
  downloadModel: (modelId: string) => ipcRenderer.invoke('llm:download-model', modelId),
  deleteModel: (modelId: string) => ipcRenderer.invoke('llm:delete-model', modelId),
  chat: (modelPath: string, message: string) => ipcRenderer.invoke('llm:chat', modelPath, message),
  resetChat: () => ipcRenderer.invoke('llm:reset-chat'),

  onDownloadProgress: (callback: (data: { modelId: string; percent: number; status: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { modelId: string; percent: number; status: string }) => callback(data)
    ipcRenderer.on('llm:download-progress', handler)
    return () => ipcRenderer.removeListener('llm:download-progress', handler)
  },

  onChatToken: (callback: (data: { token: string; partial: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { token: string; partial: string }) => callback(data)
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
