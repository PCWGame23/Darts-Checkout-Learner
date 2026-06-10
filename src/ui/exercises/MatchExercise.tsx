import { useMemo, useState } from 'react'
import { routeLabel, routeValue } from '../../engine/darts'
import { useT } from '../../i18n'
import { mulberry32, type ExerciseProps } from './common'

/** Deterministic index permutation 0..n-1 for a stable column order. */
function shuffleIndices(n: number, rand: () => number): number[] {
  return Array.from({ length: n }, (_, i) => i)
    .map((i) => ({ i, k: rand() }))
    .sort((a, b) => a.k - b.k)
    .map((o) => o.i)
}

/**
 * Duolingo-style "tap the matching pairs": finishing routes on the left, the
 * checkout values on the right, each column shuffled independently. Tap a route
 * then its value (or vice versa). When every pair is matched the exercise
 * reports 'good' (or 'almost' if there were any mismatches).
 */
export default function MatchExercise({ item, onAnswer }: ExerciseProps) {
  const t = useT()
  const pairs = item.match!

  const { leftOrder, rightOrder } = useMemo(() => {
    const seed = (pairs.reduce((h, p) => h + p.score, item.score) >>> 0) || 1
    return {
      leftOrder: shuffleIndices(pairs.length, mulberry32(seed)),
      rightOrder: shuffleIndices(pairs.length, mulberry32((seed ^ 0x9e3779b9) >>> 0))
    }
  }, [pairs, item.score])

  const [selLeft, setSelLeft] = useState<number | null>(null)
  const [selRight, setSelRight] = useState<number | null>(null)
  const [matched, setMatched] = useState<number[]>([])
  const [wrong, setWrong] = useState(false)
  const [mistakes, setMistakes] = useState(0)

  const isMatched = (i: number) => matched.includes(i)

  const evaluate = (a: number, b: number) => {
    if (routeValue(pairs[a].route) === pairs[b].score) {
      const next = [...matched, a]
      setMatched(next)
      setSelLeft(null)
      setSelRight(null)
      if (next.length === pairs.length) onAnswer(mistakes > 0 ? 'almost' : 'good')
    } else {
      setMistakes((m) => m + 1)
      setSelLeft(null)
      setSelRight(null)
      setWrong(true)
      setTimeout(() => setWrong(false), 300)
    }
  }

  const clickLeft = (i: number) => {
    if (isMatched(i)) return
    const sel = selLeft === i ? null : i
    setSelLeft(sel)
    if (sel !== null && selRight !== null) evaluate(sel, selRight)
  }
  const clickRight = (j: number) => {
    if (isMatched(j)) return
    const sel = selRight === j ? null : j
    setSelRight(sel)
    if (sel !== null && selLeft !== null) evaluate(selLeft, sel)
  }

  return (
    <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p className="hint">{t('ex.match.explain')}</p>
      <div className={`match-grid${wrong ? ' shake' : ''}`}>
        <div className="match-col">
          {leftOrder.map((i) => (
            <button
              key={i}
              className={`match-tile${selLeft === i ? ' selected' : ''}${isMatched(i) ? ' matched' : ''}`}
              disabled={isMatched(i)}
              onClick={() => clickLeft(i)}
            >
              {routeLabel(pairs[i].route)}
            </button>
          ))}
        </div>
        <div className="match-col">
          {rightOrder.map((j) => (
            <button
              key={j}
              className={`match-tile${selRight === j ? ' selected' : ''}${isMatched(j) ? ' matched' : ''}`}
              disabled={isMatched(j)}
              onClick={() => clickRight(j)}
            >
              {pairs[j].score}
            </button>
          ))}
        </div>
      </div>
      <div className="grow" />
    </div>
  )
}
