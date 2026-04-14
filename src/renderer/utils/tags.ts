// Fixed palette of tag colors (8 colors cycling)
const PALETTE = [
  { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
  { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30' },
  { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/30' }
]

/**
 * Deterministic color for a tag. Same tag always gets the same color.
 */
export function tagColor(tag: string): typeof PALETTE[number] {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export const PRESET_TAGS = [
  'research', 'analysis', 'coding', 'legal', 'medical', 'writing',
  'summarisation', 'translation', 'fast', 'deep-reasoning',
  'sensitive', 'daily-driver', 'experimental'
]
