import { IconSettings } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ThemePref } from '../theme'
import { THEME_OPTIONS, useTheme } from '../theme'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Header "Settings" button and popover (theme). Behaves as a modal dialog: opening moves focus
 *  inside, Tab cycles within it, Escape closes and returns focus to the trigger. */
export function HeaderSettings() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const focusable = (): HTMLElement[] => (dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)) : [])
    focusable()[0]?.focus()

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close(true)
        return
      }
      if (e.key !== 'Tab') return
      const nodes = focusable()
      if (nodes.length === 0) {
        e.preventDefault()
        return
      }
      const first = nodes[0]!
      const last = nodes[nodes.length - 1]!
      const active = document.activeElement
      if (e.shiftKey && (active === first || !dialog?.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !dialog?.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    const onDown = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close(false)
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open, close])

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        className="btn-secondary"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close(true) : setOpen(true))}
      >
        <IconSettings className="size-4 text-accent" aria-hidden="true" />
        <span className="hidden sm:inline">Settings</span>
      </button>
      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
          className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-line bg-surface p-3 text-left shadow-lg"
        >
          <label className="label" htmlFor="theme">
            Theme
          </label>
          <select id="theme" className="control" value={theme} onChange={(e) => setTheme(e.target.value as ThemePref)}>
            {THEME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted">Applies to the interface only. The cover itself does not change.</p>
        </div>
      )}
    </div>
  )
}
