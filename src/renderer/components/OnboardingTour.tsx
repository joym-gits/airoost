import { useState, useEffect } from 'react'

const ONBOARDING_KEY = 'airoost_onboarding_done'

const STEPS = [
  {
    title: 'Chat is ready',
    description: 'Just start typing — your AI model is loaded and ready to go.',
    icon: '\uD83D\uDCAC'
  },
  {
    title: 'Explore more models',
    description: 'Browse and download powerful models from the Model Library in the sidebar.',
    icon: '\uD83D\uDCE6'
  },
  {
    title: 'Your data stays here',
    description: 'Everything runs locally on your machine. Zero bytes sent to the cloud, ever.',
    icon: '\uD83D\uDD12'
  }
]

export default function OnboardingTour() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY) !== 'true') {
      // Small delay so the app renders first
      setTimeout(() => setVisible(true), 1500)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setVisible(false)
  }

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1)
    else dismiss()
  }

  if (!visible) return null

  const current = STEPS[step]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm bg-surface-dark border border-white/10 rounded-2xl shadow-2xl p-6 text-center">
        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-accent' : i < step ? 'bg-accent/40' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        <div className="text-4xl mb-4">{current.icon}</div>
        <h2 className="text-lg font-semibold text-white mb-2">{current.title}</h2>
        <p className="text-sm text-gray-400 mb-6">{current.description}</p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={dismiss}
            className="px-4 py-2 text-xs text-gray-500 hover:text-white transition-colors"
          >
            Skip
          </button>
          <button
            onClick={next}
            className="px-6 py-2 bg-accent hover:bg-accent-dark rounded-lg text-white text-xs font-medium transition-colors"
          >
            {step < STEPS.length - 1 ? 'Next' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  )
}
