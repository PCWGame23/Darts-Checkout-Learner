// Progression tree: 5 units partitioning the *learnable* checkouts.
//
// We deliberately teach only scores 61–170. The 1-dart doubles (2–40, Bull)
// and the easy 41–60 two-dart finishes are trivial mental math, so they are
// not part of the curriculum.

import { FINISHABLE_SCORES } from '../engine/routes'
import type { TranslationKey } from '../i18n'
import type { AppState } from '../state/store'

export interface Stage {
  id: number
  nameKey: TranslationKey
  scores: number[]
}

/** Lowest score we teach. Everything below this is trivial. */
export const MIN_LEARN_SCORE = 61

/** An item counts as mastered after two successful spaced reviews. */
export const MASTERY_REPS = 2
/** Unlock the next stage once this share of the current stage is mastered. */
export const UNLOCK_THRESHOLD = 0.7

/** Every learnable score (61–170, bogeys already excluded). */
export const LEARN_SCORES: readonly number[] = Object.freeze(
  FINISHABLE_SCORES.filter((s) => s >= MIN_LEARN_SCORE)
)

// Each learnable score belongs to exactly one unit of 20:
//   0: 61–80   1: 81–100   2: 101–120   3: 121–140   4: 141–170
function stageIdOf(score: number): number {
  if (score < MIN_LEARN_SCORE) return -1
  if (score <= 80) return 0
  if (score <= 100) return 1
  if (score <= 120) return 2
  if (score <= 140) return 3
  return 4
}

export const STAGES: readonly Stage[] = Object.freeze(
  [0, 1, 2, 3, 4].map((id) => ({
    id,
    nameKey: `stage.${id}` as TranslationKey,
    scores: LEARN_SCORES.filter((s) => stageIdOf(s) === id)
  }))
)

export function stageOfScore(score: number): Stage | null {
  const id = stageIdOf(score)
  return id < 0 ? null : STAGES[id]
}

/** Scores fully mastered (>= MASTERY_REPS successful reviews). */
export function masteredCount(state: AppState, stage: Stage): number {
  return stage.scores.filter((s) => (state.items[s]?.reps ?? 0) >= MASTERY_REPS).length
}

/** Scores the learner has practiced at least once (seen in a lesson). */
export function practicedCount(state: AppState, stage: Stage): number {
  return stage.scores.filter((s) => state.items[s] !== undefined).length
}

/**
 * Stage fill for the progress bar, 0..1. A practiced-but-not-mastered
 * checkout counts as half, a mastered one as full — so the bar moves the
 * first time you touch a checkout, then completes as you master it.
 */
export function stageProgress(state: AppState, stage: Stage): number {
  if (stage.scores.length === 0) return 0
  let acc = 0
  for (const s of stage.scores) {
    const reps = state.items[s]?.reps ?? 0
    const touched = state.items[s] !== undefined
    acc += reps >= MASTERY_REPS ? 1 : touched ? 0.5 : 0
  }
  return acc / stage.scores.length
}

export function isStageComplete(state: AppState, stage: Stage): boolean {
  return masteredCount(state, stage) >= Math.ceil(stage.scores.length * UNLOCK_THRESHOLD)
}

/** Recompute the highest unlocked stage from item progress. */
export function computeUnlockedStage(state: AppState): number {
  let unlocked = 0
  for (const stage of STAGES) {
    if (isStageComplete(state, stage)) unlocked = Math.min(stage.id + 1, STAGES.length - 1)
    else break
  }
  return Math.max(unlocked, state.stageUnlocked)
}

/** The unit the learner is currently working on (lowest unlocked, unfinished). */
export function currentStageId(state: AppState): number {
  const unlocked = computeUnlockedStage(state)
  for (const stage of STAGES) {
    if (stage.id <= unlocked && !isStageComplete(state, stage)) return stage.id
  }
  return unlocked
}
