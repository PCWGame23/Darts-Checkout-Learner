import { describe, expect, it } from 'vitest'
import { dartLabel, parseDart, routeLabel, routeValue } from './darts'
import { type Favorites, taughtRoute } from './calibrate'
import {
  MISS_UNLOCK_MIN,
  buildLesson,
  buildMissLesson,
  missTrainingUnlocked
} from '../learn/lessons'
import { defaultState, type AppState } from '../state/store'
import {
  bestSetupRoute,
  buildMissChallenge,
  gradeMissAnswer,
  missEligible,
  missIntendedDart
} from './miss'
import { minDartsToFinish } from './routes'

const D = (sector: number) => ({ ring: 'D' as const, sector })
const T = (sector: number) => ({ ring: 'T' as const, sector })
const S = (sector: number) => ({ ring: 'S' as const, sector })

const favD16: Favorites = { first: D(16) }
const favD20D16: Favorites = { first: D(20), second: D(16) }

describe('missIntendedDart', () => {
  it('78 no favs → T18', () => {
    const d = missIntendedDart(78, {})!
    expect(d).toEqual(T(18))
  })

  it('78 fav D16 → T15 (fav route)', () => {
    const d = missIntendedDart(78, favD16)!
    expect(d).toEqual(T(15))
  })

  it('125 no favs is ineligible (starts on 25)', () => {
    expect(missIntendedDart(125, {})).toBeNull()
  })

  it('64 fav D16 → T16 D8 (textbook; the favourite "D16 D16" would open on a double)', () => {
    const t = taughtRoute(64, favD16)!
    expect(routeLabel(t.route)).toBe('T16 D8')
    const d = missIntendedDart(64, favD16)!
    expect(d).toEqual(T(16))
  })
})

describe('classifyRemainder', () => {
  it('finish: 110/107/104/101 (2-dart finishes)', () => {
    for (const score of [110, 107, 104, 101]) {
      expect(minDartsToFinish(score)).toBe(2)
    }
  })

  it('setup: 109/105/111 (3-dart only)', () => {
    for (const score of [109, 105, 111]) {
      expect(minDartsToFinish(score)).toBe(3)
    }
  })
})

describe('finish grading', () => {
  it('R=60: any valid finish good, non-double again, wrong sum again', () => {
    const c = buildMissChallenge(78, {})! // T18 → S18, R=60
    expect(c.remainder).toBe(60)
    expect(c.kind).toBe('finish')

    expect(gradeMissAnswer([S(20), D(20)], c)).toBe('good')
    expect(gradeMissAnswer([D(10), D(20)], c)).toBe('good') // valid alt = fully correct
    expect(gradeMissAnswer([T(20)], c)).toBe('again')
    expect(gradeMissAnswer([S(20), D(18)], c)).toBe('again')
  })

  it('direct double (63 → T13, R=50): Bull good in 1 dart', () => {
    const c = buildMissChallenge(63, {})!
    expect(c.remainder).toBe(50)
    expect(c.direct).toEqual(D(25))
    expect(gradeMissAnswer([D(25)], c)).toBe('good')
    expect(gradeMissAnswer([S(10), D(20)], c)).toBe('good') // taught route
    expect(gradeMissAnswer([S(18), D(16)], c)).toBe('good') // valid alt = fully correct
  })
})

describe('setup grading', () => {
  it('131 → T20, R=111, fav D16: leave 32 good, leave 40 almost, busts again', () => {
    const c = buildMissChallenge(131, favD16)!
    expect(c.remainder).toBe(111)
    expect(c.kind).toBe('setup')
    expect(c.goodLeaves).toContain(32)

    // A route that leaves 32 (good)
    const goodRoute = [T(20), S(19)] // 60+19=79, leave=32
    expect(gradeMissAnswer(goodRoute, c)).toBe('good')

    // T19 14 → 57+14=71, leave=40 (double but not fav)
    expect(gradeMissAnswer([T(19), S(14)], c)).toBe('almost')

    // T20 T17 → 60+51=111, leave=0 (bust / no double left)
    expect(gradeMissAnswer([T(20), T(17)], c)).toBe('again')

    // T20 T20 → 120 > 111, busts mid-route
    expect(gradeMissAnswer([T(20), T(20)], c)).toBe('again')

    // T20 18 → 78, leave=33 (not a double)
    expect(gradeMissAnswer([T(20), S(18)], c)).toBe('again')
  })
})

