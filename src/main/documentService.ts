import { readFileSync } from 'fs'
import { extname, basename, join } from 'path'
import { app } from 'electron'

// Dynamic imports (ASAR-aware for packaged apps)
const _modCache: Record<string, any> = {}
async function dynamicImport(packageName: string): Promise<any> {
  if (_modCache[packageName]) return _modCache[packageName]

  const candidates: string[] = []
  if (app.isPackaged) {
    const unpackedBase = app.getAppPath().replace(/app\.asar$/, 'app.asar.unpacked')
    candidates.push(join(unpackedBase, 'node_modules', packageName))
  }
  candidates.push(packageName)

  let lastErr: any = null
  for (const spec of candidates) {
    try {
      const mod = await (Function('m', 'return import(m)')(spec))
      _modCache[packageName] = mod
      return mod
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr ?? new Error(`Could not load ${packageName}`)
}

export interface ParsedDocument {
  filename: string
  extension: string
  text: string
  pageCount: number
  charCount: number
  truncated: boolean
}

const MAX_CHARS = 12000 // Context window limit for small models

/**
 * Parse a document file and extract its text content.
 * Supports: .pdf, .docx, .txt, .md, .csv
 */
export async function parseDocument(filePath: string): Promise<ParsedDocument> {
  const ext = extname(filePath).toLowerCase()
  const filename = basename(filePath)

  let text = ''
  let pageCount = 1

  switch (ext) {
    case '.pdf':
      ({ text, pageCount } = await parsePDF(filePath))
      break
    case '.docx':
      text = await parseDOCX(filePath)
      break
    case '.txt':
    case '.md':
    case '.csv':
      text = readFileSync(filePath, 'utf-8')
      break
    default:
      throw new Error(`Unsupported file type: ${ext}`)
  }

  const truncated = text.length > MAX_CHARS
  const finalText = truncated ? text.slice(0, MAX_CHARS) + '\n\n[Document truncated]' : text

  return {
    filename,
    extension: ext,
    text: finalText,
    pageCount,
    charCount: text.length,
    truncated
  }
}

async function parsePDF(filePath: string): Promise<{ text: string; pageCount: number }> {
  const pdfMod = await dynamicImport('pdf-parse')
  const PDFParse = pdfMod.PDFParse ?? pdfMod.default?.PDFParse ?? pdfMod.default
  const buffer = readFileSync(filePath)
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    return {
      text: result?.text ?? '',
      pageCount: result?.pages?.length ?? result?.numpages ?? 1
    }
  } finally {
    await parser.destroy()
  }
}

async function parseDOCX(filePath: string): Promise<string> {
  const mammoth = await dynamicImport('mammoth')
  const buffer = readFileSync(filePath)
  const result = await mammoth.extractRawText({ buffer })
  return result.value ?? ''
}

/**
 * Build a system prompt that includes the document context.
 */
export function buildDocumentPrompt(doc: ParsedDocument): string {
  return [
    `You are a helpful assistant. The user has loaded a document called "${doc.filename}".`,
    `Answer questions about this document based on the content below.`,
    `If the answer is not in the document, say so clearly.`,
    doc.truncated
      ? `Note: The document was truncated to fit the context window (showing ${MAX_CHARS} of ${doc.charCount} characters).`
      : '',
    '',
    '--- DOCUMENT START ---',
    doc.text,
    '--- DOCUMENT END ---'
  ]
    .filter(Boolean)
    .join('\n')
}
