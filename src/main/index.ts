import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
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
  loadModel,
  compareChat
} from './llmService'
import { searchModels, downloadHFModel } from './huggingfaceService'
import { parseDocument, buildDocumentPrompt } from './documentService'
import { chatWithContext } from './llmService'
import { getAllPersonas, getPersonaById, createPersona, updatePersona, deletePersona } from './personaService'
import { getAllPrompts, createPrompt, updatePrompt, deletePrompt, toggleFavourite } from './promptLibraryService'
import {
  getAllKnowledgeBases, getKnowledgeBase, createKnowledgeBase, deleteKnowledgeBase,
  reindexKnowledgeBase, searchKnowledgeBase, buildRAGContext, getKBDocuments
} from './ragService'
import {
  getUsageStats, recordConversation, recordMessage, getBenchmarks, saveBenchmark,
  getLiveHardwareStats
} from './statsService'
import { exportToPDF, exportToDOCX, exportToMarkdown, exportToText } from './exportService'

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

// Compare chat — two models in parallel
ipcMain.handle('llm:compare', async (event, modelPathA: string, modelPathB: string, message: string) => {
  try {
    console.log('Compare request:', { modelPathA, modelPathB, message: message.slice(0, 50) })
    const result = await compareChat(
      modelPathA,
      modelPathB,
      message,
      (token) => event.sender.send('llm:compare-token', { side: 'A', token }),
      (token) => event.sender.send('llm:compare-token', { side: 'B', token })
    )
    console.log('Compare done:', { a: result.responseA.length, b: result.responseB.length })
    return result
  } catch (err) {
    console.error('Compare error:', err)
    throw err
  }
})

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

// Export
ipcMain.handle('export:pdf', async (_event, data: any) => {
  const result = await dialog.showSaveDialog({
    title: 'Export as PDF',
    defaultPath: `${data.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (result.canceled || !result.filePath) return null
  await exportToPDF(data, result.filePath)
  return result.filePath
})

ipcMain.handle('export:docx', async (_event, data: any) => {
  const result = await dialog.showSaveDialog({
    title: 'Export as Word',
    defaultPath: `${data.title.replace(/[^a-z0-9]/gi, '_')}.docx`,
    filters: [{ name: 'Word Document', extensions: ['docx'] }]
  })
  if (result.canceled || !result.filePath) return null
  await exportToDOCX(data, result.filePath)
  return result.filePath
})

ipcMain.handle('export:markdown', (_event, data: any) => {
  return exportToMarkdown(data)
})

ipcMain.handle('export:text', (_event, data: any) => {
  return exportToText(data)
})

// Knowledge Bases (RAG)
ipcMain.handle('kb:get-all', () => getAllKnowledgeBases())
ipcMain.handle('kb:get', (_e, id: string) => getKnowledgeBase(id))
ipcMain.handle('kb:get-docs', (_e, id: string) => getKBDocuments(id))

ipcMain.handle('kb:create', async (event, name: string, sourcePath: string) => {
  return createKnowledgeBase(name, sourcePath, (processed, total, currentFile) => {
    event.sender.send('kb:index-progress', { processed, total, currentFile })
  })
})

ipcMain.handle('kb:reindex', async (event, id: string) => {
  return reindexKnowledgeBase(id, (processed, total, currentFile) => {
    event.sender.send('kb:index-progress', { processed, total, currentFile })
  })
})

ipcMain.handle('kb:delete', (_e, id: string) => deleteKnowledgeBase(id))

ipcMain.handle('kb:search', async (_e, kbId: string, query: string) => {
  return searchKnowledgeBase(kbId, query, 5)
})

ipcMain.handle('kb:chat', async (event, modelPath: string, kbId: string, message: string) => {
  const results = await searchKnowledgeBase(kbId, message, 5)
  const context = buildRAGContext(results)

  let full = ''
  const response = await chatWithContext(modelPath, context, message, (token) => {
    full += token
    event.sender.send('llm:chat-token', { token, partial: full })
  })
  return { response, sources: results }
})

ipcMain.handle('kb:select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select folder for Knowledge Base'
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

// Prompt Library
ipcMain.handle('prompts:get-all', () => getAllPrompts())
ipcMain.handle('prompts:create', (_event, name: string, category: string, text: string) => createPrompt(name, category, text))
ipcMain.handle('prompts:update', (_event, id: string, name: string, category: string, text: string) => updatePrompt(id, name, category, text))
ipcMain.handle('prompts:delete', (_event, id: string) => deletePrompt(id))
ipcMain.handle('prompts:toggle-fav', (_event, id: string) => toggleFavourite(id))

// Stats & Benchmarks
ipcMain.handle('stats:get', () => getUsageStats())
ipcMain.handle('stats:record-convo', () => recordConversation())
ipcMain.handle('stats:record-message', (_e, modelName: string, responseTimeMs: number, tokenCount: number) => {
  recordMessage(modelName, responseTimeMs, tokenCount)
})
ipcMain.handle('stats:benchmarks', () => getBenchmarks())
ipcMain.handle('stats:run-benchmark', async (event, modelPath: string, modelName: string) => {
  const testPrompt = 'Explain the theory of relativity in exactly 100 words.'
  const startTime = Date.now()
  const ramBefore = getLiveHardwareStats().ramUsedGB

  let tokenCount = 0
  const response = await chat(modelPath, testPrompt, () => { tokenCount++ })
  const elapsed = Date.now() - startTime
  const ramAfter = getLiveHardwareStats().ramUsedGB

  const result = {
    modelName,
    modelPath,
    tokensPerSecond: elapsed > 0 ? Math.round((tokenCount / (elapsed / 1000)) * 10) / 10 : 0,
    responseTimeMs: elapsed,
    ramUsageMB: Math.round((ramAfter - ramBefore + (response.length * 0.001)) * 100), // rough estimate
    timestamp: Date.now()
  }
  saveBenchmark(result)
  return result
})
ipcMain.handle('stats:hw-live', () => getLiveHardwareStats())

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
