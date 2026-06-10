import { useState } from 'react'
import { dartLabel, type Dart, type Ring } from '../../engine/darts'
import { useT } from '../../i18n'
import Dartboard from '../Dartboard'
import { gradeBuilt, maxDartsFor, submittableLengths, type ExerciseProps } from './common'

export default function BoardEntry({ item, onAnswer }: ExerciseProps) {
  const t = useT()
  const [darts, setDarts] = useState<Dart[]>([])
  const [sector, setSector] = useState<number | undefined>()

  const lengths = submittableLengths(item)
  const maxDarts = maxDartsFor(item)
  const minDarts = Math.min(...lengths)

  const addDart = (ring: Ring) => {
    if (sector === undefined || darts.length >= maxDarts) return
    setDarts([...darts, { ring, sector }])
    setSector(undefined)
  }

  const rings: { ring: Ring; label: string }[] =
    sector === 25
      ? [
          { ring: 'S', label: '25' },
          { ring: 'D', label: 'Bull' }
        ]
      : [
          { ring: 'S', label: 'S' },
          { ring: 'D', label: 'D' },
          { ring: 'T', label: 'T' }
        ]

  return (
    <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="prompt-score" style={{ fontSize: '2.6rem', margin: 0 }}>{item.score}</div>
      <p className="hint">{t('ex.board.explain')}</p>
      <div className="chip-row">
        {item.miss && (
          <span className="dart-chip given">{dartLabel(item.miss.hit)}</span>
        )}
        {Array.from({ length: maxDarts }, (_, i) =>
          darts[i] ? (
            <span key={i} className="dart-chip">{dartLabel(darts[i])}</span>
          ) : i >= minDarts ? (
            <span key={i} className="dart-chip slot optional">?</span>
          ) : (
            <span key={i} className="dart-chip slot">?</span>
          )
        )}
      </div>
      <div className="board-wrap">
        <Dartboard selected={sector} onSelect={setSector} />
        <div className="ring-buttons">
          {rings.map(({ ring, label }) => (
            <button
              key={ring}
              disabled={sector === undefined || darts.length >= maxDarts}
              onClick={() => addDart(ring)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="btn-row">
        <button className="btn-ghost" disabled={darts.length === 0} onClick={() => setDarts(darts.slice(0, -1))}>
          {t('ex.undo')}
        </button>
        <button
          className="btn-primary"
          disabled={!lengths.includes(darts.length)}
          onClick={() => onAnswer(gradeBuilt(darts, item), darts)}
        >
          {t('lesson.check')}
        </button>
      </div>
    </div>
  )
}
