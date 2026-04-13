import { BrowserWindow } from 'electron'

// Dynamic import to avoid bundling issues
let autoUpdater: any = null

async function getAutoUpdater() {
  if (autoUpdater) return autoUpdater
  const mod = await (Function('m', 'return import(m)')('electron-updater'))
  autoUpdater = mod.autoUpdater ?? mod.default?.autoUpdater ?? mod
  return autoUpdater
}

/**
 * Initialize auto-updater. Checks for updates silently on launch.
 * Sends events to the renderer for UI notification.
 */
export async function initAutoUpdater(mainWindow: BrowserWindow): Promise<void> {
  try {
    const updater = await getAutoUpdater()

    updater.autoDownload = false
    updater.autoInstallOnAppQuit = true

    updater.on('update-available', (info: any) => {
      mainWindow.webContents.send('updater:available', {
        version: info.version,
        releaseNotes: info.releaseNotes
      })
    })

    updater.on('download-progress', (progress: any) => {
      mainWindow.webContents.send('updater:progress', {
        percent: Math.round(progress.percent),
        bytesPerSecond: progress.bytesPerSecond
      })
    })

    updater.on('update-downloaded', () => {
      mainWindow.webContents.send('updater:downloaded')
    })

    updater.on('error', (err: any) => {
      console.error('Auto-updater error:', err?.message)
    })

    // Check silently — don't block startup
    setTimeout(() => {
      updater.checkForUpdates().catch(() => {
        // Silently fail — no internet or no releases yet
      })
    }, 5000)
  } catch {
    // electron-updater not available in dev mode
    console.log('Auto-updater: not available in dev mode')
  }
}

export async function downloadUpdate(): Promise<void> {
  const updater = await getAutoUpdater()
  updater.downloadUpdate()
}

export async function installUpdate(): Promise<void> {
  const updater = await getAutoUpdater()
  updater.quitAndInstall()
}
