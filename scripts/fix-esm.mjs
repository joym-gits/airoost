// Fix electron-vite output for Electron main process compatibility
import { readFileSync, writeFileSync, existsSync } from 'fs'

for (const file of ['out/main/index.js', 'out/preload/index.js', 'out/preload/index.mjs']) {
  if (!existsSync(file)) continue
  let code = readFileSync(file, 'utf-8')
  const before = code

  // Remove node:module polyfill
  code = code.replace(/import\s+__cjs_mod__\s+from\s+["']node:module["'];?\n?/g, '')
  code = code.replace(/const\s+__cjs_mod__\s*=\s*require\(["']node:module["']\);?\n?/g, '')
  code = code.replace(/const\s+require2\s*=\s*__cjs_mod__\.createRequire\([^)]+\);?\n?/g, '')

  // Fix electron namespace require: const electron = require("electron")
  // -> destructure based on actual usage in the file
  if (code.includes('require("electron")') || code.includes("require('electron')")) {
    const usages = new Set()
    for (const m of code.matchAll(/electron\.(\w+)/g)) {
      usages.add(m[1])
    }
    if (usages.size > 0) {
      const names = [...usages].sort()
      code = code.replace(
        /const\s+electron\s*=\s*require\(["']electron["']\);?/,
        `const { ${names.join(', ')} } = require("electron");`
      )
      for (const name of names) {
        code = code.replaceAll(`electron.${name}`, name)
      }
    }
  }

  // Convert ESM imports to CJS requires (for preload .mjs files)
  code = code.replace(/^import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?\s*$/gm, (_, names, mod) => {
    const cleaned = names.split(',').map(n => {
      const parts = n.trim().split(/\s+as\s+/)
      return parts.length === 2 ? `${parts[0].trim()}: ${parts[1].trim()}` : parts[0].trim()
    }).join(', ')
    return `const { ${cleaned} } = require("${mod}");`
  })
  code = code.replace(/^import\s+(\w+)\s+from\s+["']([^"']+)["'];?\s*$/gm,
    (_, name, mod) => `const ${name} = require("${mod}");`)

  // Remove import.meta polyfills (not needed in CJS)
  code = code.replace(/const __filename\s*=\s*import\.meta\.filename;\s*\n?/g, '')
  code = code.replace(/const __dirname\s*=\s*import\.meta\.dirname;\s*\n?/g, '')

  if (code !== before) {
    // Always write as .js
    const outFile = file.replace('.mjs', '.js')
    writeFileSync(outFile, code)
    console.log(`Fixed: ${file}${outFile !== file ? ` -> ${outFile}` : ''}`)
  }
}
