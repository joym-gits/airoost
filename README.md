# Airoost

**The VLC of AI.** Run any AI model on your computer. No internet. No account. No data leaving your machine.

## What is Airoost?

Airoost is a cross-platform desktop application that lets anyone — technical or not — run open-source AI models locally. Chat is open and working within 60 seconds of installation.

**Three principles:**
1. **It just works** — Open it, use it. No setup required.
2. **Your machine, your data** — Every inference happens locally. Nothing is transmitted.
3. **Open everything** — Every open-source model ever published is accessible.

## Features

- **Instant Chat** — Bundled model (Phi-3 Mini) works out of the box
- **Model Library** — Featured models, categories, and Hugging Face explorer
- **Hardware Intelligence** — Automatically detects your hardware and recommends compatible models
- **Multi-session Chat** — Multiple conversations, each saved locally
- **Streaming Responses** — Text appears word by word
- **Copy & Regenerate** — One-click response actions
- **Document Chat** — Drop a PDF/Word file, chat with it (coming soon)
- **Voice Mode** — Offline speech-to-text conversation (coming soon)
- **Local API Server** — OpenAI-compatible localhost endpoint (coming soon)
- **Cross-platform** — Windows, macOS, Linux

## Tech Stack

- **Runtime:** Electron
- **Frontend:** React + TypeScript + Tailwind CSS
- **AI Engine:** llama.cpp via node-llama-cpp (built-in, no Ollama needed)
- **Build:** electron-vite
- **State:** Zustand

## Getting Started

```bash
git clone https://github.com/joym-gits/airoost.git
cd airoost
npm install
npm run dev
```

## Tagline

*Your AI. Your machine. Your rules.*

## License

MIT
