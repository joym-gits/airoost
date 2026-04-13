import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import {
  initLlama,
  getInstalledModels,
  getCatalog,
  downloadModel,
  deleteModel,
  chat,
  resetChat,
  detectHardware,
  getModelsDir,
  loadModel
} from './llmService'
import { searchModels, downloadHFModel } from './huggingfaceService'
import { parseDocument, buildDocumentPrompt } from './documentService'
import { chatWithContext } from './llmService'
import { getAllPersonas, getPersonaById, createPersona, updatePersona, deletePersona } from './personaService'
import { getAllPrompts, createPrompt, updatePrompt, deletePrompt, toggleFavourite } from './promptLibraryService'

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

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────

// Models
ipcMain.handle('llm:get-catalog', () => {
  try {
    return getCatalog()
  } catch (err) {
    console.error('getCatalog error:', err)
    return []
  }
})
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
  try {
    console.log('Chat request:', { modelPath, message: message.slice(0, 50) })
    let full = ''
    const response = await chat(modelPath, message, (token) => {
      full += token
      event.sender.send('llm:chat-token', { token, partial: full })
    })
    console.log('Chat response length:', response.length)
    return response
  } catch (err) {
    console.error('Chat error:', err)
    throw err
  }
})

ipcMain.handle('llm:reset-chat', () => resetChat())

// Hardware
ipcMain.handle('hw:detect', () => {
  try {
    return detectHardware()
  } catch (err) {
    console.error('Hardware detection error:', err)
    return null
  }
})

// HuggingFace Explorer
ipcMain.handle('hf:search', async (_event, query: string, limit: number) => {
  try {
    const hw = detectHardware()
    return await searchModels(query, limit, hw?.totalRamGB ?? 16)
  } catch (err) {
    console.error('HF search error:', err)
    return []
  }
})

ipcMain.handle('hf:download', (event, fileUrl: string, filename: string) => {
  return downloadHFModel(fileUrl, filename, getModelsDir(), (percent, status) => {
    event.sender.send('llm:download-progress', { modelId: filename, percent, status })
  })
})

// Document Chat
ipcMain.handle('doc:parse', async (_event, filePath: string) => {
  try {
    return await parseDocument(filePath)
  } catch (err: any) {
    console.error('Document parse error:', err)
    throw new Error(err?.message ?? 'Failed to parse document')
  }
})

ipcMain.handle('doc:chat', async (event, modelPath: string, docText: string, docFilename: string, message: string) => {
  const systemPrompt = buildDocumentPrompt({
    filename: docFilename,
    extension: '',
    text: docText,
    pageCount: 0,
    charCount: docText.length,
    truncated: false
  })

  let full = ''
  const response = await chatWithContext(modelPath, systemPrompt, message, (token) => {
    full += token
    event.sender.send('llm:chat-token', { token, partial: full })
  })
  return response
})

// Personas
ipcMain.handle('persona:get-all', () => getAllPersonas())
ipcMain.handle('persona:get', (_event, id: string) => getPersonaById(id))
ipcMain.handle('persona:create', (_event, name: string, emoji: string, systemPrompt: string) => createPersona(name, emoji, systemPrompt))
ipcMain.handle('persona:update', (_event, id: string, name: string, emoji: string, systemPrompt: string) => updatePersona(id, name, emoji, systemPrompt))
ipcMain.handle('persona:delete', (_event, id: string) => deletePersona(id))

// Chat with persona (system prompt)
ipcMain.handle('llm:chat-persona', async (event, modelPath: string, systemPrompt: string, message: string) => {
  try {
    console.log('Persona chat request:', { modelPath, message: message.slice(0, 50) })
    let full = ''
    const response = await chatWithContext(modelPath, systemPrompt, message, (token) => {
      full += token
      event.sender.send('llm:chat-token', { token, partial: full })
    })
    console.log('Persona chat response length:', response.length)
    return response
  } catch (err) {
    console.error('Persona chat error:', err)
    throw err
  }
})

// Prompt Library
ipcMain.handle('prompts:get-all', () => getAllPrompts())
ipcMain.handle('prompts:create', (_event, name: string, category: string, text: string) => createPrompt(name, category, text))
ipcMain.handle('prompts:update', (_event, id: string, name: string, category: string, text: string) => updatePrompt(id, name, category, text))
ipcMain.handle('prompts:delete', (_event, id: string) => deletePrompt(id))
ipcMain.handle('prompts:toggle-fav', (_event, id: string) => toggleFavourite(id))

// ─── App Lifecycle ────────────────────────────────────────────────

app.whenReady().then(async () => {
  createWindow()

  // Init LLM engine and pre-load first installed model in background
  initLlama()
    .then(async () => {
      const installed = getInstalledModels()
      if (installed.length > 0) {
        console.log('Pre-loading model:', installed[0].name)
        await loadModel(installed[0].path)
        console.log('Model ready:', installed[0].name)
      }
    })
    .catch((err) => console.error('LLM engine init deferred:', err))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
