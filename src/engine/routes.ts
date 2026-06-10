// Checkout route generation.
// A valid checkout route sums exactly to the score, ends on a double
// (D1–D20 or Bull), and never passes through a remaining score of 1
// (which would be a bust in a real game).

import {
  ALL_DARTS,
  DOUBLES,
  type Dart,
  type Route,
  dartValue,
  sameDart
} from './darts'

/** Scores with no 3-dart finish. */
export const BOGEY_NUMBERS: readonly number[] = Object.freeze([
  159, 162, 163, 165, 166, 168, 169
])

export const MAX_CHECKOUT = 170
export const MIN_CHECKOUT = 2

/** All scores that can be checked out with up to 3 darts. */
export const FINISHABLE_SCORES: readonly number[] = Object.freeze(
  Array.from({ length: MAX_CHECKOUT - MIN_CHECKOUT + 1 }, (_, i) => i + MIN_CHECKOUT)
    .filter((s) => !BOGEY_NUMBERS.includes(s))
)

export function isValidFinish(route: Route, score: number): boolean {
  if (route.length === 0 || route.length > 3) return false
  const last = route[route.length - 1]
  if (last.ring !== 'D') return false
  let remaining = score
  for (let i = 0; i < route.length; i++) {
    remaining -= dartValue(route[i])
    const isLast = i === route.length - 1
    if (isLast) {
      if (remaining !== 0) return false
    } else if (remaining < 2) {
      // Mid-route the remaining score must stay >= 2 (1 or 0 is a bust /
      // an early finish without a double).
      return false
    }
  }
  return true
}

/**
 * Enumerate every valid route for `score` using at most `maxDarts` darts,
 * optionally constrained to end on a specific double.
 */
export function allRoutes(
  score: number,
  maxDarts: 1 | 2 | 3 = 3,
  finalDouble?: Dart
): Route[] {
  const results: Route[] = []
  const finishes = finalDouble ? [finalDouble] : DOUBLES
  for (const fin of finishes) {
    if (fin.ring !== 'D') continue
    const rest = score - dartValue(fin)
    if (rest === 0) {
      results.push([fin])
      continue
    }
    // `rest` is what the setup dart(s) must sum to. rest === 1 is fine: a
    // single S1 covers it (e.g. 3 → "1 D1"), leaving a mid-route remaining
    // equal to the double's value (>= 2). Only rest < 1 (double too big) is
    // unreachable. Mid-route bust safety is enforced per-branch below.
    if (rest < 1) continue
    if (maxDarts >= 2) {
      for (const d1 of ALL_DARTS) {
        if (dartValue(d1) === rest) results.push([d1, fin])
      }
    }
    if (maxDarts >= 3) {
      for (let i = 0; i < ALL_DARTS.length; i++) {
        const d1 = ALL_DARTS[i]
        const afterFirst = rest - dartValue(d1)
        if (afterFirst < 2) continue
        // j >= i avoids emitting both orderings of the same setup pair;
        // we canonicalise to higher-value dart first below.
        for (let j = i; j < ALL_DARTS.length; j++) {
          const d2 = ALL_DARTS[j]
          if (dartValue(d2) !== afterFirst) continue
          const pair =
            dartValue(d1) >= dartValue(d2) ? [d1, d2] : [d2, d1]
          results.push([...pair, fin])
        }
      }
    }
  }
  return results
}

/** Minimum darts needed to finish `score`, or null if unfinishable. */
export function minDartsToFinish(score: number): 1 | 2 | 3 | null {
  for (const n of [1, 2, 3] as const) {
    if (allRoutes(score, n).length > 0) return n
  }
  return null
}

/**
 * Quality score for ranking routes (lower = better). Heuristics:
 * fewest darts dominates; setup darts should avoid doubles and the
 * outer 25; prefer a big first dart (the conventional "treble first");
 * deterministic label tie-break keeps output stable.
 */
function routeQuality(route: Route): number {
  let q = route.length * 10_000
  const setup = route.slice(0, -1)
  for (const d of setup) {
    if (d.ring === 'D') q += 2_000 // setup doubles are unconventional
    if (d.sector === 25) q += 1_500 // outer 25 is an awkward target
  }
  if (setup.length > 0) {
    q -= dartValue(setup[0]) * 10 // reward a big opening dart
    // mildly prefer leaving an even single for the second setup dart
    const last = setup[setup.length - 1]
    if (last.ring === 'S' && last.sector % 2 !== 0) q += 5
  }
  return q
}

function routeSortKey(route: Route): string {
  return route.map((d) => `${d.ring}${String(d.sector).padStart(2, '0')}`).join(' ')
}

/** Best route by quality heuristic; deterministic. */
export function bestRoute(
  score: number,
  maxDarts: 1 | 2 | 3 = 3,
  finalDouble?: Dart
): Route | null {
  const routes = allRoutes(score, maxDarts, finalDouble)
  if (routes.length === 0) return null
  routes.sort((a, b) => {
    const dq = routeQuality(a) - routeQuality(b)
    return dq !== 0 ? dq : routeSortKey(a).localeCompare(routeSortKey(b))
  })
  return routes[0]
}

/** True if any route for `score` (within maxDarts) ends on `dbl`. */
export function canFinishOn(score: number, dbl: Dart, maxDarts: 1 | 2 | 3 = 3): boolean {
  return allRoutes(score, maxDarts, dbl).length > 0
}

/** Validate a user-entered route against a score (any valid finish). */
export function isAlternativeFinish(route: Route, score: number, taught: Route): boolean {
  if (!isValidFinish(route, score)) return false
  if (route.length !== taught.length) return true
  return !route.every((d, i) => sameDart(d, taught[i]))
}
