import { useState, useEffect } from 'react'

interface Props {
  onComplete: () => void
}

export default function SetupScreen({ onComplete }: Props) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Starting Airoost...')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const cleanupProgress = window.airoost.onSetupProgress(({ percent, status: s }) => {
      setProgress(percent)
      setStatus(s)
    })

    const cleanupComplete = window.airoost.onSetupComplete(() => {
      setProgress(100)
      setStatus('Ready!')
      // Small delay so user sees "Ready!" before it disappears
      setTimeout(() => {
        setVisible(false)
        onComplete()
      }, 800)
    })

    // Fallback: if no events arrive within 15s, assume ready
    const fallback = setTimeout(() => {
      setVisible(false)
      onComplete()
    }, 15000)

    return () => {
      cleanupProgress()
      cleanupComplete()
      clearTimeout(fallback)
    }
  }, [onComplete])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-surface-dark">
      <div className="text-center max-w-sm">
        {/* Logo */}
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-accent">Air</span>
          <span className="text-white">oost</span>
        </h1>
        <p className="text-sm text-gray-500 mb-8">Setting up your AI...</p>

        {/* Progress bar */}
        <div className="w-64 mx-auto mb-4">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status text */}
        <p className="text-xs text-gray-600">{status}</p>
      </div>
    </div>
  )
}
