import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { useVoiceStore } from '../store/voiceStore'
import * as voice from '../services/voiceService'

interface VoiceMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function VoicePage() {
  const { installedModels, selectedModelPath, isGenerating, streamingText } = useAppStore()
  const vs = useVoiceStore()

  const [messages, setMessages] = useState<VoiceMessage[]>([])
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)
  const recorderRef = useRef<ReturnType<typeof voice.startRecording> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const ttsRef = useRef<ReturnType<typeof voice.speak> | null>(null)

  const noModels = installedModels.length === 0

  // Load Whisper on mount
  useEffect(() => {
    if (!vs.whisperLoaded && !vs.whisperLoading) {
      vs.setWhisperLoading(true)
      voice.loadWhisperPipeline((progress) => {
        vs.setWhisperLoading(true, progress)
      }).then(() => {
        vs.setWhisperLoaded(true)
        vs.setWhisperLoading(false)
      }).catch((err) => {
        vs.setWhisperError(err?.message ?? 'Failed to load')
        vs.setWhisperLoading(false)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Waveform animation
  useEffect(() => {
    if (!analyserNode || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const draw = () => {
      animId = requestAnimationFrame(draw)
      const bufLen = analyserNode.frequencyBinCount
      const data = new Uint8Array(bufLen)
      analyserNode.getByteTimeDomainData(data)

      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.lineWidth = 2
      ctx.strokeStyle = '#e94560'
      ctx.beginPath()

      const sliceWidth = canvas.width / bufLen
      let x = 0
      for (let i = 0; i < bufLen; i++) {
        const v = data[i] / 128.0
        const y = (v * canvas.height) / 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
    }
    draw()
    return () => cancelAnimationFrame(animId)
  }, [analyserNode])

  // Start recording
  const handleStartRecording = useCallback(() => {
    if (vs.isRecording || !vs.whisperLoaded) return

    vs.setRecording(true)
    vs.setTranscript('')

    const recorder = voice.startRecording(
      vs.settings.inputDeviceId || undefined,
      (analyser) => setAnalyserNode(analyser)
    )
    recorderRef.current = recorder
  }, [vs])

  // Stop recording and transcribe
  const handleStopRecording = useCallback(async () => {
    if (!recorderRef.current) return

    vs.setRecording(false)
    vs.setTranscribing(true)
    setAnalyserNode(null)

    try {
      const audioData = await recorderRef.current.stop()
      recorderRef.current = null

      const text = await voice.transcribe(audioData, vs.settings.language)
      vs.setTranscript(text)
      vs.setTranscribing(false)

      if (!text.trim()) return

      // Add user message
      const userMsg: VoiceMessage = { role: 'user', content: text }
      setMessages((prev) => [...prev, userMsg])

      // Send to LLM
      if (selectedModelPath) {
        const cleanup = window.airoost.onChatToken(() => {})

        try {
          const response = await window.airoost.chat(selectedModelPath, text)
          const assistantMsg: VoiceMessage = { role: 'assistant', content: response }
          setMessages((prev) => [...prev, assistantMsg])

          // Speak the response
          ttsRef.current = voice.speak(
            response,
            vs.settings.ttsVoiceURI || undefined,
            vs.settings.ttsRate
          )
        } finally {
          cleanup()
        }
      }
    } catch (err: any) {
      vs.setTranscript(`Error: ${err?.message ?? 'Transcription failed'}`)
      vs.setTranscribing(false)
    }
  }, [vs, selectedModelPath])

  const handleCancelTTS = () => {
    ttsRef.current?.cancel()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5">
        <h1 className="text-sm font-semibold text-white">Voice Mode</h1>
        {vs.whisperLoaded && (
          <span className="text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Whisper Ready</span>
        )}
        {vs.whisperLoading && (
          <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full">
            Loading Whisper... {vs.whisperProgress}%
          </span>
        )}
        {vs.whisperError && (
          <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">{vs.whisperError}</span>
        )}
        <div className="flex-1" />
        <span className="text-[10px] text-gray-600">
          {vs.settings.language === 'auto' ? 'Auto-detect language' : vs.settings.language}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !vs.isRecording && !vs.isTranscribing && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-500 text-sm mb-2">
              {vs.whisperLoaded ? 'Press the microphone to start talking' :
               vs.whisperLoading ? 'Loading speech recognition model...' :
               'Voice mode requires the Whisper model'}
            </p>
            {vs.whisperLoading && (
              <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${vs.whisperProgress}%` }} />
              </div>
            )}
            {noModels && <p className="text-xs text-gray-600 mt-2">Download an AI model to get voice responses</p>}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-accent text-white rounded-br-md'
                : 'bg-surface text-gray-200 rounded-bl-md'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.role === 'assistant' && (
                <button
                  onClick={handleCancelTTS}
                  className="text-[10px] text-gray-500 hover:text-gray-300 mt-1 transition-colors"
                >
                  Stop speaking
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Streaming */}
        {isGenerating && streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[75%] bg-surface px-4 py-3 rounded-2xl rounded-bl-md text-sm text-gray-200">
              <p className="whitespace-pre-wrap">{streamingText}<span className="animate-pulse text-accent">{'\u258C'}</span></p>
            </div>
          </div>
        )}

        {/* Transcribing indicator */}
        {vs.isTranscribing && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Transcribing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Waveform + Mic */}
      <div className="px-5 py-6 border-t border-white/5">
        {/* Waveform canvas */}
        {vs.isRecording && (
          <div className="mb-4 flex justify-center">
            <canvas ref={canvasRef} width={400} height={60} className="rounded-lg" />
          </div>
        )}

        {/* Transcript preview */}
        {vs.transcript && !vs.isRecording && (
          <p className="text-xs text-gray-400 text-center mb-3 max-w-md mx-auto truncate">
            {vs.isTranscribing ? 'Transcribing...' : `"${vs.transcript}"`}
          </p>
        )}

        {/* Mic button */}
        <div className="flex justify-center">
          <button
            onMouseDown={handleStartRecording}
            onMouseUp={handleStopRecording}
            onMouseLeave={() => { if (vs.isRecording) handleStopRecording() }}
            onTouchStart={handleStartRecording}
            onTouchEnd={handleStopRecording}
            disabled={!vs.whisperLoaded || vs.isTranscribing || isGenerating}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all disabled:opacity-30 ${
              vs.isRecording
                ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/30'
                : 'bg-accent hover:bg-accent-dark hover:scale-105'
            }`}
          >
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[11px] text-gray-600 mt-3">
          {vs.isRecording ? 'Release to send' :
           vs.isTranscribing ? 'Processing speech...' :
           'Hold to speak'}
        </p>
      </div>
    </div>
  )
}
