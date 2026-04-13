import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore, type Conversation } from '../store/appStore'

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
  const store = useAppStore()
  const {
    activeConversationId,
    setActiveConversation,
    createConversation,
    deleteConversation,
    renameConversation,
    duplicateConversation,
    moveToFolder,
    addTag,
    removeTag,
    exportConversation,
    installedModels,
    selectedModelName,
    folders,
    createFolder,
    renameFolder,
    deleteFolder,
    activeFolderId,
    setActiveFolderId,
    activeTagFilter,
    setActiveTagFilter,
    sidebarSearch,
    setSidebarSearch,
    getFilteredConversations,
    getAllTags
  } = store

  const isOnChat = location.pathname === '/'
  const filteredConvos = getFilteredConversations()
  const allTags = getAllTags()

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ convo: Conversation; x: number; y: number } | null>(null)
  const [ctxSubMenu, setCtxSubMenu] = useState<'folder' | 'tag' | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [newTagValue, setNewTagValue] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [renameFolderValue, setRenameFolderValue] = useState('')

  const renameRef = useRef<HTMLInputElement>(null)
  const tagRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) renameRef.current?.focus()
  }, [renaming])

  useEffect(() => {
    if (ctxSubMenu === 'tag') setTimeout(() => tagRef.current?.focus(), 50)
  }, [ctxSubMenu])

  // Close context menu on click outside
  useEffect(() => {
    const close = () => setCtxMenu(null)
    if (ctxMenu) window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [ctxMenu])

  const handleContextMenu = (e: React.MouseEvent, convo: Conversation) => {
    e.preventDefault()
    setCtxMenu({ convo, x: e.clientX, y: e.clientY })
    setCtxSubMenu(null)
  }

  const handleRenameSubmit = (id: string) => {
    if (renameValue.trim()) renameConversation(id, renameValue.trim())
    setRenaming(null)
  }

  const handleExport = (id: string, format: 'markdown' | 'text') => {
    const content = exportConversation(id, format)
    if (!content) return
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation.${format === 'markdown' ? 'md' : 'txt'}`
    a.click()
    URL.revokeObjectURL(url)
    setCtxMenu(null)
  }

  const handleAddTag = (convoId: string) => {
    if (newTagValue.trim()) {
      addTag(convoId, newTagValue.trim())
      setNewTagValue('')
    }
  }

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim())
      setNewFolderName('')
      setCreatingFolder(false)
    }
  }

  const handleRenameFolder = (id: string) => {
    if (renameFolderValue.trim()) renameFolder(id, renameFolderValue.trim())
    setRenamingFolder(null)
  }

  return (
    <aside className="w-72 bg-surface flex flex-col border-r border-white/5 select-none">
      {/* App logo */}
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
                isActive ? 'bg-accent/15 text-accent' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon active={isActive} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Chat session management — only on chat page */}
      {isOnChat && (
        <div className="flex-1 mt-3 flex flex-col min-h-0 border-t border-white/5 pt-3">
          {/* Search */}
          <div className="px-3 mb-2">
            <div className="relative">
              <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-surface-dark border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-white placeholder-gray-600 outline-none focus:border-accent/30 transition-colors"
              />
            </div>
          </div>

          {/* Tag chips */}
          {allTags.length > 0 && (
            <div className="px-3 mb-2 flex flex-wrap gap-1">
              {allTags.slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                  className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                    activeTagFilter === tag
                      ? 'bg-accent text-white'
                      : 'bg-white/5 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Folders */}
          <div className="px-3 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Folders</span>
              <button
                onClick={() => setCreatingFolder(true)}
                className="text-gray-600 hover:text-accent transition-colors"
                title="New folder"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>

            {creatingFolder && (
              <div className="flex gap-1 mb-1">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  placeholder="Folder name"
                  autoFocus
                  className="flex-1 bg-surface-dark border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder-gray-600 outline-none"
                />
                <button onClick={handleCreateFolder} className="text-[10px] text-accent">Save</button>
                <button onClick={() => setCreatingFolder(false)} className="text-[10px] text-gray-500">Cancel</button>
              </div>
            )}

            <button
              onClick={() => setActiveFolderId(null)}
              className={`w-full text-left px-2 py-1 rounded text-[11px] transition-colors ${
                !activeFolderId && !activeTagFilter ? 'text-white bg-white/5' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              All Conversations
            </button>

            {folders.map((folder) => {
              const count = store.conversations.filter((c) => c.folderId === folder.id).length
              const isActive = activeFolderId === folder.id

              if (renamingFolder === folder.id) {
                return (
                  <div key={folder.id} className="flex gap-1 my-0.5">
                    <input
                      type="text"
                      value={renameFolderValue}
                      onChange={(e) => setRenameFolderValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder(folder.id)}
                      onBlur={() => handleRenameFolder(folder.id)}
                      autoFocus
                      className="flex-1 bg-surface-dark border border-white/10 rounded px-2 py-1 text-[11px] text-white outline-none"
                    />
                  </div>
                )
              }

              return (
                <div key={folder.id} className="group flex items-center">
                  <button
                    onClick={() => setActiveFolderId(isActive ? null : folder.id)}
                    className={`flex-1 text-left px-2 py-1 rounded text-[11px] transition-colors ${
                      isActive ? 'text-white bg-white/5' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {folder.name} <span className="text-gray-700">{count > 0 ? `(${count})` : ''}</span>
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                    <button
                      onClick={() => { setRenamingFolder(folder.id); setRenameFolderValue(folder.name) }}
                      className="text-gray-600 hover:text-white text-[10px] px-1"
                    >
                      E
                    </button>
                    <button
                      onClick={() => deleteFolder(folder.id)}
                      className="text-gray-600 hover:text-red-400 text-[10px] px-1"
                    >
                      X
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* New chat button */}
          <div className="px-3 mb-2">
            <button
              onClick={createConversation}
              disabled={installedModels.length === 0}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-[11px] font-medium hover:bg-accent/20 transition-colors disabled:opacity-30"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Chat
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {filteredConvos.map((convo) => {
              const isActive = activeConversationId === convo.id

              if (renaming === convo.id) {
                return (
                  <div key={convo.id} className="px-2 py-1.5">
                    <input
                      ref={renameRef}
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(convo.id)
                        if (e.key === 'Escape') setRenaming(null)
                      }}
                      onBlur={() => handleRenameSubmit(convo.id)}
                      className="w-full bg-surface-dark border border-accent/50 rounded px-2 py-1 text-[11px] text-white outline-none"
                    />
                  </div>
                )
              }

              return (
                <div
                  key={convo.id}
                  className={`group px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                    isActive ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                  onClick={() => setActiveConversation(convo.id)}
                  onContextMenu={(e) => handleContextMenu(e, convo)}
                >
                  {/* Title row */}
                  <div className="flex items-center gap-1.5">
                    {convo.personaEmoji && <span className="text-[11px]">{convo.personaEmoji}</span>}
                    <span className={`flex-1 truncate text-[12px] ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {convo.title}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleContextMenu(e, convo) }}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-white transition-all shrink-0"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  </div>
                  {/* Meta row */}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-600">
                      {formatDate(convo.updatedAt)}
                    </span>
                    <span className="text-[10px] text-gray-700 bg-white/5 px-1 rounded">
                      {convo.modelId}
                    </span>
                  </div>
                  {/* Tags */}
                  {convo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {convo.tags.map((tag) => (
                        <span key={tag} className="text-[9px] text-accent/70 bg-accent/10 px-1.5 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
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

      {/* Context Menu */}
      {ctxMenu && (
        <ContextMenu
          convo={ctxMenu.convo}
          x={ctxMenu.x}
          y={ctxMenu.y}
          subMenu={ctxSubMenu}
          setSubMenu={setCtxSubMenu}
          folders={folders}
          allTags={allTags}
          newTagValue={newTagValue}
          setNewTagValue={setNewTagValue}
          tagRef={tagRef}
          onRename={() => {
            setRenaming(ctxMenu.convo.id)
            setRenameValue(ctxMenu.convo.title)
            setCtxMenu(null)
          }}
          onMoveToFolder={(folderId) => {
            moveToFolder(ctxMenu.convo.id, folderId)
            setCtxMenu(null)
          }}
          onAddTag={() => handleAddTag(ctxMenu.convo.id)}
          onRemoveTag={(tag) => removeTag(ctxMenu.convo.id, tag)}
          onExportMd={() => handleExport(ctxMenu.convo.id, 'markdown')}
          onExportTxt={() => handleExport(ctxMenu.convo.id, 'text')}
          onDuplicate={() => { duplicateConversation(ctxMenu.convo.id); setCtxMenu(null) }}
          onDelete={() => { deleteConversation(ctxMenu.convo.id); setCtxMenu(null) }}
        />
      )}
    </aside>
  )
}

// ─── Context Menu Component ──────────────────────────────────────

function ContextMenu({
  convo, x, y, subMenu, setSubMenu, folders, allTags, newTagValue, setNewTagValue, tagRef,
  onRename, onMoveToFolder, onAddTag, onRemoveTag, onExportMd, onExportTxt, onDuplicate, onDelete
}: {
  convo: Conversation
  x: number; y: number
  subMenu: 'folder' | 'tag' | null
  setSubMenu: (s: 'folder' | 'tag' | null) => void
  folders: { id: string; name: string }[]
  allTags: string[]
  newTagValue: string
  setNewTagValue: (v: string) => void
  tagRef: React.RefObject<HTMLInputElement>
  onRename: () => void
  onMoveToFolder: (folderId: string | null) => void
  onAddTag: () => void
  onRemoveTag: (tag: string) => void
  onExportMd: () => void
  onExportTxt: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - 300),
    zIndex: 100
  }

  return (
    <div style={menuStyle} className="w-48 bg-surface-dark border border-white/10 rounded-xl shadow-2xl py-1 text-[11px]" onClick={(e) => e.stopPropagation()}>
      {!subMenu && (
        <>
          <MenuItem label="Rename" onClick={onRename} />
          <MenuItem label="Move to Folder \u25B6" onClick={() => setSubMenu('folder')} />
          <MenuItem label="Add Tags \u25B6" onClick={() => setSubMenu('tag')} />
          <div className="border-t border-white/5 my-1" />
          <MenuItem label="Export as Markdown" onClick={onExportMd} />
          <MenuItem label="Export as Text" onClick={onExportTxt} />
          <div className="border-t border-white/5 my-1" />
          <MenuItem label="Duplicate" onClick={onDuplicate} />
          <MenuItem label="Delete" onClick={onDelete} danger />
        </>
      )}

      {subMenu === 'folder' && (
        <>
          <MenuItem label="\u2190 Back" onClick={() => setSubMenu(null)} />
          <div className="border-t border-white/5 my-1" />
          <MenuItem
            label="No Folder"
            onClick={() => onMoveToFolder(null)}
            active={convo.folderId === null}
          />
          {folders.map((f) => (
            <MenuItem
              key={f.id}
              label={f.name}
              onClick={() => onMoveToFolder(f.id)}
              active={convo.folderId === f.id}
            />
          ))}
        </>
      )}

      {subMenu === 'tag' && (
        <>
          <MenuItem label="\u2190 Back" onClick={() => setSubMenu(null)} />
          <div className="border-t border-white/5 my-1" />
          <div className="px-2 py-1">
            <div className="flex gap-1">
              <input
                ref={tagRef}
                type="text"
                value={newTagValue}
                onChange={(e) => setNewTagValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onAddTag()}
                placeholder="#tag"
                className="flex-1 bg-surface border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder-gray-600 outline-none"
              />
              <button onClick={onAddTag} className="text-accent text-[10px]">Add</button>
            </div>
          </div>
          {/* Existing tags on this conversation */}
          {convo.tags.map((tag) => (
            <div key={tag} className="flex items-center justify-between px-3 py-1">
              <span className="text-accent text-[11px]">#{tag}</span>
              <button onClick={() => onRemoveTag(tag)} className="text-gray-600 hover:text-red-400 text-[10px]">Remove</button>
            </div>
          ))}
          {/* Suggest existing tags */}
          {allTags.filter((t) => !convo.tags.includes(t)).slice(0, 5).map((tag) => (
            <MenuItem key={tag} label={`#${tag}`} onClick={() => { setNewTagValue(tag); onAddTag() }} />
          ))}
        </>
      )}
    </div>
  )
}

function MenuItem({ label, onClick, danger, active }: { label: string; onClick: () => void; danger?: boolean; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 transition-colors ${
        danger ? 'text-red-400 hover:bg-red-500/10' :
        active ? 'text-accent bg-accent/10' :
        'text-gray-300 hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  )
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return d.toLocaleDateString('en', { weekday: 'short' })
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
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

function PersonasIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={active ? '#e94560' : 'currentColor'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
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

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={active ? '#e94560' : 'currentColor'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
