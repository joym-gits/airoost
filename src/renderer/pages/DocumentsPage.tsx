export default function DocumentsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Document Chat</h1>
        <p className="text-sm text-gray-400 mb-2">
          Drop any document and chat with it. PDF, Word, text files, spreadsheets.
        </p>
        <p className="text-xs text-gray-600 mb-8">
          Your documents never leave your machine. Not one byte.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm">
          Coming Soon
        </div>
      </div>
    </div>
  )
}
