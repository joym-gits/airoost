import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import {
  initLlama,
  getInstalledModels,
  getCatalog,
  downloadModel,
  deleteModel,
  chat,
  resetChat
} from './llmService'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Airoost',
    backgroundColor: '#1a1a2e',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }
}

// --- IPC Handlers ---

ipcMain.handle('llm:get-catalog', () => {
  return getCatalog()
})

ipcMain.handle('llm:get-installed', () => {
  return getInstalledModels()
})

ipcMain.handle('llm:download-model', (event, modelId: string) => {
  return downloadModel(modelId, (percent, status) => {
    event.sender.send('llm:download-progress', { modelId, percent, status })
  })
})

ipcMain.handle('llm:delete-model', (_event, modelId: string) => {
  return deleteModel(modelId)
})

ipcMain.handle('llm:chat', async (event, modelPath: string, message: string) => {
  let full = ''
  const response = await chat(modelPath, message, (token) => {
    full += token
    event.sender.send('llm:chat-token', { token, partial: full })
  })
  return response
})

ipcMain.handle('llm:reset-chat', () => {
  return resetChat()
})

// --- App Lifecycle ---

app.whenReady().then(async () => {
  await initLlama()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
