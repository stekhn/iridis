// Colour theme preference: system (follow the OS), light, or dark. Persisted to localStorage and
// applied by writing a resolved light|dark value to <html data-theme> (see ThemeProvider and the
// inline boot script in index.html, which must use the same storage key).
import { createContext, useContext } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const STORAGE_KEY = 'iridis.theme'

export function defaultTheme(): ThemePref {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'system' || saved === 'light' || saved === 'dark') return saved
  } catch {
    /* localStorage may be unavailable (private mode) */
  }
  return 'system'
}

export function persistTheme(t: ThemePref): void {
  try {
    localStorage.setItem(STORAGE_KEY, t)
  } catch {
    /* ignore persistence failure */
  }
}

export function systemPrefersDark(): boolean {
  try {
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

interface ThemeContextValue {
  theme: ThemePref
  setTheme: (t: ThemePref) => void
  resolved: ResolvedTheme
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
