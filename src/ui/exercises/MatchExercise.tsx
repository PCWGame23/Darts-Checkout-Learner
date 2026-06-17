import { useEffect, useMemo, useRef, useState } from 'react'
import { routeLabel, routeValue } from '../../engine/darts'
import { useT } from '../../i18n'
import { seededShuffle } from '../../learn/lessons'
import { type ExerciseProps } from './common'

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
    const idx = pairs.map((_, i) => i)
    return {
      leftOrder: seededShuffle(idx, seed),
      rightOrder: seededShuffle(idx, seed ^ 0x9e3779b9)
    }
  }, [pairs, item.score])

  const [selLeft, setSelLeft] = useState<number | null>(null)
  const [selRight, setSelRight] = useState<number | null>(null)
  // Tracked per column: a valid match hides the route on the left and its value
  // on the right, which only coincide when scores are distinct — track both so
  // the grid stays correct regardless.
  const [matchedL, setMatchedL] = useState<Set<number>>(() => new Set())
  const [matchedR, setMatchedR] = useState<Set<number>>(() => new Set())
  const [wrong, setWrong] = useState(false)
  const [mistakes, setMistakes] = useState(0)
  const shakeTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(shakeTimer.current), [])

  const evaluate = (a: number, b: number) => {
    setSelLeft(null)
    setSelRight(null)
    if (routeValue(pairs[a].route) === pairs[b].score) {
      const nextL = new Set(matchedL).add(a)
      setMatchedL(nextL)
      setMatchedR((r) => new Set(r).add(b))
      if (nextL.size === pairs.length) onAnswer(mistakes > 0 ? 'almost' : 'good')
    } else {
      setMistakes((m) => m + 1)
      setWrong(true)
      clearTimeout(shakeTimer.current)
      shakeTimer.current = setTimeout(() => setWrong(false), 300)
    }
  }

  const clickLeft = (i: number) => {
    if (matchedL.has(i)) return
    const sel = selLeft === i ? null : i
    setSelLeft(sel)
    if (sel !== null && selRight !== null) evaluate(sel, selRight)
  }
  const clickRight = (j: number) => {
    if (matchedR.has(j)) return
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
              className={`match-tile${selLeft === i ? ' selected' : ''}${matchedL.has(i) ? ' matched' : ''}`}
              disabled={matchedL.has(i)}
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
              className={`match-tile${selRight === j ? ' selected' : ''}${matchedR.has(j) ? ' matched' : ''}`}
              disabled={matchedR.has(j)}
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
