// Daily lesson builder: ~10 exercises mixing due reviews with new items
// from the current stage, plus streak bookkeeping and recalibration.

import { parseDart, type Route } from '../engine/darts'
import { taughtRoute, type Favorites, type TaughtRoute } from '../engine/calibrate'
import {
  buildMissChallenge,
  missEligible,
  mulberry32,
  type MissChallenge
} from '../engine/miss'
import {
  getState,
  setState,
  todayISO,
  type AppState,
  type ItemProgress
} from '../state/store'
import {
  computeUnlockedStage,
  isStageComplete,
  LEARN_SCORES,
  MASTERY_REPS,
  STAGES
} from './progress'
import { dueItems, gradeItem, newItem, type Grade } from './scheduler'

export type ExerciseType = 'board' | 'tiles' | 'match'

/** One route↔score pair shown in a matching exercise. */
export interface MatchPair {
  score: number
  route: Route
}

export interface LessonItem {
  score: number
  exercise: ExerciseType
  isNew: boolean
  taught: TaughtRoute
  miss?: MissChallenge
  /** Present only on a 'match' exercise: the pairs to connect. */
  match?: MatchPair[]
}

export const LESSON_SIZE = 10
const MAX_NEW_PER_LESSON = 4
/** A matching warm-up needs at least this many pairs, and shows at most this many. */
const MATCH_MIN = 3
const MATCH_MAX = 5
export const MISS_UNLOCK_MIN = 5
/** Miss training drops trivial finishes: any remainder this low or below is
 *  a one-/easy-two-dart checkout and not worth drilling. */
export const MISS_MIN_REMAINDER = 60

/** Deterministic shuffle so a given seed always yields the same order. */
function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const a = [...arr]
  let s = (seed >>> 0) || 1
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** A stable per-day seed so a lesson's order is fixed within the day. */
function daySeed(today: string): number {
  return [...today].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7)
}

export function favoritesOf(state: AppState): Favorites {
  return {
    first: state.favorites.first ? parseDart(state.favorites.first) : undefined,
    second: state.favorites.second ? parseDart(state.favorites.second) : undefined
  }
}

function pickExercise(_taught: TaughtRoute, isNew: boolean, seed: number): ExerciseType {
  // A brand-new checkout is taught with the tile bank (you assemble the
  // route, Duolingo style). Reviews alternate between assembling tiles and
  // entering darts freehand on the board. Every learnable score (61+) needs
  // at least 2 darts, so tiles always apply.
  if (isNew) return 'tiles'
  return seed % 2 === 0 ? 'board' : 'tiles'
}

export function buildLesson(state = getState(), today = todayISO()): LessonItem[] {
  const favs = favoritesOf(state)
  const items: LessonItem[] = []

  // 1. Due reviews, most overdue first.
  for (const it of dueItems(state.items, today).slice(0, LESSON_SIZE - 2)) {
    const taught = taughtRoute(it.score, favs)
    if (taught) {
      const roll = mulberry32(daySeed(today) ^ (it.score * 31))()
      const miss = !it.isNew && roll < 0.2 ? buildMissChallenge(it.score, favs) : undefined
      items.push({
        score: it.score,
        exercise: pickExercise(taught, false, it.score + it.reps),
        isNew: false,
        taught,
        miss: miss ?? undefined
      })
    }
  }

  // 2. Fill with new items from the lowest unlocked, unfinished stage.
  //    Within a unit the scores are shuffled (per-day stable) so you don't
  //    grind them in numeric order — 65, 69, 70, 61, … not 61, 62, 63, …
  const unlocked = computeUnlockedStage(state)
  const newSlots = Math.min(MAX_NEW_PER_LESSON, LESSON_SIZE - items.length)
  outer: for (const stage of STAGES) {
    if (stage.id > unlocked) break
    for (const score of seededShuffle(stage.scores, daySeed(today) ^ (stage.id + 1))) {
      if (items.filter((i) => i.isNew).length >= newSlots) break outer
      if (state.items[score]) continue
      const taught = taughtRoute(score, favs)
      if (taught) items.push({ score, exercise: pickExercise(taught, true, score), isNew: true, taught })
    }
  }

  // 3. Fallback: nothing due today and no new scores left in the unlocked
  //    stages would otherwise produce an empty lesson — and an empty lesson
  //    makes the path nodes look dead (LessonScreen exits immediately). Keep
  //    practising the not-yet-mastered scores so the learner can push toward
  //    mastery instead of being stuck waiting for tomorrow's reviews.
  if (items.length === 0) {
    const unlockedScores = STAGES.filter((s) => s.id <= unlocked).flatMap((s) => s.scores)
    const practised = unlockedScores
      .map((score) => state.items[score])
      .filter((it): it is ItemProgress => !!it && it.reps < MASTERY_REPS)
      .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0))
    const fallback = practised.length > 0 ? practised.map((it) => it.score) : unlockedScores
    for (const score of fallback.slice(0, LESSON_SIZE)) {
      const taught = taughtRoute(score, favs)
      if (taught) {
        const reps = state.items[score]?.reps ?? 0
        items.push({
          score,
          exercise: pickExercise(taught, false, score + reps),
          isNew: false,
          taught
        })
      }
    }
  }

  // Interleave reviews and new items so the lesson doesn't feel ordered.
  const ordered = seededShuffle(items, daySeed(today))

  // Lead with a Duolingo-style matching warm-up built from the lesson's own
  // scores (route ↔ value). Reinforces the same checkouts before drilling them.
  const match = buildMatchItem(ordered, daySeed(today))
  return match ? [match, ...ordered] : ordered
}

