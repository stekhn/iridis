import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ThemeContext, defaultTheme, persistTheme, systemPrefersDark } from '../theme'
import type { ThemePref } from '../theme'

/** Holds the theme preference, resolves 'system' against the live OS setting, and writes the
 *  concrete light|dark value to <html data-theme> so the CSS token overrides apply. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>(defaultTheme)
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark)

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
  }, [resolved])

  const setTheme = useCallback((t: ThemePref) => {
    setThemeState(t)
    persistTheme(t)
  }, [])

  const value = useMemo(() => ({ theme, setTheme, resolved }), [theme, setTheme, resolved])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
