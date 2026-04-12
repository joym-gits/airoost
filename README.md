# Airoost

**VLC for AI models** — download and run open-source AI models locally with zero setup.

Airoost is a cross-platform desktop application that lets non-technical users browse, download, and chat with open-source AI models (Llama, Mistral, Gemma, Phi, and more) on their own machine. No CLI, no terminal, no configuration — just install and go.

## Features

- Browse and download open-source AI models with one click
- Chat with any installed model in a clean, intuitive interface
- Runs entirely on your machine — your data never leaves your computer
- Powered by [Ollama](https://ollama.com) under the hood
- Cross-platform: Windows, macOS, Linux

## Tech Stack

- **Desktop runtime:** Electron
- **Frontend:** React + TypeScript + Tailwind CSS
- **Build tool:** Vite (electron-vite)
- **State management:** Zustand
- **Backend:** Ollama (local model server)
- **Packaging:** electron-builder

## Getting Started

### Prerequisites

1. Install [Node.js](https://nodejs.org/) (v18+)
2. Install [Ollama](https://ollama.com/download)
3. Start Ollama: `ollama serve`

### Development

```bash
git clone https://github.com/joym-gits/airoost.git
cd airoost
npm install
npm run dev
```

### Build

```bash
npm run build        # Build for current platform
```

## License

MIT
