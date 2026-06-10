// Grid of all doubles (D1–D20 + Bull). First tap sets favourite 1,
// second tap favourite 2, tapping a chosen one unsets it.

import { parseDart } from '../engine/darts'
import { favoriteWarning } from '../engine/calibrate'
import { useT } from '../i18n'

export interface FavSelection {
  first?: string // dart labels, e.g. "D20", "Bull"
  second?: string
}

interface Props {
  value: FavSelection
  onChange: (v: FavSelection) => void
}

const OPTIONS = [...Array.from({ length: 20 }, (_, i) => `D${i + 1}`), 'Bull']

export default function FavoritePicker({ value, onChange }: Props) {
  const t = useT()

  const toggle = (label: string) => {
    if (value.first === label) {
      onChange({ first: value.second, second: undefined })
    } else if (value.second === label) {
      onChange({ ...value, second: undefined })
    } else if (!value.first) {
      onChange({ ...value, first: label })
    } else if (!value.second) {
      onChange({ ...value, second: label })
    }
    // both slots full and a third tapped → ignored
  }

  const warnings = [value.first, value.second]
    .filter((l): l is string => !!l)
    .map((l) => ({ label: l, warning: favoriteWarning(parseDart(l)) }))
    .filter((w) => w.warning)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="fav-grid">
        {OPTIONS.map((label) => {
          const cls = value.first === label ? 'fav1' : value.second === label ? 'fav2' : ''
          return (
            <button key={label} className={cls} onClick={() => toggle(label)}>
              {label}
              {cls && <span className="fav-badge">{cls === 'fav1' ? '1' : '2'}</span>}
            </button>
          )
        })}
      </div>
      {warnings.map(({ label, warning }) => (
        <div key={label} className="warning-box">
          {label}: {t(warning === 'madhouse' ? 'onb.favs.madhouse' : 'onb.favs.unusual')}
        </div>
      ))}
    </div>
  )
}