/** Build a matching warm-up from a lesson's items (route ↔ score pairs), or
 *  null if there aren't enough distinct checkouts to make it worthwhile. */
function buildMatchItem(items: LessonItem[], seed: number): LessonItem | null {
  const seen = new Set<number>()
  const pool: LessonItem[] = []
  for (const it of items) {
    if (seen.has(it.score)) continue
    seen.add(it.score)
    pool.push(it)
  }
  if (pool.length < MATCH_MIN) return null
  const chosen = seededShuffle(pool, seed ^ 0x5f3759df).slice(0, MATCH_MAX)
  return {
    score: chosen[0].score,
    exercise: 'match',
    isNew: false,
    taught: chosen[0].taught,
    match: chosen.map((it) => ({ score: it.score, route: it.taught.route }))
  }
}

/**
 * Endless practice: once every unit is mastered, keep sharp by drilling a
 * random mix drawn from every category. Each session reshuffles (seeded by
 * the clock) and never "runs out".
 */
export function buildEndlessLesson(
  state = getState(),
  seed = Date.now()
): LessonItem[] {
  const favs = favoritesOf(state)
  const pool = seededShuffle(LEARN_SCORES, seed).slice(0, LESSON_SIZE)
  const items: LessonItem[] = []
  pool.forEach((score, i) => {
    const taught = taughtRoute(score, favs)
    if (taught) items.push({ score, exercise: pickExercise(taught, false, score + i), isNew: false, taught })
  })
  return items
}

interface MissCandidate {
  score: number
  miss: MissChallenge
  taught: TaughtRoute
}

/** Draw `n` items without replacement, weighting by `remainder` so higher
 *  (harder) finishes/setups come up more often without killing variety. */
function weightedSample(pool: MissCandidate[], n: number, rand: () => number): MissCandidate[] {
  const rest = [...pool]
  const picked: MissCandidate[] = []
  while (picked.length < n && rest.length > 0) {
    const total = rest.reduce((sum, c) => sum + c.miss.remainder, 0)
    let r = rand() * total
    let idx = rest.length - 1
    for (let i = 0; i < rest.length; i++) {
      r -= rest[i].miss.remainder
      if (r <= 0) {
        idx = i
        break
      }
    }
    picked.push(rest.splice(idx, 1)[0])
  }
  return picked
}

/**
 * Build a dedicated miss-training lesson. Pulls from the whole learn range
 * (61–170, regardless of unlocked stage), drops trivial finishes (remainder
 * ≤ MISS_MIN_REMAINDER), and aims for a 50/50 mix of checkable 2-dart finishes
 * and "must set up a double" challenges — biased toward higher values.
 */
