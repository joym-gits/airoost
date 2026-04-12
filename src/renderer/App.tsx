import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import HomePage from './pages/HomePage'
import ModelLibraryPage from './pages/ModelLibraryPage'
import ChatPage from './pages/ChatPage'
import SettingsPage from './pages/SettingsPage'
import OnboardingPage from './pages/OnboardingPage'
import { useOnboardingStore } from './store/onboardingStore'

export default function App() {
  const { isFirstLaunch } = useOnboardingStore()

  if (isFirstLaunch) {
    return <OnboardingPage />
  }

  return (
    <div className="flex h-screen bg-surface-dark">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/models" element={<ModelLibraryPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}
