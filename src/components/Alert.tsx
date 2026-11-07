import { IconAlertCircle, IconAlertTriangle, IconInfoCircle, IconX } from '@tabler/icons-react'
import type { ReactNode } from 'react'

type Variant = 'info' | 'warning' | 'error'

const STYLES = {
  info: { box: 'border-accent/20 bg-accent-soft text-ink/80', Icon: IconInfoCircle, role: 'status' },
  warning: { box: 'border-warn-border/40 bg-warn-bg text-warn-ink', Icon: IconAlertTriangle, role: 'status' },
  error: { box: 'border-error-border/40 bg-error-bg text-error-ink', Icon: IconAlertCircle, role: 'alert' },
} as const

interface Props {
  variant: Variant
  children: ReactNode
  onDismiss?: () => void
}

export function Alert({ variant, children, onDismiss }: Props) {
  const { box, Icon, role } = STYLES[variant]
  return (
    <div role={role} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${box}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button
          type="button"
          className="-m-1 rounded p-1 opacity-70 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-accent/40"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <IconX className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
