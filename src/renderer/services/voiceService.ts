/**
 * Voice service — handles recording, Whisper transcription, and TTS.
 * Runs entirely in the renderer process (needs browser APIs).
 */

let whisperPipeline: any = null
let pipelineLoading = false
let pipelineError: string | null = null

/**
 * Load the Whisper model pipeline. Downloads on first use (~40MB for tiny).
 * Caches to IndexedDB after first download.
 */
export async function loadWhisperPipeline(
  onProgress?: (progress: number) => void
): Promise<void> {
  if (whisperPipeline) return
  if (pipelineLoading) return

  pipelineLoading = true
  pipelineError = null

  try {
    // Dynamic import to prevent Vite from bundling at compile time
    const { pipeline } = await import('@huggingface/transformers')

    whisperPipeline = await pipeline(
      'automatic-speech-recognition',
      'onnx-community/whisper-base',
      {
        dtype: 'q8',
        device: 'auto',
        progress_callback: (p: any) => {
          if (p.progress !== undefined) {
            onProgress?.(Math.round(p.progress))
          }
        }
      }
    )
  } catch (err: any) {
    pipelineError = err?.message ?? 'Failed to load Whisper model'
    throw err
  } finally {
    pipelineLoading = false
  }
}

export function isWhisperLoaded(): boolean {
  return whisperPipeline !== null
}

export function isWhisperLoading(): boolean {
  return pipelineLoading
}

export function getWhisperError(): string | null {
  return pipelineError
}

/**
 * Transcribe audio buffer using Whisper.
 */
export async function transcribe(
  audioData: Float32Array,
  language?: string
): Promise<string> {
  if (!whisperPipeline) {
    throw new Error('Whisper model not loaded')
  }

  // Skip if audio is empty or too short (< 0.5 seconds at 16kHz)
  if (!audioData || audioData.length < 8000) {
    console.log('Voice: audio too short, skipping transcription')
    return ''
  }

  const options: any = {
    return_timestamps: false,
    chunk_length_s: 30
  }
  if (language && language !== 'auto') {
    options.language = language
  }

  const result = await whisperPipeline(audioData, options)
  const text = result?.text?.trim() ?? ''

  // Filter out common Whisper hallucinations on near-silence
  const hallucinations = ['you', 'thank you', 'thanks for watching', 'subscribe', 'bye', '...']
  if (hallucinations.includes(text.toLowerCase())) {
    console.log('Voice: filtered likely hallucination:', text)
    return ''
  }

  return text
}

/**
 * Resample audio buffer to 16kHz mono Float32Array (what Whisper needs).
 */
async function resampleTo16kHz(audioBuffer: AudioBuffer): Promise<Float32Array> {
  const targetSampleRate = 16000
  const numSamples = Math.round(audioBuffer.duration * targetSampleRate)
  const offlineCtx = new OfflineAudioContext(1, numSamples, targetSampleRate)
  const source = offlineCtx.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offlineCtx.destination)
  source.start(0)
  const rendered = await offlineCtx.startRendering()
  return rendered.getChannelData(0)
}

/**
 * Record audio from the microphone using MediaRecorder.
 * Returns a controller object to stop recording and get 16kHz Float32Array.
 */
export function startRecording(
  deviceId?: string,
  onAudioData?: (analyser: AnalyserNode) => void
): {
  stop: () => Promise<Float32Array>
  cancel: () => void
} {
  let audioContext: AudioContext | null = null
  let mediaStream: MediaStream | null = null
  let mediaRecorder: MediaRecorder | null = null
  let analyser: AnalyserNode | null = null
  const blobChunks: Blob[] = []
  let cancelled = false

  const constraints: MediaStreamConstraints = {
    audio: deviceId
      ? { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true }
      : { echoCancellation: true, noiseSuppression: true }
  }

  const ready = navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    if (cancelled) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }

    mediaStream = stream

    // Set up analyser for waveform (at native sample rate — just for visuals)
    audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    onAudioData?.(analyser)

    // Record with MediaRecorder (captures at native quality)
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) blobChunks.push(e.data)
    }
    mediaRecorder.start(100) // collect in 100ms chunks for responsiveness
  })

  return {
    stop: async () => {
      await ready
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        return new Float32Array(0)
      }

      // Stop recording and collect final data
      const stopped = new Promise<void>((resolve) => {
        mediaRecorder!.onstop = () => resolve()
      })
      mediaRecorder.stop()
      await stopped

      // Clean up streams
      mediaStream?.getTracks().forEach((t) => t.stop())

      // Decode the recorded audio blob to AudioBuffer
      const blob = new Blob(blobChunks, { type: 'audio/webm' })
      const arrayBuffer = await blob.arrayBuffer()

      // Use a fresh AudioContext to decode (at native sample rate)
      const decodeCtx = new AudioContext()
      const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer)
      await decodeCtx.close()
      await audioContext?.close()

      // Check if audio has actual content (not silence)
      const rawData = audioBuffer.getChannelData(0)
      const rms = Math.sqrt(rawData.reduce((sum, v) => sum + v * v, 0) / rawData.length)
      if (rms < 0.005) {
        // Audio is essentially silence
        console.log('Voice: audio too quiet (RMS:', rms, '), skipping transcription')
        return new Float32Array(0)
      }

      // Resample to 16kHz for Whisper
      return resampleTo16kHz(audioBuffer)
    },
    cancel: () => {
      cancelled = true
      mediaRecorder?.stop()
      mediaStream?.getTracks().forEach((t) => t.stop())
      audioContext?.close()
    }
  }
}

/**
 * Find the best natural-sounding voice available on the system.
 * Prefers enhanced/premium voices, then English voices, then default.
 */
function pickBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null

  // Preferred natural voices on macOS (sorted by quality)
  const preferred = [
    'Samantha', 'Karen', 'Daniel', 'Zoe', 'Alex',
    'Moira', 'Tessa', 'Fiona', 'Rishi'
  ]

  // Try preferred voices first
  for (const name of preferred) {
    const match = voices.find((v) => v.name.includes(name) && v.lang.startsWith('en'))
    if (match) return match
  }

  // Try any English voice with "enhanced" or "premium" in the name
  const enhanced = voices.find((v) =>
    v.lang.startsWith('en') &&
    (v.name.toLowerCase().includes('enhanced') || v.name.toLowerCase().includes('premium'))
  )
  if (enhanced) return enhanced

  // Any English voice
  const english = voices.find((v) => v.lang.startsWith('en'))
  if (english) return english

  return voices[0]
}

/**
 * Speak text using the system's built-in TTS.
 */
export function speak(
  text: string,
  voiceURI?: string,
  rate: number = 1.0
): { cancel: () => void } {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = rate

  if (voiceURI) {
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find((v) => v.voiceURI === voiceURI)
    if (voice) utterance.voice = voice
  } else {
    // Auto-select a natural voice if none specified
    const best = pickBestVoice()
    if (best) utterance.voice = best
  }

  window.speechSynthesis.speak(utterance)

  return {
    cancel: () => window.speechSynthesis.cancel()
  }
}

/**
 * Get available system TTS voices.
 */
export function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices()
}

/**
 * Get available audio input devices.
 */
export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === 'audioinput')
}

/**
 * Get available audio output devices.
 */
export async function getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === 'audiooutput')
}
