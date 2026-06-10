import { acceptedRoutes } from '../../engine/calibrate'
import {
  gradeMissAnswer,
  missAcceptedRoutes,
  mulberry32,
  type MissChallenge
} from '../../engine/miss'
import { dartLabel, routeLabel, type Dart, type Route } from '../../engine/darts'
import { allRoutes, isValidFinish } from '../../engine/routes'
import type { Grade } from '../../learn/scheduler'
import type { LessonItem } from '../../learn/lessons'

export interface ExerciseProps {
  item: LessonItem
  onAnswer: (grade: Grade, built?: Route) => void
}

/** Accepted routes for a lesson item (handles miss challenges). */
export function acceptedFor(item: LessonItem): Route[] {
  return item.miss ? missAcceptedRoutes(item.miss) : acceptedRoutes(item.taught)
}

/** Grade a user-built route: any mathematically valid finish counts as fully
 *  correct (good) — the taught/pro route is only a recommendation. */
export function gradeBuilt(built: Route, item: LessonItem): Grade {
  if (item.miss) return gradeMissAnswer(built, item.miss)
  if (isValidFinish(built, item.score)) return 'good'
  return 'again'
}

/** The value being finished: a miss remainder, otherwise the score itself. */
function targetValue(item: LessonItem): number {
  return item.miss ? item.miss.remainder : item.score
}

/** Highest dart count we render input slots for (the taught route's length). */
export function maxDartsFor(item: LessonItem): number {
  return Math.max(...acceptedFor(item).map((r) => r.length))
}

/** Lengths at which the user may submit: any valid finish length up to the
 *  taught route's dart count. Setup misses keep their fixed (2-dart) length. */
export function submittableLengths(item: LessonItem): number[] {
  const accepted = acceptedFor(item)
  if (item.miss?.kind === 'setup') return accepted.map((r) => r.length)
  const maxNeed = maxDartsFor(item) as 1 | 2 | 3
  const lengths = new Set(accepted.map((r) => r.length))
  for (const r of allRoutes(targetValue(item), maxNeed)) lengths.add(r.length)
  return [...lengths]
}

/** Darts that appear in some valid finish of the target — used to seed a few
 *  alternative-enabling tiles so the player isn't locked into one route.
 *  Empty for new checkouts (keep teaching focused) and setup misses. */
export function alternativeFinishDarts(item: LessonItem): Dart[] {
  if (item.isNew || item.miss?.kind === 'setup') return []
  const maxNeed = maxDartsFor(item) as 1 | 2 | 3
  const byLabel = new Map<string, Dart>()
  for (const r of allRoutes(targetValue(item), maxNeed))
    for (const d of r) byLabel.set(dartLabel(d), d)
  return [...byLabel.values()]
}

/** Deterministic PRNG so tile banks are stable for a given score. */
export { mulberry32 }

export function keyOf(route: Route): string {
  return routeLabel(route)
}
