import type { SVGProps } from 'react'

/** The Tabler "rainbow" outline, shared with public/favicon.svg (keep both in sync). */
const RAINBOW_PATHS = [
  'M22 17c0 -5.523 -4.477 -10 -10 -10c-5.523 0 -10 4.477 -10 10',
  'M18 17a6 6 0 1 0 -12 0',
  'M14 17a2 2 0 1 0 -4 0',
] as const

/** Inline mark drawn in currentColor, used in the header and the empty states. */
export function IridisMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {RAINBOW_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
