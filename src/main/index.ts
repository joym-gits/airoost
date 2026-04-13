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
  resetChat,
  detectHardware,
  getModelsDir
} from './llmService'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Airoost',
    backgroundColor: '#0f0f23',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
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

// ─── IPC Handlers ─────────────────────────────────────────────────

// Models
ipcMain.handle('llm:get-catalog', () => getCatalog())
ipcMain.handle('llm:get-installed', () => getInstalledModels())
ipcMain.handle('llm:get-models-dir', () => getModelsDir())

ipcMain.handle('llm:download-model', (event, modelId: string) => {
  return downloadModel(modelId, (percent, status) => {
    event.sender.send('llm:download-progress', { modelId, percent, status })
  })
})

ipcMain.handle('llm:delete-model', (_event, modelId: string) => deleteModel(modelId))

// Chat
ipcMain.handle('llm:chat', async (event, modelPath: string, message: string) => {
  let full = ''
  const response = await chat(modelPath, message, (token) => {
    full += token
    event.sender.send('llm:chat-token', { token, partial: full })
  })
  return response
})

ipcMain.handle('llm:reset-chat', () => resetChat())

// Hardware
ipcMain.handle('hw:detect', () => detectHardware())

// ─── App Lifecycle ────────────────────────────────────────────────

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
