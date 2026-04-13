import { useState, useEffect } from 'react'

const EMOJI_OPTIONS = [
  '\uD83E\uDD16', '\uD83E\uDDD1\u200D\uD83D\uDCBB', '\u2696\uFE0F', '\uD83C\uDFE5', '\u270D\uFE0F',
  '\uD83D\uDE80', '\uD83C\uDFA8', '\uD83D\uDD2C', '\uD83D\uDCDA', '\uD83C\uDF0D',
  '\uD83D\uDCA1', '\uD83D\uDEE1\uFE0F', '\uD83C\uDFAF', '\uD83E\uDDE0', '\uD83D\uDCAC',
  '\uD83D\uDD25', '\u2B50', '\uD83C\uDF1F', '\uD83E\uDDD9', '\uD83E\uDD13'
]

export default function PersonasPage() {
  const [personas, setPersonas] = useState<PersonaData[]>([])
  const [editing, setEditing] = useState<PersonaData | null>(null)
  const [creating, setCreating] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmoji, setFormEmoji] = useState(EMOJI_OPTIONS[0])
  const [formPrompt, setFormPrompt] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const fetchPersonas = async () => {
    const data = await window.airoost.getPersonas()
    setPersonas(data)
  }

  useEffect(() => {
    fetchPersonas()
  }, [])

  const resetForm = () => {
    setFormName('')
    setFormEmoji(EMOJI_OPTIONS[0])
    setFormPrompt('')
    setCreating(false)
    setEditing(null)
    setShowEmojiPicker(false)
  }

  const startCreate = () => {
    resetForm()
    setCreating(true)
  }

  const startEdit = (p: PersonaData) => {
    setFormName(p.name)
    setFormEmoji(p.emoji)
    setFormPrompt(p.systemPrompt)
    setEditing(p)
    setCreating(false)
    setShowEmojiPicker(false)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formPrompt.trim()) return

    if (editing) {
      await window.airoost.updatePersona(editing.id, formName.trim(), formEmoji, formPrompt.trim())
    } else {
      await window.airoost.createPersona(formName.trim(), formEmoji, formPrompt.trim())
    }
    resetForm()
    fetchPersonas()
  }

  const handleDelete = async (id: string) => {
    await window.airoost.deletePersona(id)
    fetchPersonas()
  }

  const isFormOpen = creating || editing !== null
  const builtins = personas.filter((p) => p.builtin)
  const custom = personas.filter((p) => !p.builtin)

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Personas</h1>
            <p className="text-xs text-gray-500 mt-1">
              System prompts that shape how the AI responds
            </p>
          </div>
          {!isFormOpen && (
            <button
              onClick={startCreate}
              className="px-4 py-2 bg-accent hover:bg-accent-dark rounded-lg text-white text-xs font-medium transition-colors"
            >
              + New Persona
            </button>
          )}
        </div>

        {/* ── Create / Edit Form ── */}
        {isFormOpen && (
          <div className="mb-8 p-5 rounded-xl bg-surface border border-white/5">
            <h2 className="text-sm font-semibold text-white mb-4">
              {editing ? 'Edit Persona' : 'Create Persona'}
            </h2>

            {/* Emoji + Name row */}
            <div className="flex gap-3 mb-4">
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl hover:border-accent/50 transition-colors"
                >
                  {formEmoji}
                </button>
                {showEmojiPicker && (
                  <div className="absolute top-14 left-0 z-50 p-2 bg-surface-dark border border-white/10 rounded-xl shadow-xl grid grid-cols-5 gap-1">
                    {EMOJI_OPTIONS.map((e) => (
                      <button
                        key={e}
                        onClick={() => { setFormEmoji(e); setShowEmojiPicker(false) }}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg hover:bg-white/10 transition-colors ${
                          formEmoji === e ? 'bg-accent/20' : ''
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Persona name"
                className="flex-1 bg-surface-dark border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            {/* System prompt */}
            <textarea
              value={formPrompt}
              onChange={(e) => setFormPrompt(e.target.value)}
              placeholder="System prompt — instructions that define how the AI behaves..."
              rows={4}
              className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 outline-none focus:border-accent/50 transition-colors resize-none mb-4"
            />

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!formName.trim() || !formPrompt.trim()}
                className="px-4 py-2 bg-accent hover:bg-accent-dark rounded-lg text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {editing ? 'Save Changes' : 'Create Persona'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Built-in Personas ── */}
        <section className="mb-8">
          <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Built-in
          </h2>
          <div className="grid gap-2">
            {builtins.map((p) => (
              <PersonaCard key={p.id} persona={p} onEdit={undefined} onDelete={undefined} />
            ))}
          </div>
        </section>

        {/* ── Custom Personas ── */}
        <section>
          <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Custom
          </h2>
          {custom.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 mb-3">No custom personas yet</p>
              {!isFormOpen && (
                <button
                  onClick={startCreate}
                  className="text-xs text-accent hover:text-accent-light transition-colors"
                >
                  Create your first persona
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-2">
              {custom.map((p) => (
                <PersonaCard
                  key={p.id}
                  persona={p}
                  onEdit={() => startEdit(p)}
                  onDelete={() => handleDelete(p.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function PersonaCard({
  persona,
  onEdit,
  onDelete
}: {
  persona: PersonaData
  onEdit: (() => void) | undefined
  onDelete: (() => void) | undefined
}) {
  return (
    <div className="group flex items-start gap-3 p-4 rounded-xl bg-surface border border-white/5">
      <span className="text-2xl shrink-0 mt-0.5">{persona.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white">{persona.name}</h3>
          {persona.builtin && (
            <span className="text-[10px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded">Built-in</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{persona.systemPrompt}</p>
      </div>
      {!persona.builtin && (
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-[11px] text-gray-500 hover:text-white px-2 py-1 rounded bg-white/5 transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-[11px] text-gray-500 hover:text-red-400 px-2 py-1 rounded bg-white/5 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
