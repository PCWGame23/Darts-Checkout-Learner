import { ALL_DARTS, type Dart, type Route, dartValue, routeLabel, routeValue } from './darts'
import { acceptedRoutes, type Favorites, type TaughtRoute, taughtRoute } from './calibrate'
import { isValidFinish, minDartsToFinish } from './routes'

export type MissKind = 'finish' | 'setup'

export interface MissChallenge {
  score: number
  intended: Dart
  hit: Dart
  remainder: number
  kind: MissKind
  taught: TaughtRoute | null
  direct?: Dart
  bestSetup?: Route
  goodLeaves?: number[]
}

/** The dart the user was aiming at: first triple of taught route, or proTip. */
export function missIntendedDart(score: number, favs: Favorites): Dart | null {
  const taught = taughtRoute(score, favs)
  if (!taught) return null
  if (taught.route[0]?.ring === 'T') return taught.route[0]
  if (taught.proTip?.[0]?.ring === 'T') return taught.proTip[0]
  return null
}

export function missEligible(score: number, favs: Favorites): boolean {
  return missIntendedDart(score, favs) !== null
}

function classifyRemainder(r: number): MissKind {
  const min = minDartsToFinish(r)
  return min === 1 || min === 2 ? 'finish' : 'setup'
}

function directDoubleDart(score: number): Dart | undefined {
  if (score === 50) return { ring: 'D', sector: 25 }
  if (score >= 2 && score <= 40 && score % 2 === 0) {
    return { ring: 'D', sector: score / 2 }
  }
  return undefined
}

function allPairsForTarget(target: number): Route[] {
  const pairs: Route[] = []
  for (let i = 0; i < ALL_DARTS.length; i++) {
    const d1 = ALL_DARTS[i]
    const v1 = dartValue(d1)
    if (v1 > target) continue
    for (let j = 0; j < ALL_DARTS.length; j++) {
      const d2 = ALL_DARTS[j]
      const v2 = dartValue(d2)
      if (v1 + v2 !== target) continue
      pairs.push([d1, d2])
    }
  }
  const seen = new Set<string>()
  const unique: Route[] = []
  for (const pair of pairs) {
    const key = routeLabel(pair)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(pair)
  }
  return unique
}

function setupPairQuality(pair: Route): number {
  let q = 0
  for (const d of pair) {
    if (d.ring === 'D') q += 2_000
    if (d.sector === 25) q += 1_500
  }
  q -= dartValue(pair[0]) * 10
  if (pair[0].ring !== 'T') q += 500
  if (pair[1].ring !== 'S') q += 200
  return q
}

function setupLeavesPriority(favs: Favorites): number[] {
  const leaves: number[] = []
  const add = (v: number) => {
    if (!leaves.includes(v)) leaves.push(v)
  }
  if (favs.first) add(dartValue(favs.first))
  if (favs.second) add(dartValue(favs.second))
  for (const v of [40, 32, 36, 24, 20, 16]) add(v)
  for (let v = 50; v >= 2; v -= 2) {
    if (v <= 40 || v === 50) add(v)
  }
  return leaves
}

function canSetupLeave(remainder: number, leave: number): boolean {
  if (leave < 2) return false
  if (leave !== 50 && (leave > 40 || leave % 2 !== 0)) return false
  const target = remainder - leave
  if (target < 2) return false
  return allPairsForTarget(target).length > 0
}

export function bestSetupRoute(remainder: number, favs: Favorites): Route | null {
  const leaves = setupLeavesPriority(favs)
  for (const leave of leaves) {
    if (!canSetupLeave(remainder, leave)) continue
    const target = remainder - leave
    const pairs = allPairsForTarget(target)
    pairs.sort((a, b) => {
      const qa = setupPairQuality(a)
      const qb = setupPairQuality(b)
      if (qa !== qb) return qa - qb
      return routeLabel(a).localeCompare(routeLabel(b))
    })
    return pairs[0]!
  }
  return null
}

function computeGoodLeaves(remainder: number, favs: Favorites, bestSetup: Route): number[] {
  const leaves: number[] = []
  if (favs.first) {
    const v = dartValue(favs.first)
    if (canSetupLeave(remainder, v)) leaves.push(v)
  }
  if (favs.second) {
    const v = dartValue(favs.second)
    if (canSetupLeave(remainder, v) && !leaves.includes(v)) leaves.push(v)
  }
  if (leaves.length > 0) return leaves
  const bestLeave = remainder - routeValue(bestSetup)
  return [bestLeave]
}

export function buildMissChallenge(score: number, favs: Favorites): MissChallenge | null {
  const intended = missIntendedDart(score, favs)
  if (!intended) return null
  const hit: Dart = { ring: 'S', sector: intended.sector }
  const remainder = score - intended.sector
  const kind = classifyRemainder(remainder)

  if (kind === 'finish') {
    const taught = taughtRoute(remainder, favs, 2)
    const direct = directDoubleDart(remainder)
    return { score, intended, hit, remainder, kind, taught, direct }
  }

  const bestSetup = bestSetupRoute(remainder, favs)
  if (!bestSetup) return null
  const goodLeaves = computeGoodLeaves(remainder, favs, bestSetup)
  return { score, intended, hit, remainder, kind, taught: null, bestSetup, goodLeaves }
}

export function missAcceptedRoutes(c: MissChallenge): Route[] {
  if (c.kind === 'finish') {
    const routes: Route[] = c.taught ? acceptedRoutes(c.taught) : []
    if (c.direct) routes.push([c.direct])
    return routes
  }
  return c.bestSetup ? [c.bestSetup] : []
}

function isValidSetup(route: Route, remainder: number): boolean {
  if (route.length !== 2) return false
  let remaining = remainder
  for (let i = 0; i < route.length; i++) {
    remaining -= dartValue(route[i])
    if (remaining < 2) return false
  }
  const leave = remaining
  return leave === 50 || (leave >= 2 && leave <= 40 && leave % 2 === 0)
}

export function gradeMissAnswer(built: Route, c: MissChallenge): 'good' | 'almost' | 'again' {
  if (c.kind === 'finish') {
    // Any mathematically valid finish of the remainder counts as fully
    // correct — there's no single "right" recovery route.
    if (isValidFinish(built, c.remainder)) return 'good'
    return 'again'
  }
  // setup
  if (!isValidSetup(built, c.remainder)) return 'again'
  const leave = c.remainder - routeValue(built)
  if (c.goodLeaves?.includes(leave)) return 'good'
  return 'almost'
}

/** Deterministic PRNG. Re-exported here so lessons.ts can use the same algorithm. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
