import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ChatPage from './pages/ChatPage'
import ModelLibraryPage from './pages/ModelLibraryPage'
import SettingsPage from './pages/SettingsPage'
import DocumentsPage from './pages/DocumentsPage'
import VoicePage from './pages/VoicePage'
import PersonasPage from './pages/PersonasPage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import DashboardPage from './pages/DashboardPage'
import { useAppStore } from './store/appStore'

export default function App() {
  const { fetchInstalled, fetchCatalog, detectHardware } = useAppStore()

  useEffect(() => {
    fetchInstalled()
    fetchCatalog()
    detectHardware()
  }, [fetchInstalled, fetchCatalog, detectHardware])

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
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}
