import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'

export function useKeyboardShortcuts(handlers: {
  onNewConversation?: () => void
  onSearchFocus?: () => void
  onModelSwitcher?: () => void
  onRegenerate?: () => void
  onCopyLastResponse?: () => void
  onEscape?: () => void
  onShortcutsHelp?: () => void
}) {
  const navigate = useNavigate()
  const store = useAppStore

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      // Cmd+N → New conversation
      if (mod && e.key === 'n' && !e.shiftKey) {
        e.preventDefault()
        handlers.onNewConversation?.()
        return
      }

      // Cmd+K → Search conversations
      if (mod && e.key === 'k') {
        e.preventDefault()
        handlers.onSearchFocus?.()
        return
      }

      // Cmd+M → Model switcher
      if (mod && e.key === 'm') {
        e.preventDefault()
        handlers.onModelSwitcher?.()
        return
      }

      // Cmd+L → Model Library
      if (mod && e.key === 'l') {
        e.preventDefault()
        navigate('/models')
        return
      }

      // Cmd+R → Regenerate
      if (mod && e.key === 'r' && !e.shiftKey) {
        e.preventDefault()
        handlers.onRegenerate?.()
        return
      }

      // Cmd+Shift+C → Copy last AI response
      if (mod && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        handlers.onCopyLastResponse?.()
        return
      }

      // Cmd+D → Document Chat
      if (mod && e.key === 'd') {
        e.preventDefault()
        navigate('/documents')
        return
      }

      // Cmd+? or Cmd+/ → Shortcuts help
      if (mod && (e.key === '?' || e.key === '/')) {
        e.preventDefault()
        handlers.onShortcutsHelp?.()
        return
      }

      // Escape → Cancel/close
      if (e.key === 'Escape') {
        handlers.onEscape?.()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handlers, navigate])
}

export const SHORTCUTS = [
  { keys: ['Cmd', 'N'], action: 'New conversation' },
  { keys: ['Cmd', 'K'], action: 'Search conversations' },
  { keys: ['Cmd', 'M'], action: 'Open model switcher' },
  { keys: ['Cmd', 'L'], action: 'Model Library' },
  { keys: ['Cmd', 'R'], action: 'Regenerate last response' },
  { keys: ['Cmd', 'Shift', 'C'], action: 'Copy last AI response' },
  { keys: ['Cmd', 'D'], action: 'Document Chat' },
  { keys: ['Cmd', '?'], action: 'Keyboard shortcuts' },
  { keys: ['Esc'], action: 'Cancel / close modal' }
]
