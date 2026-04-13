import { SHORTCUTS } from '../hooks/useKeyboardShortcuts'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ShortcutsModal({ open, onClose }: Props) {
  if (!open) return null

  const isMac = navigator.platform.includes('Mac')
  const modKey = isMac ? '\u2318' : 'Ctrl'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md bg-surface-dark border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-2">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-gray-400">{s.action}</span>
              <div className="flex gap-1">
                {s.keys.map((key, ki) => (
                  <kbd
                    key={ki}
                    className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[11px] text-gray-300 font-mono"
                  >
                    {key === 'Cmd' ? modKey : key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-white/5 text-center">
          <p className="text-[10px] text-gray-600">Press <kbd className="px-1 py-0.5 bg-white/5 rounded text-[10px] font-mono">{modKey}+?</kbd> anytime to see this</p>
        </div>
      </div>
    </div>
  )
}
