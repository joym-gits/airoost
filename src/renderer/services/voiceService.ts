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
      'onnx-community/whisper-tiny',
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

  const options: any = {
    return_timestamps: false,
    chunk_length_s: 30
  }
  if (language && language !== 'auto') {
    options.language = language
  }

  const result = await whisperPipeline(audioData, options)
  return result?.text?.trim() ?? ''
}

/**
 * Record audio from the microphone.
 * Returns a controller object to stop recording.
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
  let source: MediaStreamAudioSourceNode | null = null
  let analyser: AnalyserNode | null = null
  let processor: ScriptProcessorNode | null = null
  const chunks: Float32Array[] = []
  let cancelled = false

  const constraints: MediaStreamConstraints = {
    audio: deviceId ? { deviceId: { exact: deviceId } } : true
  }

  const ready = navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    if (cancelled) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }

    mediaStream = stream
    audioContext = new AudioContext({ sampleRate: 16000 })
    source = audioContext.createMediaStreamSource(stream)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    // Provide analyser for waveform visualisation
    if (analyser) onAudioData?.(analyser)

    // Collect audio samples
    processor = audioContext.createScriptProcessor(4096, 1, 1)
    processor.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0)
      chunks.push(new Float32Array(data))
    }
    source.connect(processor)
    processor.connect(audioContext.destination)
  })

  return {
    stop: async () => {
      await ready
      processor?.disconnect()
      source?.disconnect()
      mediaStream?.getTracks().forEach((t) => t.stop())
      await audioContext?.close()

      // Merge chunks into single Float32Array
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
      const merged = new Float32Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        merged.set(chunk, offset)
        offset += chunk.length
      }
      return merged
    },
    cancel: () => {
      cancelled = true
      processor?.disconnect()
      source?.disconnect()
      mediaStream?.getTracks().forEach((t) => t.stop())
      audioContext?.close()
    }
  }
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
