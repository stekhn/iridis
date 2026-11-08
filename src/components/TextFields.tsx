import { TEXT_MAX, type CoverTexts } from '@engine'

interface Props {
  texts: CoverTexts
  onChange: (patch: Partial<CoverTexts>) => void
}

const FIELDS: { key: keyof CoverTexts; label: string; placeholder: string }[] = [
  { key: 'author', label: 'Author', placeholder: 'Given name and family name' },
  { key: 'title', label: 'Title', placeholder: 'Title' },
  { key: 'subtitle', label: 'Subtitle', placeholder: 'Optional' },
  { key: 'publisher', label: 'Publisher', placeholder: 'Imprint or series' },
]

/** The four fixed text fields. Empty fields are simply not set; the layout follows the content. */
export function TextFields({ texts, onChange }: Props) {
  return (
    <div className="space-y-3">
      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="label" htmlFor={`text-${key}`}>
            {label}
          </label>
          <input
            id={`text-${key}`}
            type="text"
            className="control"
            value={texts[key]}
            placeholder={placeholder}
            maxLength={TEXT_MAX}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => onChange({ [key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  )
}
