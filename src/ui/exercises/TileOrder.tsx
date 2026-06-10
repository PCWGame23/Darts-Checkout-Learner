import { useMemo, useState } from 'react'
import { dartLabel, parseDart, type Dart, type Route } from '../../engine/darts'
import { useT } from '../../i18n'
import { acceptedFor, gradeBuilt, mulberry32, type ExerciseProps } from './common'
import MissHeader from './MissHeader'

const COMMON_POOL = ['T20', 'T19', 'T17', '20', '19', '16', 'D20', 'D16', 'D12', 'D8', 'Bull', '25']

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

/** Build the tile bank: the accepted routes' darts plus seeded distractors. */
function buildBank(routes: Route[], seed: number): Dart[] {
  const rand = mulberry32(seed)
  const routeTiles = mergeRouteTiles(routes)
  const routeLabels = new Set(routeTiles.map(dartLabel))
  const pool: Dart[] = []
  const seen = new Set<string>()
  const push = (d: Dart) => {
    const l = dartLabel(d)
    if (routeLabels.has(l) || seen.has(l)) return
    seen.add(l)
    pool.push(d)
  }
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

  const bankSize =
    routes.length > 1 ? Math.max(8, routeTiles.length + 3) : routeTiles.length === 2 ? 6 : 8
  const distractors = pool
    .map((d) => ({ d, k: rand() }))
    .sort((a, b) => a.k - b.k)
    .slice(0, bankSize - routeTiles.length)
    .map((x) => x.d)
  return [...routeTiles, ...distractors]
    .map((d) => ({ d, k: rand() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.d)
}

export default function TileOrder({ item, onAnswer }: ExerciseProps) {
  const t = useT()
  const accepted = useMemo(() => acceptedFor(item), [item])
  const bankSeed = item.miss ? item.miss.remainder ^ (item.score << 8) : item.score
  const bank = useMemo(() => buildBank(accepted, bankSeed * 7919), [accepted, bankSeed])
  const [picked, setPicked] = useState<number[]>([]) // indices into bank

  const lengths = accepted.map((r) => r.length)
  const maxNeed = Math.max(...lengths)
  const minNeed = Math.min(...lengths)
  const built = picked.map((i) => bank[i])

  return (
    <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {item.miss ? (
        <MissHeader miss={item.miss} />
      ) : (
        <div className="prompt-score" style={{ fontSize: '2.6rem', margin: 0 }}>{item.score}</div>
      )}
      <p className="hint">{t('ex.tiles.explain')}</p>
      <div className="chip-row">
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
