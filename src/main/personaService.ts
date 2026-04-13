import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

export interface Persona {
  id: string
  name: string
  emoji: string
  systemPrompt: string
  builtin: boolean
}

const BUILTIN_PERSONAS: Persona[] = [
  {
    id: 'general-assistant',
    name: 'General Assistant',
    emoji: '\uD83E\uDD16',
    systemPrompt: 'You are a helpful, concise assistant.',
    builtin: true
  },
  {
    id: 'legal-reviewer',
    name: 'Legal Reviewer',
    emoji: '\u2696\uFE0F',
    systemPrompt: 'You are a senior lawyer. Review text for unusual clauses, liability risks, and ambiguous language. Be precise and flag concerns clearly.',
    builtin: true
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    emoji: '\uD83D\uDCBB',
    systemPrompt: 'You are a senior software engineer. Review code for bugs, security issues, and improvements. Show corrected code.',
    builtin: true
  },
  {
    id: 'medical-summariser',
    name: 'Medical Summariser',
    emoji: '\uD83C\uDFE5',
    systemPrompt: 'You are a medical professional. Summarise clinical content in plain English. Flag anything that requires urgent attention.',
    builtin: true
  },
  {
    id: 'writing-editor',
    name: 'Writing Editor',
    emoji: '\u270D\uFE0F',
    systemPrompt: 'You are an editor. Improve clarity, tone, and flow without changing the author\'s voice.',
    builtin: true
  }
]

let _configDir: string | null = null
function getConfigDir(): string {
  if (!_configDir) {
    _configDir = join(app.getPath('userData'), 'config')
    if (!existsSync(_configDir)) mkdirSync(_configDir, { recursive: true })
  }
  return _configDir
}

function getPersonasFile(): string {
  return join(getConfigDir(), 'personas.json')
}

function loadCustomPersonas(): Persona[] {
  const file = getPersonasFile()
  if (!existsSync(file)) return []
  try {
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
    return []
  }
}

function saveCustomPersonas(personas: Persona[]): void {
  writeFileSync(getPersonasFile(), JSON.stringify(personas, null, 2))
}

export function getAllPersonas(): Persona[] {
  return [...BUILTIN_PERSONAS, ...loadCustomPersonas()]
}

export function getPersonaById(id: string): Persona | null {
  return getAllPersonas().find((p) => p.id === id) ?? null
}

export function createPersona(name: string, emoji: string, systemPrompt: string): Persona {
  const persona: Persona = {
    id: `persona_${Date.now()}`,
    name,
    emoji,
    systemPrompt,
    builtin: false
  }
  const custom = loadCustomPersonas()
  custom.push(persona)
  saveCustomPersonas(custom)
  return persona
}

export function updatePersona(id: string, name: string, emoji: string, systemPrompt: string): Persona | null {
  const custom = loadCustomPersonas()
  const idx = custom.findIndex((p) => p.id === id)
  if (idx === -1) return null
  custom[idx] = { ...custom[idx], name, emoji, systemPrompt }
  saveCustomPersonas(custom)
  return custom[idx]
}

export function deletePersona(id: string): void {
  const custom = loadCustomPersonas().filter((p) => p.id !== id)
  saveCustomPersonas(custom)
}
