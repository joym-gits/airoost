export interface Recommendation {
  topic: string
  modelName: string
  description: string
  sizeGB: number
  hfUrl: string
  filename: string
  why: (count: number) => string
}

export const RECOMMENDATIONS: Recommendation[] = [
  {
    topic: 'coding',
    modelName: 'Qwen2.5 Coder 7B',
    description: 'Purpose-built for code generation, debugging, and explanation across many languages.',
    sizeGB: 4.4,
    hfUrl: 'https://huggingface.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/Qwen2.5-Coder-7B-Instruct-Q4_K_M.gguf',
    filename: 'Qwen2.5-Coder-7B-Instruct-Q4_K_M.gguf',
    why: (n) => `You asked ${n} coding questions — this model is trained specifically on code.`
  },
  {
    topic: 'coding',
    modelName: 'CodeLlama 7B Instruct',
    description: 'Meta\'s code-focused Llama variant. Excellent for refactoring and code review.',
    sizeGB: 3.8,
    hfUrl: 'https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.Q4_K_M.gguf',
    filename: 'codellama-7b-instruct.Q4_K_M.gguf',
    why: (n) => `${n} of your prompts were about code — CodeLlama is fine-tuned for programming tasks.`
  },
  {
    topic: 'research',
    modelName: 'Llama 3.2 3B Instruct',
    description: 'Strong at summarisation, reading comprehension, and structured analysis.',
    sizeGB: 2.0,
    hfUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    why: (n) => `You had ${n} research-related prompts — Llama 3.2 is strong at summarisation and analysis.`
  },
  {
    topic: 'research',
    modelName: 'Mistral 7B Instruct',
    description: 'Well-rounded, strong at following instructions. Favourite for research workflows.',
    sizeGB: 4.1,
    hfUrl: 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    filename: 'mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    why: (n) => `${n} research-style prompts detected — Mistral excels at structured reasoning.`
  },
  {
    topic: 'writing',
    modelName: 'Gemma 2 2B Instruct',
    description: 'Google\'s compact model — surprisingly polished at editing and rewriting.',
    sizeGB: 1.6,
    hfUrl: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    filename: 'gemma-2-2b-it-Q4_K_M.gguf',
    why: (n) => `${n} of your prompts involved writing or editing — Gemma handles tone and flow well.`
  },
  {
    topic: 'writing',
    modelName: 'Mistral 7B Instruct',
    description: 'Natural, engaging prose. Great for drafting and style adjustments.',
    sizeGB: 4.1,
    hfUrl: 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    filename: 'mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    why: (n) => `Your ${n} writing-focused prompts would benefit from Mistral\'s natural style.`
  },
  {
    topic: 'medical',
    modelName: 'Llama 3.2 3B Instruct',
    description: 'Strong medical summarisation when combined with the Medical Summariser persona.',
    sizeGB: 2.0,
    hfUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    why: (n) => `${n} medical-related prompts — pair this model with the Medical Summariser persona.`
  },
  {
    topic: 'legal',
    modelName: 'Mistral 7B Instruct',
    description: 'Strong at parsing legal language. Pair with the Legal Reviewer persona.',
    sizeGB: 4.1,
    hfUrl: 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    filename: 'mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    why: (n) => `${n} legal-themed prompts — Mistral with the Legal Reviewer persona is a strong combo.`
  },
  {
    topic: 'analysis',
    modelName: 'Qwen2.5 7B Instruct',
    description: 'Strong reasoning and comparison abilities. Great for deep analysis.',
    sizeGB: 4.7,
    hfUrl: 'https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf',
    filename: 'Qwen2.5-7B-Instruct-Q4_K_M.gguf',
    why: (n) => `${n} analytical prompts detected — Qwen2.5 is strong at reasoning.`
  },
  {
    topic: 'default',
    modelName: 'Llama 3.2 1B Instruct',
    description: 'Ultra-light. Runs on anything. Great general-purpose fallback.',
    sizeGB: 0.75,
    hfUrl: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    why: () => `A reliable general-purpose model that runs on any hardware.`
  }
]

/**
 * Pick the top 3 recommendations for a user based on detected topics.
 * Returns unique models (one per model file), prioritising matching topics.
 */
export function recommendModels(
  topicCounts: { topic: string; count: number }[]
): { rec: Recommendation; count: number }[] {
  const picked = new Map<string, { rec: Recommendation; count: number }>()

  for (const { topic, count } of topicCounts) {
    if (count < 2) continue // skip noise
    const match = RECOMMENDATIONS.find((r) => r.topic === topic)
    if (match && !picked.has(match.filename)) {
      picked.set(match.filename, { rec: match, count })
    }
    if (picked.size >= 3) break
  }

  // If nothing matched, show the general fallback
  if (picked.size === 0) {
    const fallback = RECOMMENDATIONS.find((r) => r.topic === 'default')
    if (fallback) picked.set(fallback.filename, { rec: fallback, count: 0 })
  }

  return [...picked.values()]
}
