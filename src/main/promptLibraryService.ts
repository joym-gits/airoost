import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

export interface Prompt {
  id: string
  name: string
  category: string
  text: string
  favourite: boolean
  builtin: boolean
}

const BUILTIN_PROMPTS: Prompt[] = [
  // Legal
  { id: 'legal-1', name: 'Review liability terms', category: 'Legal', text: 'Review this contract clause for unusual liability terms', favourite: false, builtin: true },
  { id: 'legal-2', name: 'Summarise agreement', category: 'Legal', text: 'Summarise this agreement in plain English', favourite: false, builtin: true },
  { id: 'legal-3', name: 'Key obligations', category: 'Legal', text: 'What are the key obligations of each party in this text?', favourite: false, builtin: true },
  // Medical
  { id: 'med-1', name: 'Summarise clinical study', category: 'Medical', text: 'Summarise this clinical study for a non-medical audience', favourite: false, builtin: true },
  { id: 'med-2', name: 'Key findings & limitations', category: 'Medical', text: 'What are the key findings and limitations of this research?', favourite: false, builtin: true },
  { id: 'med-3', name: 'Explain medical term', category: 'Medical', text: 'Explain this medical term in simple language', favourite: false, builtin: true },
  // Coding
  { id: 'code-1', name: 'Review code', category: 'Coding', text: 'Review this code for bugs and security vulnerabilities', favourite: false, builtin: true },
  { id: 'code-2', name: 'Refactor code', category: 'Coding', text: 'Refactor this code for readability and performance', favourite: false, builtin: true },
  { id: 'code-3', name: 'Write unit tests', category: 'Coding', text: 'Write unit tests for this function', favourite: false, builtin: true },
  { id: 'code-4', name: 'Explain code', category: 'Coding', text: 'Explain what this code does line by line', favourite: false, builtin: true },
  // Writing
  { id: 'write-1', name: 'Edit for clarity', category: 'Writing', text: 'Edit this paragraph for clarity and conciseness', favourite: false, builtin: true },
  { id: 'write-2', name: 'Professional tone', category: 'Writing', text: 'Rewrite this in a more professional tone', favourite: false, builtin: true },
  { id: 'write-3', name: 'Summarise in bullets', category: 'Writing', text: 'Summarise this in 3 bullet points', favourite: false, builtin: true },
  // Research
  { id: 'res-1', name: 'Key arguments', category: 'Research', text: 'What are the key arguments in this text?', favourite: false, builtin: true },
  { id: 'res-2', name: 'Evidence analysis', category: 'Research', text: 'What evidence supports and contradicts this claim?', favourite: false, builtin: true },
  { id: 'res-3', name: 'Create outline', category: 'Research', text: 'Create a structured outline from this content', favourite: false, builtin: true },
  // Business
  { id: 'biz-1', name: 'Identify risks', category: 'Business', text: 'Identify risks in this proposal', favourite: false, builtin: true },
  { id: 'biz-2', name: 'Executive summary', category: 'Business', text: 'Write an executive summary of this document', favourite: false, builtin: true },
  { id: 'biz-3', name: 'Questions to ask', category: 'Business', text: 'What questions should I ask before agreeing to this?', favourite: false, builtin: true }
]

let _configDir: string | null = null
function getConfigDir(): string {
  if (!_configDir) {
    _configDir = join(app.getPath('userData'), 'config')
    if (!existsSync(_configDir)) mkdirSync(_configDir, { recursive: true })
  }
  return _configDir
}

function getPromptsFile(): string {
  return join(getConfigDir(), 'prompts.json')
}

function loadCustomPrompts(): Prompt[] {
  const file = getPromptsFile()
  if (!existsSync(file)) return []
  try {
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
    return []
  }
}

function saveCustomPrompts(prompts: Prompt[]): void {
  writeFileSync(getPromptsFile(), JSON.stringify(prompts, null, 2))
}

// Track favourited built-in IDs separately
function getFavouritesFile(): string {
  return join(getConfigDir(), 'prompt-favourites.json')
}

function loadFavourites(): Set<string> {
  const file = getFavouritesFile()
  if (!existsSync(file)) return new Set()
  try {
    return new Set(JSON.parse(readFileSync(file, 'utf-8')))
  } catch {
    return new Set()
  }
}

function saveFavourites(favs: Set<string>): void {
  writeFileSync(getFavouritesFile(), JSON.stringify([...favs]))
}

export function getAllPrompts(): Prompt[] {
  const favs = loadFavourites()
  const builtins = BUILTIN_PROMPTS.map((p) => ({ ...p, favourite: favs.has(p.id) }))
  const custom = loadCustomPrompts()
  return [...builtins, ...custom]
}

export function createPrompt(name: string, category: string, text: string): Prompt {
  const prompt: Prompt = {
    id: `prompt_${Date.now()}`,
    name,
    category,
    text,
    favourite: false,
    builtin: false
  }
  const custom = loadCustomPrompts()
  custom.push(prompt)
  saveCustomPrompts(custom)
  return prompt
}

export function updatePrompt(id: string, name: string, category: string, text: string): Prompt | null {
  const custom = loadCustomPrompts()
  const idx = custom.findIndex((p) => p.id === id)
  if (idx === -1) return null
  custom[idx] = { ...custom[idx], name, category, text }
  saveCustomPrompts(custom)
  return custom[idx]
}

export function deletePrompt(id: string): void {
  const custom = loadCustomPrompts().filter((p) => p.id !== id)
  saveCustomPrompts(custom)
}

export function toggleFavourite(id: string): boolean {
  // Check custom prompts first
  const custom = loadCustomPrompts()
  const customIdx = custom.findIndex((p) => p.id === id)
  if (customIdx !== -1) {
    custom[customIdx].favourite = !custom[customIdx].favourite
    saveCustomPrompts(custom)
    return custom[customIdx].favourite
  }

  // Built-in prompt — toggle in favourites file
  const favs = loadFavourites()
  if (favs.has(id)) {
    favs.delete(id)
  } else {
    favs.add(id)
  }
  saveFavourites(favs)
  return favs.has(id)
}
