import { useState, useRef, useEffect, useMemo } from 'react'
import { tagColor, PRESET_TAGS } from '../utils/tags'

interface Props {
  filename: string
  tags: string[]
  allUserTags: string[]
  onChange: (tags: string[]) => void
  compact?: boolean
}

export default function ModelTagEditor({ filename, tags, allUserTags, onChange, compact }: Props) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  const suggestions = useMemo(() => {
    if (!adding) return []
    const q = value.trim().toLowerCase()
    // Merge user tags + presets, dedupe, exclude already-applied
    const pool = [...new Set([...allUserTags, ...PRESET_TAGS])]
      .filter((t) => !tags.includes(t))
    if (!q) return pool.slice(0, 6)
    return pool.filter((t) => t.includes(q)).slice(0, 6)
  }, [adding, value, allUserTags, tags])

  const handleAdd = async (tag: string) => {
    const clean = tag.trim().toLowerCase()
    if (!clean || tags.includes(clean)) return
    const updated = await window.airoost.modelTagsAdd(filename, clean)
    onChange(updated)
    setValue('')
    setAdding(false)
  }

  const handleRemove = async (tag: string) => {
    const updated = await window.airoost.modelTagsRemove(filename, tag)
    onChange(updated)
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? 'mt-1' : 'mt-2'}`}>
      {tags.map((tag) => {
        const c = tagColor(tag)
        return (
          <span
            key={tag}
            className={`group inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${c.bg} ${c.text} ${c.border}`}
          >
            {tag}
            <button
              onClick={(e) => { e.stopPropagation(); handleRemove(tag) }}
              className="opacity-50 hover:opacity-100 transition-opacity"
              title="Remove tag"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        )
      })}

      {adding ? (
        <div className="inline-flex items-center gap-1 relative" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd(value)
              if (e.key === 'Escape') { setAdding(false); setValue('') }
            }}
            onBlur={() => setTimeout(() => { setAdding(false); setValue('') }, 150)}
            placeholder="tag..."
            className="bg-surface-dark border border-white/10 rounded-full px-2.5 py-0.5 text-[10px] text-white placeholder-gray-600 outline-none focus:border-accent/50 w-24"
          />
          <button
            onClick={() => handleAdd(value)}
            className="text-[10px] text-accent px-1 transition-colors"
          >
            Add
          </button>

          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute top-6 left-0 z-20 min-w-[140px] bg-surface-dark border border-white/10 rounded-lg shadow-xl py-1 max-h-40 overflow-y-auto">
              {suggestions.map((tag) => {
                const c = tagColor(tag)
                return (
                  <button
                    key={tag}
                    onMouseDown={(e) => { e.preventDefault(); handleAdd(tag) }}
                    className="w-full text-left px-2 py-1 hover:bg-white/5 transition-colors"
                  >
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`}>
                      {tag}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setAdding(true) }}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] text-gray-500 hover:text-accent border border-dashed border-white/10 hover:border-accent/30 transition-colors"
        >
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add tag
        </button>
      )}
    </div>
  )
}
