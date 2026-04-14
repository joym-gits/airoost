import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatPage from './pages/ChatPage'
import ModelLibraryPage from './pages/ModelLibraryPage'
import SettingsPage from './pages/SettingsPage'
import DocumentsPage from './pages/DocumentsPage'
import VoicePage from './pages/VoicePage'
import PersonasPage from './pages/PersonasPage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import DashboardPage from './pages/DashboardPage'
import PromptCoachPage from './pages/PromptCoachPage'
import OnboardingTour from './components/OnboardingTour'
import ShortcutsModal from './components/ShortcutsModal'
import UpdateBanner from './components/UpdateBanner'
import SetupScreen from './components/SetupScreen'
import { useAppStore } from './store/appStore'
import { useThemeStore } from './store/themeStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

export default function App() {
  const { fetchInstalled, fetchCatalog, detectHardware, createConversation,
    regenerateLastResponse, conversations, activeConversationId, setSidebarSearch } = useAppStore()
  const _theme = useThemeStore() // Initialize theme on mount

  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [setupDone, setSetupDone] = useState(false)

  useEffect(() => {
    fetchInstalled()
    fetchCatalog()
    detectHardware()
  }, [fetchInstalled, fetchCatalog, detectHardware])

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onNewConversation: () => createConversation(),
    onSearchFocus: () => {
      setSidebarSearch('')
      // Focus the sidebar search input
      const el = document.querySelector('[data-sidebar-search]') as HTMLInputElement
      el?.focus()
    },
    onRegenerate: () => regenerateLastResponse(),
    onCopyLastResponse: () => {
      const convo = conversations.find((c) => c.id === activeConversationId)
      if (!convo) return
      const lastAssistant = [...convo.messages].reverse().find((m) => m.role === 'assistant')
      if (lastAssistant) navigator.clipboard.writeText(lastAssistant.content)
    },
    onShortcutsHelp: () => setShortcutsOpen((v) => !v),
    onEscape: () => setShortcutsOpen(false)
  })

  return (
    <div className="flex h-screen bg-surface-dark">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/models" element={<ModelLibraryPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/voice" element={<VoicePage />} />
          <Route path="/personas" element={<PersonasPage />} />
          <Route path="/knowledge" element={<KnowledgeBasePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/coach" element={<PromptCoachPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Global overlays */}
      {!setupDone && <SetupScreen onComplete={() => setSetupDone(true)} />}
      <UpdateBanner />
      <OnboardingTour />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}