describe('bestSetupRoute fallback', () => {
  it('170 fav D16 → R=150: leave 32 impossible, falls back to leave 40', () => {
    const c = buildMissChallenge(170, favD16)!
    expect(c.remainder).toBe(150)
    expect(c.kind).toBe('setup')
    expect(c.goodLeaves).toEqual([40])

    const best = c.bestSetup!
    expect(routeValue(best)).toBe(110) // leaves 40
    expect(gradeMissAnswer(best, c)).toBe('good')

    // T20 T20 leaves 30 → almost
    expect(gradeMissAnswer([T(20), T(20)], c)).toBe('almost')
  })
})

describe('eligibility', () => {
  it('125 no favs is ineligible', () => {
    expect(missEligible(125, {})).toBe(false)
    expect(buildMissChallenge(125, {})).toBeNull()
  })

  it('stage 0 scores are all eligible (all start with triples)', () => {
    for (const score of [61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80]) {
      expect(missEligible(score, {}), `score ${score}`).toBe(true)
    }
  })
})

describe('bestSetupRoute', () => {
  it('finds a 2-dart setup when one exists', () => {
    const route = bestSetupRoute(111, favD16)
    expect(route).not.toBeNull()
    expect(route!.length).toBe(2)
    const leave = 111 - routeValue(route!)
    expect(leave).toBe(32) // fav D16
  })

  it('falls back to non-fav leave when fav is unreachable', () => {
    const route = bestSetupRoute(150, favD16)
    expect(route).not.toBeNull()
    const leave = 150 - routeValue(route!)
    expect(leave).toBe(40) // D20, since 32 is unreachable
  })
})

describe('lesson builders', () => {
  it('buildMissLesson empty state pads from unlocked stage 0', () => {
    const state = defaultState()
    state.onboarded = true
    const lesson = buildMissLesson(state)
    // Stage 0 is unlocked by default, so it pads from eligible scores 61–80
    expect(lesson.length).toBeGreaterThan(0)
    expect(lesson.length).toBeLessThanOrEqual(10)
    expect(lesson.every((it) => it.miss !== undefined)).toBe(true)
  })

  it('buildMissLesson with ≥5 practiced eligible scores returns full lesson', () => {
    const state = defaultState()
    state.onboarded = true
    // Practice 5 stage-0 scores
    const practiced = [61, 62, 63, 64, 65]
    for (const score of practiced) {
      state.items[score] = { score, reps: 1, intervalDays: 1, due: '2024-01-01', lapses: 0 }
    }
    const lesson = buildMissLesson(state)
    expect(lesson.length).toBeGreaterThanOrEqual(MISS_UNLOCK_MIN)
    expect(lesson.length).toBeLessThanOrEqual(10)
    // All items have miss
    expect(lesson.every((it) => it.miss !== undefined)).toBe(true)
    // Exercises alternate
    const hasBoard = lesson.some((it) => it.exercise === 'board')
    const hasTiles = lesson.some((it) => it.exercise === 'tiles')
    expect(hasBoard || lesson.length <= 1).toBe(true)
    expect(hasTiles || lesson.length <= 1).toBe(true)
  })

  it('buildLesson miss flags are deterministic and only on reviews', () => {
    const state = defaultState()
    state.onboarded = true
    // Create practiced items so there are reviews
    const practiced = [61, 62, 63, 64, 65, 66, 67, 68, 69, 70]
    for (const score of practiced) {
      state.items[score] = { score, reps: 1, intervalDays: 1, due: '2024-01-01', lapses: 0 }
    }
    const lesson1 = buildLesson(state, '2024-01-01')
    const lesson2 = buildLesson(state, '2024-01-01')
    expect(lesson1).toEqual(lesson2)

    // No new items should have miss
    const newItems = lesson1.filter((it) => it.isNew)
    expect(newItems.every((it) => it.miss === undefined)).toBe(true)
  })

  it('missTrainingUnlocked boundary', () => {
    const state = defaultState()
    state.onboarded = true
    // 4 practiced scores → locked
    for (const score of [61, 62, 63, 64]) {
      state.items[score] = { score, reps: 1, intervalDays: 1, due: '2024-01-01', lapses: 0 }
    }
    expect(missTrainingUnlocked(state)).toBe(false)

    // 5th practiced score → unlocked
    state.items[65] = { score: 65, reps: 1, intervalDays: 1, due: '2024-01-01', lapses: 0 }
    expect(missTrainingUnlocked(state)).toBe(true)
  })
})
