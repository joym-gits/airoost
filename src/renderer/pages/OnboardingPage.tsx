import { useEffect } from 'react'
import { useOnboardingStore } from '../store/onboardingStore'
import type { OnboardingStep } from '../store/onboardingStore'

export default function OnboardingPage() {
  const { currentStep } = useOnboardingStore()

  return (
    <div className="flex items-center justify-center h-screen bg-surface-dark">
      <div className="w-full max-w-lg px-8">
        {/* Step indicator */}
        <StepIndicator current={currentStep} />

        {/* Step content */}
        <div className="mt-8">
          {currentStep === 'welcome' && <WelcomeStep />}
          {currentStep === 'check-ollama' && <CheckOllamaStep />}
          {currentStep === 'download-model' && <DownloadModelStep />}
          {currentStep === 'ready' && <ReadyStep />}
        </div>
      </div>
    </div>
  )
}

function StepIndicator({ current }: { current: OnboardingStep }) {
  const steps: { key: OnboardingStep; label: string }[] = [
    { key: 'welcome', label: 'Welcome' },
    { key: 'check-ollama', label: 'Engine' },
    { key: 'download-model', label: 'Model' },
    { key: 'ready', label: 'Ready' }
  ]

  const currentIndex = steps.findIndex((s) => s.key === current)

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < currentIndex
                ? 'bg-green-500 text-white'
                : i === currentIndex
                  ? 'bg-accent text-white'
                  : 'bg-white/10 text-gray-500'
            }`}
          >
            {i < currentIndex ? '✓' : i + 1}
          </div>
          <span
            className={`text-xs hidden sm:block ${
              i === currentIndex ? 'text-white' : 'text-gray-500'
            }`}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && <div className="w-8 h-px bg-white/10" />}
        </div>
      ))}
    </div>
  )
}

function WelcomeStep() {
  const { setStep } = useOnboardingStore()

  return (
    <div className="text-center">
      <h1 className="text-5xl font-bold mb-3">
        <span className="text-accent">Air</span>
        <span className="text-white">oost</span>
      </h1>
      <p className="text-lg text-gray-400 mb-2">VLC for AI Models</p>
      <p className="text-sm text-gray-500 mb-10">
        Run powerful AI models locally on your machine. Private, fast, and free.
      </p>

      <div className="space-y-4 text-left bg-surface rounded-xl p-6 border border-white/5 mb-8">
        <Feature icon="🔒" title="100% Private" desc="Your conversations never leave your machine" />
        <Feature icon="⚡" title="Fast & Local" desc="No internet needed once models are downloaded" />
        <Feature icon="🆓" title="Free Forever" desc="Open-source models, no subscriptions" />
      </div>

      <button
        onClick={() => setStep('check-ollama')}
        className="w-full py-3 bg-accent hover:bg-accent-dark rounded-xl text-white font-medium transition-colors"
      >
        Get Started
      </button>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-sm text-white font-medium">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  )
}

function CheckOllamaStep() {
  const { ollamaInstalled, checkOllama, setStep } = useOnboardingStore()

  useEffect(() => {
    checkOllama()
  }, [checkOllama])

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white mb-2">AI Engine Check</h2>
      <p className="text-sm text-gray-500 mb-8">
        Airoost uses Ollama to run AI models locally on your machine.
      </p>

      <div className="bg-surface rounded-xl p-6 border border-white/5 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                ollamaInstalled ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <div className="text-left">
              <p className="text-white text-sm font-medium">Ollama</p>
              <p className="text-xs text-gray-500">Local AI engine</p>
            </div>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full ${
              ollamaInstalled
                ? 'bg-green-500/10 text-green-500'
                : 'bg-red-500/10 text-red-500'
            }`}
          >
            {ollamaInstalled ? 'Running' : 'Not Found'}
          </span>
        </div>
      </div>

      {ollamaInstalled ? (
        <button
          onClick={() => setStep('download-model')}
          className="w-full py-3 bg-accent hover:bg-accent-dark rounded-xl text-white font-medium transition-colors"
        >
          Continue
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Ollama is not running. Please install and start it:
          </p>
          <a
            href="https://ollama.com/download"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 bg-white/10 hover:bg-white/15 rounded-xl text-white font-medium transition-colors text-center"
          >
            Download Ollama
          </a>
          <button
            onClick={checkOllama}
            className="w-full py-3 bg-accent hover:bg-accent-dark rounded-xl text-white font-medium transition-colors"
          >
            Check Again
          </button>
        </div>
      )}
    </div>
  )
}

function DownloadModelStep() {
  const {
    selectedModel,
    modelDownloading,
    modelDownloaded,
    downloadStatus,
    downloadProgress,
    downloadDefaultModel,
    setStep
  } = useOnboardingStore()

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white mb-2">Download Your First Model</h2>
      <p className="text-sm text-gray-500 mb-8">
        We'll download a recommended model so you can start chatting right away.
      </p>

      {/* Model card */}
      <div className="bg-surface rounded-xl p-6 border border-white/5 mb-6 text-left">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white font-semibold">{selectedModel}</h3>
            <p className="text-xs text-gray-500 mt-1">Meta's Llama 3.2 — fast, capable, ~2 GB</p>
          </div>
          <span className="text-xs bg-accent/10 text-accent px-3 py-1 rounded-full">
            Recommended
          </span>
        </div>

        <div className="flex gap-4 text-xs text-gray-500">
          <span>3.2B parameters</span>
          <span>~2 GB download</span>
          <span>General purpose</span>
        </div>
      </div>

      {/* Progress */}
      {modelDownloading && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Downloading...</span>
            <span className="text-sm text-white font-medium">{downloadProgress}%</span>
          </div>
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{downloadStatus}</p>
        </div>
      )}

      {!modelDownloading && !modelDownloaded && (
        <button
          onClick={downloadDefaultModel}
          className="w-full py-3 bg-accent hover:bg-accent-dark rounded-xl text-white font-medium transition-colors"
        >
          Download {selectedModel}
        </button>
      )}

      {modelDownloaded && (
        <button
          onClick={() => setStep('ready')}
          className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-xl text-white font-medium transition-colors"
        >
          Model Ready — Continue
        </button>
      )}
    </div>
  )
}

function ReadyStep() {
  const { completeOnboarding } = useOnboardingStore()

  return (
    <div className="text-center">
      <div className="text-5xl mb-6">🚀</div>
      <h2 className="text-2xl font-bold text-white mb-2">You're All Set!</h2>
      <p className="text-sm text-gray-500 mb-8">
        Everything is configured. Start chatting with your local AI model.
      </p>

      <div className="bg-surface rounded-xl p-5 border border-white/5 mb-8 text-left space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-green-500">✓</span>
          <span className="text-sm text-gray-300">Ollama engine running</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-green-500">✓</span>
          <span className="text-sm text-gray-300">AI model downloaded</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-green-500">✓</span>
          <span className="text-sm text-gray-300">Ready to chat</span>
        </div>
      </div>

      <button
        onClick={completeOnboarding}
        className="w-full py-3 bg-accent hover:bg-accent-dark rounded-xl text-white font-medium transition-colors"
      >
        Launch Airoost
      </button>
    </div>
  )
}
