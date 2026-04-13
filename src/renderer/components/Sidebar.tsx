import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'

const navItems = [
  { path: '/', label: 'Chat', icon: ChatIcon },
  { path: '/models', label: 'Model Library', icon: ModelsIcon },
  { path: '/documents', label: 'Documents', icon: DocsIcon },
  { path: '/personas', label: 'Personas', icon: PersonasIcon },
  { path: '/voice', label: 'Voice', icon: VoiceIcon },
  { path: '/settings', label: 'Settings', icon: SettingsIcon }
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { conversations, activeConversationId, setActiveConversation, createConversation, deleteConversation, installedModels, selectedModelName } = useAppStore()

  const isOnChat = location.pathname === '/'

  return (
    <aside className="w-64 bg-surface flex flex-col border-r border-white/5">
      {/* App logo — draggable region for macOS titlebar */}
      <div className="p-5 pb-3" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <h1 className="text-lg font-bold text-white tracking-tight pl-1">
          <span className="text-accent">Air</span>oost
        </h1>
        <p className="text-[10px] text-gray-600 pl-1 mt-0.5">Your AI. Your machine. Your rules.</p>
      </div>

      {/* Navigation */}
      <nav className="px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon active={isActive} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Chat sessions — only visible on chat page */}
      {isOnChat && (
        <div className="flex-1 mt-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 mb-2">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Conversations</span>
            <button
              onClick={createConversation}
              disabled={installedModels.length === 0}
              className="text-gray-500 hover:text-accent transition-colors disabled:opacity-30"
              title="New chat"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {conversations.map((convo) => (
              <div
                key={convo.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-[12px] transition-colors ${
                  activeConversationId === convo.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
                onClick={() => setActiveConversation(convo.id)}
              >
                {convo.personaEmoji && <span className="shrink-0">{convo.personaEmoji}</span>}
                <span className="flex-1 truncate">{convo.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(convo.id) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer — active model */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <span className="text-[11px] text-gray-500 truncate">
            {selectedModelName ?? 'No model loaded'}
          </span>
        </div>
        <div className="text-[10px] text-gray-700 mt-1">v0.1.0</div>
      </div>
    </aside>
  )
}

// ─── Icons ──────────────────────────────────────────────────────

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={active ? '#e94560' : 'currentColor'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  )
}

function ModelsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={active ? '#e94560' : 'currentColor'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}

function DocsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={active ? '#e94560' : 'currentColor'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function VoiceIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={active ? '#e94560' : 'currentColor'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  )
}

function PersonasIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={active ? '#e94560' : 'currentColor'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
    </svg>
  )
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={active ? '#e94560' : 'currentColor'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
