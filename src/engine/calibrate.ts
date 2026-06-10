// Favourite-double calibration — the app's core differentiator.
//
// The user may set up to two favourite doubles (e.g. D20 and D16).
// For every score we then teach a route that finishes on a favourite
// wherever that makes sense, with this cascade:
//
//   1. If the score IS one of the favourite doubles → take it directly.
//   2. Best route ending on favourite #1, if one exists within the dart
//      budget. A favourite route may use one more dart than the textbook
//      route — that mirrors real play (e.g. 36 → 4, D16 for a D16 lover).
//   3. Otherwise favourite #2. If both exist, fewer darts wins;
//      on a tie favourite #1 has priority.
//   4. Otherwise the textbook route (e.g. 170 stays T20 T20 Bull).

import { type Dart, type Route, dartValue, routeLabel, sameDart } from './darts'
import { bestRoute } from './routes'
import { standardRoute } from './standardChart'

export interface Favorites {
  first?: Dart // must be a double
  second?: Dart
}

export type RouteSource = 'fav1' | 'fav2' | 'standard'

export interface TaughtRoute {
  route: Route
  source: RouteSource
  /** If the score is itself a double, the direct 1-dart finish (UI hint). */
  directAlternative?: Dart
  /**
   * The textbook / pro route, when we are teaching a favourite-tailored
   * route that differs from it. Surfaced as a "pro tip" so the learner also
   * sees the conventional tactical line (e.g. 64 → taught D16 D16, tip T16 D8).
   */
  proTip?: Route
}

function favRoute(score: number, fav: Dart | undefined, maxDarts: 1 | 2 | 3): Route | null {
  if (!fav || fav.ring !== 'D') return null
  return bestRoute(score, maxDarts, fav)
}

function directDouble(score: number): Dart | undefined {
  if (score === 50) return { ring: 'D', sector: 25 }
  if (score >= 2 && score <= 40 && score % 2 === 0) {
    return { ring: 'D', sector: score / 2 }
  }
  return undefined
}

export function taughtRoute(
  score: number,
  favs: Favorites = {},
  maxDarts: 1 | 2 | 3 = 3
): TaughtRoute | null {
  const direct = directDouble(score)

  // 1. The score is a favourite double itself.
  for (const [fav, source] of [
    [favs.first, 'fav1'],
    [favs.second, 'fav2']
  ] as const) {
    if (fav && dartValue(fav) === score) {
      return { route: [fav], source }
    }
  }

  // 2./3. Favourite routes; fewer darts wins, tie goes to favourite #1.
  const r1 = favRoute(score, favs.first, maxDarts)
  const r2 = favRoute(score, favs.second, maxDarts)
  let chosen: TaughtRoute | null = null
  if (r1 && (!r2 || r1.length <= r2.length)) {
    chosen = { route: r1, source: 'fav1' }
  } else if (r2) {
    chosen = { route: r2, source: 'fav2' }
  }

  // 4. Textbook fallback.
  if (!chosen) {
    const std = standardRoute(score)
    if (!std || std.length > maxDarts) return null
    chosen = { route: std, source: 'standard' }
  }

  // Surface the direct finish as a hint when we teach something longer.
  if (direct && !(chosen.route.length === 1 && sameDart(chosen.route[0], direct))) {
    chosen.directAlternative = direct
  }

  // Pro tip: when we tailored the route to a favourite, also show the
  // textbook/tactical line if it's actually different.
  if (chosen.source !== 'standard') {
    const std = standardRoute(score)
    if (std && std.length <= maxDarts && routeLabel(std) !== routeLabel(chosen.route)) {
      chosen.proTip = std
    }
  }
  return chosen
}

/** All routes that count as fully correct: favourite-tailored + pro. */
export function acceptedRoutes(t: TaughtRoute): Route[] {
  return t.proTip ? [t.route, t.proTip] : [t.route]
}

export type FavoriteWarning = 'madhouse' | 'unusual' | null

/**
 * Playful sanity check when picking favourites. D1 is the "madhouse" —
 * legal, but nobody should aim there on purpose. Low odd doubles are
 * flagged as unusual (missing inside leaves an odd number, killing the
 * next double attempt).
 */
export function favoriteWarning(d: Dart): FavoriteWarning {
  if (d.ring !== 'D') return null
  if (d.sector === 1) return 'madhouse'
  if (d.sector !== 25 && d.sector % 2 === 1 && d.sector < 15) return 'unusual'
  return null
}
