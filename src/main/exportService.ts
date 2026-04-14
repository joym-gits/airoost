import { BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'

interface ExportMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ExportData {
  title: string
  modelId: string
  personaName: string | null
  personaEmoji: string | null
  createdAt: number
  messages: ExportMessage[]
}

/**
 * Export conversation as PDF using Electron's built-in print.
 * Creates a hidden BrowserWindow, loads HTML, prints to PDF.
 */
export async function exportToPDF(data: ExportData, savePath: string): Promise<void> {
  const html = buildExportHTML(data)

  const win = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  })

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

  // Small delay for CSS rendering
  await new Promise((r) => setTimeout(r, 500))

  const pdfData = await win.webContents.printToPDF({
    printBackground: true,
    margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
  })

  writeFileSync(savePath, pdfData)
  win.close()
}

/**
 * Export conversation as DOCX using the docx npm package.
 */
export async function exportToDOCX(data: ExportData, savePath: string): Promise<void> {
  // Dynamic import to avoid Vite bundling
  const docxMod = await (Function('m', 'return import(m)')('docx'))
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docxMod

  const children: any[] = []

  // Title
  children.push(new Paragraph({
    text: data.title,
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 200 }
  }))

  // Metadata
  const metaParts = [
    `Model: ${data.modelId}`,
    data.personaName ? `Persona: ${data.personaEmoji ?? ''} ${data.personaName}` : null,
    `Date: ${new Date(data.createdAt).toLocaleString()}`
  ].filter(Boolean)

  children.push(new Paragraph({
    children: [new TextRun({ text: metaParts.join(' | '), italics: true, color: '666666', size: 20 })],
    spacing: { after: 400 }
  }))

  // Messages
  for (const msg of data.messages) {
    const label = msg.role === 'user' ? 'You' : 'AI'
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 22 }),
        new TextRun({ text: msg.content, size: 22 })
      ],
      spacing: { after: 200 }
    }))
  }

  // Footer
  children.push(new Paragraph({
    children: [new TextRun({ text: 'Generated locally with Airoost', italics: true, color: '999999', size: 18 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 600 }
  }))

  const doc = new Document({
    sections: [{ children }]
  })

  const buffer = await Packer.toBuffer(doc)
  writeFileSync(savePath, buffer)
}

/**
 * Export conversation as Markdown string.
 */
export function exportToMarkdown(data: ExportData): string {
  const lines = [`# ${data.title}\n`]
  lines.push(`*Model: ${data.modelId}*`)
  if (data.personaName) lines.push(`*Persona: ${data.personaEmoji ?? ''} ${data.personaName}*`)
  lines.push(`*Date: ${new Date(data.createdAt).toLocaleString()}*`)
  lines.push('\n---\n')

  for (const msg of data.messages) {
    if (msg.role === 'user') {
      lines.push(`**You:** ${msg.content}\n`)
    } else {
      lines.push(`**AI:** ${msg.content}\n`)
    }
  }

  lines.push('\n---\n*Generated locally with Airoost*')
  return lines.join('\n')
}

/**
 * Export conversation as plain text.
 */
export function exportToText(data: ExportData): string {
  const lines = [data.title, `Model: ${data.modelId}`, '']
  for (const msg of data.messages) {
    const label = msg.role === 'user' ? 'You' : 'AI'
    lines.push(`${label}: ${msg.content}`, '')
  }
  lines.push('Generated locally with Airoost')
  return lines.join('\n')
}

/**
 * Build HTML for PDF export.
 */
function buildExportHTML(data: ExportData): string {
  const date = new Date(data.createdAt).toLocaleString()
  const persona = data.personaName ? `${data.personaEmoji ?? ''} ${data.personaName}` : ''

  const messagesHTML = data.messages.map((msg) => {
    if (msg.role === 'user') {
      return `<div style="background:#f0f0f0;padding:12px 16px;border-radius:12px;margin:8px 0;margin-left:40px;">
        <div style="font-size:11px;color:#888;margin-bottom:4px;">You</div>
        <div style="font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHTML(msg.content)}</div>
      </div>`
    }
    return `<div style="background:#e8e8e8;padding:12px 16px;border-radius:12px;margin:8px 0;margin-right:40px;">
      <div style="font-size:11px;color:#888;margin-bottom:4px;">AI</div>
      <div style="font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHTML(msg.content)}</div>
    </div>`
  }).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #222; }
    .header { border-bottom: 2px solid #e94560; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 22px; font-weight: bold; color: #222; }
    .logo span { color: #e94560; }
    .meta { font-size: 12px; color: #888; margin-top: 8px; }
    .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">ai<span>roost</span></div>
    <h1 style="margin:8px 0 0;font-size:18px;">${escapeHTML(data.title)}</h1>
    <div class="meta">${escapeHTML(data.modelId)}${persona ? ` | ${escapeHTML(persona)}` : ''} | ${escapeHTML(date)}</div>
  </div>
  ${messagesHTML}
  <div class="footer">Generated locally with Airoost</div>
</body>
</html>`
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
