import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

type TagMap = Record<string, string[]>

function getTagsFile(): string {
  const dir = join(app.getPath('userData'), 'config')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'modelTags.json')
}

function load(): TagMap {
  const file = getTagsFile()
  if (!existsSync(file)) return {}
  try { return JSON.parse(readFileSync(file, 'utf-8')) } catch { return {} }
}

function save(tags: TagMap): void {
  writeFileSync(getTagsFile(), JSON.stringify(tags, null, 2))
}

function normalize(tag: string): string {
  return tag.trim().toLowerCase()
}

export function getAllTags(): TagMap {
  return load()
}

export function getTagsForModel(filename: string): string[] {
  return load()[filename] ?? []
}

export function addTagToModel(filename: string, tag: string): string[] {
  const clean = normalize(tag)
  if (!clean) return getTagsForModel(filename)
  const all = load()
  const existing = all[filename] ?? []
  if (!existing.includes(clean)) {
    existing.push(clean)
    all[filename] = existing
    save(all)
  }
  return existing
}

export function removeTagFromModel(filename: string, tag: string): string[] {
  const clean = normalize(tag)
  const all = load()
  if (all[filename]) {
    all[filename] = all[filename].filter((t) => t !== clean)
    if (all[filename].length === 0) delete all[filename]
    save(all)
  }
  return all[filename] ?? []
}

/**
 * Aggregate unique tags across all models with counts.
 */
export function getTagSummary(): { tag: string; count: number }[] {
  const all = load()
  const counts = new Map<string, number>()
  for (const tags of Object.values(all)) {
    for (const t of tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}