export function buildMissLesson(state = getState(), seed = Date.now()): LessonItem[] {
  const favs = favoritesOf(state)
  const rand = mulberry32(seed)

  const candidates: MissCandidate[] = []
  for (const score of LEARN_SCORES) {
    if (!missEligible(score, favs)) continue
    const miss = buildMissChallenge(score, favs)
    if (!miss || miss.remainder <= MISS_MIN_REMAINDER) continue
    const taught = taughtRoute(score, favs)
    if (!taught) continue
    candidates.push({ score, miss, taught })
  }

  const finishes = candidates.filter((c) => c.miss.kind === 'finish')
  const setups = candidates.filter((c) => c.miss.kind === 'setup')

  const half = Math.floor(LESSON_SIZE / 2)
  const pickedFinish = weightedSample(finishes, half, rand)
  const pickedSetup = weightedSample(setups, LESSON_SIZE - half, rand)
  // Top up from the other bucket if one ran short, so we still fill the lesson.
  const selected = [...pickedFinish, ...pickedSetup]
  if (selected.length < LESSON_SIZE) {
    const usedScores = new Set(selected.map((c) => c.score))
    const leftover = candidates.filter((c) => !usedScores.has(c.score))
    selected.push(...weightedSample(leftover, LESSON_SIZE - selected.length, rand))
  }

  const ordered = seededShuffle(selected, seed)
  return ordered.map((c, i) => ({
    score: c.score,
    exercise: (i % 2 === 0 ? 'board' : 'tiles') as ExerciseType,
    isNew: false,
    taught: c.taught,
    miss: c.miss
  }))
}

/** True once the learner has mastered every unit — unlocks endless mode. */
export function allUnitsComplete(state = getState()): boolean {
  return STAGES.every((stage) => isStageComplete(state, stage))
}

/** True once enough practiced checkouts are miss-eligible. */
export function missTrainingUnlocked(state = getState()): boolean {
  const favs = favoritesOf(state)
  let count = 0
  for (const score of LEARN_SCORES) {
    const item = state.items[score]
    if (item && item.reps >= 1 && missEligible(score, favs)) {
      count++
      if (count >= MISS_UNLOCK_MIN) return true
    }
  }
  return false
}

/** Record an answer; returns the updated item. */
export function recordAnswer(score: number, grade: Grade, today = todayISO()): ItemProgress {
  const state = getState()
  const existing = state.items[score] ?? newItem(score, today)
  const updated = gradeItem(existing, grade, today)
  setState((s) => ({
    items: { ...s.items, [score]: updated }
  }))
  setState((s) => ({ stageUnlocked: computeUnlockedStage(s) }))
  return updated
}

/** Mark today's lesson complete and update the streak. */
export function completeLesson(today = todayISO()): void {
  setState((s) => {
    const last = s.streak.lastLessonDate
    if (last === today) return {} // already counted today
    const yesterday = (() => {
      const [y, m, d] = today.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      date.setDate(date.getDate() - 1)
      return todayISO(date)
    })()
    const current = last === yesterday ? s.streak.current + 1 : 1
    return {
      streak: {
        current,
        best: Math.max(current, s.streak.best),
        lastLessonDate: today
      }
    }
  })
}

/**
 * Apply new favourites: every learned item whose taught route changes
 * gets flagged for immediate re-review.
 */
export function applyFavorites(first?: string, second?: string): number {
  const state = getState()
  const oldFavs = favoritesOf(state)
  const newFavs: Favorites = {
    first: first ? parseDart(first) : undefined,
    second: second ? parseDart(second) : undefined
  }
  const today = todayISO()
  let changed = 0
  const items = { ...state.items }
  for (const key of Object.keys(items)) {
    const score = Number(key)
    const before = taughtRoute(score, oldFavs)
    const after = taughtRoute(score, newFavs)
    const beforeLabel = before?.route.map((d) => `${d.ring}${d.sector}`).join(' ')
    const afterLabel = after?.route.map((d) => `${d.ring}${d.sector}`).join(' ')
    if (beforeLabel !== afterLabel) {
      items[key] = { ...items[key], due: today, reps: 0 }
      changed++
    }
  }
  setState({ favorites: { first, second }, items })
  return changed
}
