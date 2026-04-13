// Dev script: watches for electron-vite rebuilds and patches the output
import { watch } from 'fs'
import { execSync } from 'child_process'
import { spawn } from 'child_process'

// First build and fix
execSync('npx electron-vite build', { stdio: 'inherit' })
execSync('node scripts/fix-esm.mjs', { stdio: 'inherit' })

// Start vite dev server for renderer
const vite = spawn('npx', ['vite', '--config', 'electron-vite.config.ts', '--port', '5173'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: { ...process.env }
})

// Start electron with the pre-built main process
setTimeout(() => {
  const electron = spawn('npx', ['electron', '.'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '', ELECTRON_RENDERER_URL: 'http://localhost:5173/' }
  })

  electron.on('close', () => {
    vite.kill()
    process.exit(0)
  })
}, 3000)

process.on('SIGINT', () => {
  vite.kill()
  process.exit(0)
})
