import { useState, useEffect } from 'react'

export default function UpdateBanner() {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const cleanupAvailable = window.airoost.onUpdateAvailable(({ version }) => {
      setUpdateVersion(version)
    })
    const cleanupDownloaded = window.airoost.onUpdateDownloaded(() => {
      setDownloading(false)
      setDownloaded(true)
    })
    return () => { cleanupAvailable(); cleanupDownloaded() }
  }, [])

  if (!updateVersion || dismissed) return null

  const handleDownload = async () => {
    setDownloading(true)
    await window.airoost.downloadUpdate()
  }

  const handleInstall = () => {
    window.airoost.installUpdate()
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[90] flex items-center justify-center px-4 py-2 bg-accent/90 text-white text-xs">
      {!downloaded ? (
        <>
          <span>Airoost {updateVersion} is available</span>
          {!downloading ? (
            <button onClick={handleDownload} className="ml-3 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors">
              Update now
            </button>
          ) : (
            <span className="ml-3 animate-pulse">Downloading...</span>
          )}
        </>
      ) : (
        <>
          <span>Update ready — restart to apply</span>
          <button onClick={handleInstall} className="ml-3 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors">
            Restart now
          </button>
        </>
      )}
      <button onClick={() => setDismissed(true)} className="ml-4 text-white/60 hover:text-white transition-colors">
        {'\u2715'}
      </button>
    </div>
  )
}
