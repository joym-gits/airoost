import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
  } catch {
    // Context isolation failed
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
}
