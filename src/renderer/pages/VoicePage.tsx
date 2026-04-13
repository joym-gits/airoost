export default function VoicePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Voice Mode</h1>
        <p className="text-sm text-gray-400 mb-2">
          Talk to your AI with your voice. Entirely offline using local speech-to-text.
        </p>
        <p className="text-xs text-gray-600 mb-8">
          Powered by Whisper. No cloud transcription.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm">
          Coming Soon
        </div>
      </div>
    </div>
  )
}
