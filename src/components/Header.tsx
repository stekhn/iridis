import { HeaderSettings } from './HeaderSettings'
import { IridisMark } from './Logo'

export function Header() {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <h1 className="flex shrink-0 items-center gap-2 text-xl font-bold tracking-tight">
          <IridisMark className="size-5 text-accent" />
          Iridis
        </h1>
        <span className="h-6 w-px shrink-0 bg-ink" aria-hidden="true" />
        <p className="text-base tracking-tight text-ink sm:text-xl">Iridescent book cover backgrounds</p>
      </div>
      <HeaderSettings />
    </header>
  )
}
