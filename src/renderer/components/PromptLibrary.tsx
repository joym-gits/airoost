import { useState, useEffect, useMemo } from 'react'

const CATEGORY_ICONS: Record<string, string> = {
  Legal: '\u2696\uFE0F',
  Medical: '\uD83C\uDFE5',
  Coding: '\uD83D\uDCBB',
  Writing: '\u270D\uFE0F',
  Research: '\uD83D\uDD2C',
  Business: '\uD83D\uDCBC',
  Custom: '\u2B50'
}

interface PromptLibraryProps {
  open: boolean
  onClose: () => void
  onSelect: (text: string) => void
}

export default function PromptLibrary({ open, onClose, onSelect }: PromptLibraryProps) {
  const [prompts, setPrompts] = useState<PromptData[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<PromptData | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('Custom')
  const [formText, setFormText] = useState('')

  const fetchPrompts = async () => {
    const data = await window.airoost.getPrompts()
    setPrompts(data)
  }

  useEffect(() => {
    if (open) {
      fetchPrompts()
      setSearch('')
      setActiveCategory(null)
      resetForm()
    }
  }, [open])

  const resetForm = () => {
    setFormName('')
    setFormCategory('Custom')
    setFormText('')
    setCreating(false)
    setEditing(null)
  }

  // Derived data
  const categories = useMemo(() => {
    const cats = new Set(prompts.map((p) => p.category))
    return [...cats]
  }, [prompts])

  const filtered = useMemo(() => {
    let result = prompts
    if (activeCategory) {
      result = result.filter((p) => p.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.text.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
    }
    // Favourites first
    return result.sort((a, b) => (b.favourite ? 1 : 0) - (a.favourite ? 1 : 0))
  }, [prompts, search, activeCategory])

  const handleSelect = (text: string) => {
    onSelect(text)
    onClose()
  }

  const handleToggleFav = async (id: string) => {
    await window.airoost.togglePromptFav(id)
    fetchPrompts()
  }

  const handleSave = async () => {
    if (!formName.trim() || !formText.trim()) return
    if (editing) {
      await window.airoost.updatePrompt(editing.id, formName.trim(), formCategory, formText.trim())
    } else {
      await window.airoost.createPrompt(formName.trim(), formCategory, formText.trim())
    }
    resetForm()
    fetchPrompts()
  }

  const handleDelete = async (id: string) => {
    await window.airoost.deletePrompt(id)
    fetchPrompts()
  }

  const startEdit = (p: PromptData) => {
    setFormName(p.name)
    setFormCategory(p.category)
    setFormText(p.text)
    setEditing(p)
    setCreating(false)
  }

  const startCreate = () => {
    resetForm()
    setCreating(true)
  }

  if (!open) return null

  const isFormOpen = creating || editing !== null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] bg-surface-dark border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <h2 className="text-sm font-semibold text-white">Prompt Library</h2>
          </div>
          <div className="flex items-center gap-2">
            {!isFormOpen && (
              <button
                onClick={startCreate}
                className="text-[11px] text-accent hover:text-accent-light px-2 py-1 rounded bg-accent/10 transition-colors"
              >
                + Custom
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-white/5">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompts..."
              className="w-full bg-surface border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-accent/50 transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Category pills */}
        {!isFormOpen && (
          <div className="flex gap-1.5 px-5 py-2.5 overflow-x-auto border-b border-white/5">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                !activeCategory ? 'bg-accent text-white' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  activeCategory === cat ? 'bg-accent text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {CATEGORY_ICONS[cat] ?? '\uD83D\uDCCC'} {cat}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {/* Create/Edit form */}
          {isFormOpen && (
            <div className="mb-4 p-4 rounded-xl bg-surface border border-white/5">
              <h3 className="text-xs font-semibold text-white mb-3">
                {editing ? 'Edit Prompt' : 'New Custom Prompt'}
              </h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Prompt name"
                  className="flex-1 bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-accent/50"
                />
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                >
                  {[...categories, 'Custom'].filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="Prompt text..."
                rows={3}
                className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-accent/50 resize-none mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!formName.trim() || !formText.trim()}
                  className="px-3 py-1.5 bg-accent hover:bg-accent-dark rounded-lg text-white text-[11px] font-medium transition-colors disabled:opacity-50"
                >
                  {editing ? 'Save' : 'Create'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 text-[11px] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Prompt list */}
          {filtered.length === 0 && !isFormOpen && (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500">
                {search ? 'No prompts match your search' : 'No prompts available'}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            {filtered.map((prompt) => (
              <div
                key={prompt.id}
                className="group flex items-start gap-3 p-3 rounded-xl hover:bg-surface border border-transparent hover:border-white/5 cursor-pointer transition-colors"
                onClick={() => handleSelect(prompt.text)}
              >
                {/* Fav star */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleFav(prompt.id) }}
                  className={`shrink-0 mt-0.5 transition-colors ${
                    prompt.favourite ? 'text-yellow-400' : 'text-gray-700 hover:text-yellow-400'
                  }`}
                >
                  {prompt.favourite ? '\u2605' : '\u2606'}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white">{prompt.name}</span>
                    <span className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">
                      {CATEGORY_ICONS[prompt.category] ?? '\uD83D\uDCCC'} {prompt.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate">{prompt.text}</p>
                </div>

                {/* Actions for custom prompts */}
                {!prompt.builtin && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(prompt) }}
                      className="text-[10px] text-gray-600 hover:text-white px-1.5 py-0.5 rounded bg-white/5 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(prompt.id) }}
                      className="text-[10px] text-gray-600 hover:text-red-400 px-1.5 py-0.5 rounded bg-white/5 transition-colors"
                    >
                      Del
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-white/5 text-center">
          <p className="text-[10px] text-gray-600">
            Click any prompt to insert it into your chat input
          </p>
        </div>
      </div>
    </div>
  )
}
