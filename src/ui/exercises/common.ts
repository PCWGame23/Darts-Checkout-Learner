import { acceptedRoutes } from '../../engine/calibrate'
import {
  gradeMissAnswer,
  missAcceptedRoutes,
  mulberry32,
  type MissChallenge
} from '../../engine/miss'
import { routeLabel, sameDart, type Route } from '../../engine/darts'
import { isValidFinish } from '../../engine/routes'
import type { Grade } from '../../learn/scheduler'
import type { LessonItem } from '../../learn/lessons'

export interface ExerciseProps {
  item: LessonItem
  onAnswer: (grade: Grade, built?: Route) => void
}

function exactMatch(built: Route, route: Route): boolean {
  return built.length === route.length && built.every((d, i) => sameDart(d, route[i]))
}

/** Accepted routes for a lesson item (handles miss challenges). */
export function acceptedFor(item: LessonItem): Route[] {
  return item.miss ? missAcceptedRoutes(item.miss) : acceptedRoutes(item.taught)
}

/** Grade a user-built route: exact (fav or pro) → good, valid alternative → almost. */
export function gradeBuilt(built: Route, item: LessonItem): Grade {
  if (item.miss) return gradeMissAnswer(built, item.miss)
  if (acceptedRoutes(item.taught).some((route) => exactMatch(built, route))) return 'good'
  if (isValidFinish(built, item.score)) return 'almost'
  return 'again'
}

/** Deterministic PRNG so tile banks are stable for a given score. */
export { mulberry32 }

export function keyOf(route: Route): string {
  return routeLabel(route)
}
