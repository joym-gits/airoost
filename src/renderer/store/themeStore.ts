import { create } from 'zustand'

export type ThemeMode = 'dark' | 'light' | 'system'
export type AccentColor = 'red' | 'blue' | 'purple' | 'green' | 'orange' | 'pink'
export type FontSize = 'small' | 'medium' | 'large'
export type LayoutDensity = 'compact' | 'comfortable'

export const ACCENT_COLORS: Record<AccentColor, string> = {
  red: '#e94560',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  green: '#22c55e',
  orange: '#f97316',
  pink: '#ec4899'
}

export const FONT_SIZES: Record<FontSize, string> = {
  small: '13px',
  medium: '14px',
  large: '16px'
}

interface ThemeState {
  mode: ThemeMode
  accent: AccentColor
  fontSize: FontSize
  density: LayoutDensity

  setMode: (mode: ThemeMode) => void
  setAccent: (accent: AccentColor) => void
  setFontSize: (size: FontSize) => void
  setDensity: (density: LayoutDensity) => void
}

const THEME_KEY = 'airoost_theme'

function loadTheme(): { mode: ThemeMode; accent: AccentColor; fontSize: FontSize; density: LayoutDensity } {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw) return { mode: 'dark', accent: 'red', fontSize: 'medium', density: 'comfortable', ...JSON.parse(raw) }
  } catch {}
  return { mode: 'dark', accent: 'red', fontSize: 'medium', density: 'comfortable' }
}

function saveTheme(state: { mode: ThemeMode; accent: AccentColor; fontSize: FontSize; density: LayoutDensity }): void {
  localStorage.setItem(THEME_KEY, JSON.stringify(state))
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100))
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100))
  const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100))
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100))
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100))
  const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100))
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

function applyTheme(mode: ThemeMode, accent: AccentColor, fontSize: FontSize, density?: LayoutDensity): void {
  const root = document.documentElement

  // Accent color CSS variables
  const accentHex = ACCENT_COLORS[accent]
  root.style.setProperty('--accent', accentHex)
  // Generate lighter and darker variants
  root.style.setProperty('--accent-light', lightenColor(accentHex, 20))
  root.style.setProperty('--accent-dark', darkenColor(accentHex, 15))

  // Font size — set data attribute so CSS can scale everything
  root.setAttribute('data-font-size', fontSize)
  root.style.setProperty('--font-size', FONT_SIZES[fontSize])
  document.body.style.fontSize = FONT_SIZES[fontSize]

  // Layout density
  root.setAttribute('data-density', density ?? 'comfortable')

  // Light/dark mode
  const resolvedMode = mode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode

  if (resolvedMode === 'light') {
    root.classList.remove('dark')
    root.classList.add('light')
  } else {
    root.classList.remove('light')
    root.classList.add('dark')
  }
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = loadTheme()
  // Apply on load
  setTimeout(() => applyTheme(initial.mode, initial.accent, initial.fontSize, initial.density), 0)

  return {
    ...initial,

    setMode: (mode) => {
      const state = { ...get(), mode }
      applyTheme(mode, state.accent, state.fontSize, state.density)
      saveTheme(state)
      set({ mode })
    },

    setAccent: (accent) => {
      const state = { ...get(), accent }
      applyTheme(state.mode, accent, state.fontSize, state.density)
      saveTheme(state)
      set({ accent })
    },

    setFontSize: (fontSize) => {
      const state = { ...get(), fontSize }
      applyTheme(state.mode, state.accent, fontSize, state.density)
      saveTheme(state)
      set({ fontSize })
    },

    setDensity: (density) => {
      const state = { ...get(), density }
      applyTheme(state.mode, state.accent, state.fontSize, density)
      saveTheme(state)
      set({ density })
    }
  }
})
