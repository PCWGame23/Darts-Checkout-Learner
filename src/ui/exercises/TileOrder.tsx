import { useMemo, useState } from 'react'
import { dartLabel, parseDart, type Dart, type Route } from '../../engine/darts'
import { useT } from '../../i18n'
import {
  acceptedFor,
  alternativeFinishDarts,
  gradeBuilt,
  maxDartsFor,
  mulberry32,
  submittableLengths,
  type ExerciseProps
} from './common'

const COMMON_POOL = ['T20', 'T19', 'T17', '20', '19', '16', 'D20', 'D16', 'D12', 'D8', 'Bull', '25']
/** Hard cap on tiles in the bank, and how many "real alternative" darts to seed. */
const BANK_MAX = 9
const PREFERRED_MAX = 3

/**
 * Merge accepted routes into the set of tiles needed to build either one:
 * for each dart label, take the MAX count it appears in any single route
 * (not the sum), preserving duplicates within a route.
 */
export function mergeRouteTiles(routes: Route[]): Dart[] {
  const maxCounts = new Map<string, number>()
  const byLabel = new Map<string, Dart>()
  for (const route of routes) {
    const counts = new Map<string, number>()
    for (const d of route) {
      const l = dartLabel(d)
      byLabel.set(l, d)
      counts.set(l, (counts.get(l) ?? 0) + 1)
    }
    for (const [l, c] of counts) {
      maxCounts.set(l, Math.max(maxCounts.get(l) ?? 0, c))
    }
  }
  const tiles: Dart[] = []
  for (const [l, c] of maxCounts) {
    for (let i = 0; i < c; i++) tiles.push(byLabel.get(l)!)
  }
  return tiles
}

/**
 * Build the tile bank (max BANK_MAX tiles): the accepted routes' darts, then a
 * few darts from other valid finishes so the player can build alternative
 * correct routes, then near-miss / common distractors to fill up.
 */
function buildBank(routes: Route[], preferred: Dart[], seed: number): Dart[] {
  const rand = mulberry32(seed)
  const shuffle = (ds: Dart[]) =>
    ds
      .map((d) => ({ d, k: rand() }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.d)

  const routeTiles = mergeRouteTiles(routes)
  const routeLabels = new Set(routeTiles.map(dartLabel))
  const distractors: Dart[] = []
  const seen = new Set<string>()
  const push = (d: Dart) => {
    const l = dartLabel(d)
    if (routeLabels.has(l) || seen.has(l)) return
    seen.add(l)
    distractors.push(d)
  }

  // A few real alternative-finish darts first (so other correct routes are
  // buildable), but not too many — keep convincing wrong options around.
  for (const d of shuffle(preferred).slice(0, PREFERRED_MAX)) push(d)
  // Near-misses of the actual route darts make convincing distractors.
  for (const d of routeTiles) {
    if (d.sector <= 20) {
      for (const ring of ['S', 'D', 'T'] as const) {
        if (ring !== d.ring) push({ ring, sector: d.sector })
      }
      if (d.sector > 1) push({ ring: d.ring, sector: d.sector - 1 })
      if (d.sector < 20) push({ ring: d.ring, sector: d.sector + 1 })
    }
  }
  for (const l of COMMON_POOL) push(parseDart(l))

  const need = Math.max(0, BANK_MAX - routeTiles.length)
  return shuffle([...routeTiles, ...distractors.slice(0, need)])
}

export default function TileOrder({ item, onAnswer }: ExerciseProps) {
  const t = useT()
  const accepted = useMemo(() => acceptedFor(item), [item])
  const bankSeed = item.miss ? item.miss.remainder ^ (item.score << 8) : item.score
  const bank = useMemo(
    () => buildBank(accepted, alternativeFinishDarts(item), bankSeed * 7919),
    [accepted, item, bankSeed]
  )
  const [picked, setPicked] = useState<number[]>([]) // indices into bank

  const lengths = submittableLengths(item)
  const maxNeed = maxDartsFor(item)
  const minNeed = Math.min(...lengths)
  const built = picked.map((i) => bank[i])

  return (
    <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="prompt-score" style={{ fontSize: '2.6rem', margin: 0 }}>{item.score}</div>
      <p className="hint">{t('ex.tiles.explain')}</p>
      <div className="chip-row">
        {item.miss && (
          <span className="dart-chip given">{dartLabel(item.miss.hit)}</span>
        )}
        {Array.from({ length: maxNeed }, (_, i) =>
          picked[i] !== undefined ? (
            <button
              key={i}
              className="dart-chip selected"
              onClick={() => setPicked(picked.filter((_, j) => j !== i))}
            >
              {dartLabel(bank[picked[i]])}
            </button>
          ) : i >= minNeed ? (
            <span key={i} className="dart-chip slot optional">?</span>
          ) : (
            <span key={i} className="dart-chip slot">?</span>
          )
        )}
      </div>
      <div className="tile-bank">
        {bank.map((d, i) => {
          const used = picked.includes(i)
          return (
            <button
              key={i}
              className={`dart-chip${used ? ' used' : ''}`}
              disabled={used || picked.length >= maxNeed}
              onClick={() => setPicked([...picked, i])}
            >
              {dartLabel(d)}
            </button>
          )
        })}
      </div>
      <div className="grow" />
      <button
        className="btn-primary"
        disabled={!lengths.includes(picked.length)}
        onClick={() => onAnswer(gradeBuilt(built, item), built)}
      >
        {t('lesson.check')}
      </button>
    </div>
  )
}
