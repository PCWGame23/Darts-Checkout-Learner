import { describe, it, expect } from 'vitest'
import { buildLesson, buildMissLesson, LESSON_SIZE, MISS_MIN_REMAINDER } from './lessons'
import { STAGES } from './progress'
import type { AppState, ItemProgress } from '../state/store'

function stateWith(items: Record<string, ItemProgress>, favorites = {}): AppState {
  return {
    schemaVersion: 1,
    language: 'de',
    pinHash: null,
    favorites,
    onboarded: true,
    streak: { current: 0, best: 0, lastLessonDate: null },
    items,
    stageUnlocked: 0
  }
}

describe('buildLesson dead-end fallback', () => {
  const today = '2026-06-10'

  it('returns new items for a fresh learner', () => {
    const lesson = buildLesson(stateWith({}), today)
    expect(lesson.length).toBeGreaterThan(0)
    expect(lesson.some((i) => i.isNew)).toBe(true)
  })

  it('still gives a lesson when every unlocked score is practised but none is due', () => {
    // Every stage-0 score touched once (reps 1, < mastery) and scheduled far in
    // the future: no new items, nothing due — this used to yield an empty
    // lesson and a dead path node.
    const future = '2026-12-31'
    const items: Record<string, ItemProgress> = {}
    for (const score of STAGES[0].scores) {
      items[score] = { score, reps: 1, intervalDays: 3, due: future, lapses: 0 }
    }
    const lesson = buildLesson(stateWith(items), today)
    expect(lesson.length).toBeGreaterThan(0)
    expect(lesson.length).toBeLessThanOrEqual(LESSON_SIZE)
    for (const it of lesson) {
      expect(STAGES[0].scores).toContain(it.score)
      expect(it.isNew).toBe(false)
    }
  })
})

describe('buildMissLesson', () => {
  // A learner who has only touched stage-0 (61–80) scores. Miss training must
  // still reach beyond unlocked stages for higher values and setups.
  const earlyLearner = (() => {
    const items: Record<string, ItemProgress> = {}
    for (const score of STAGES[0].scores) {
      items[score] = { score, reps: 1, intervalDays: 3, due: '2026-06-10', lapses: 0 }
    }
    return stateWith(items, { first: 'D20', second: 'D16' })
  })()

  it('drops trivial finishes — every remainder is above the floor', () => {
    const lesson = buildMissLesson(earlyLearner, 12345)
    expect(lesson.length).toBeGreaterThan(0)
    for (const it of lesson) {
      expect(it.miss).toBeDefined()
      expect(it.miss!.remainder).toBeGreaterThan(MISS_MIN_REMAINDER)
    }
  })

  it('pulls from the whole range, beyond the unlocked stage', () => {
    const lesson = buildMissLesson(earlyLearner, 999)
    // Stage 0 caps at 80; higher scores prove we are not gated by unlock.
    expect(lesson.some((it) => it.score > 80)).toBe(true)
  })

  it('mixes finishes and setups roughly 50/50', () => {
    const lesson = buildMissLesson(earlyLearner, 4242)
    const finishes = lesson.filter((it) => it.miss!.kind === 'finish').length
    const setups = lesson.filter((it) => it.miss!.kind === 'setup').length
    expect(finishes).toBeGreaterThan(0)
    expect(setups).toBeGreaterThan(0)
    // Each side should be a meaningful share, not a token one or two.
    expect(Math.min(finishes, setups)).toBeGreaterThanOrEqual(LESSON_SIZE / 2 - 1)
  })

  it('is deterministic for a given seed', () => {
    const a = buildMissLesson(earlyLearner, 7)
    const b = buildMissLesson(earlyLearner, 7)
    expect(a.map((it) => it.score)).toEqual(b.map((it) => it.score))
  })
})
