import { describe, expect, it } from 'vitest'
import {
  DOUBLES,
  dartLabel,
  dartValue,
  parseDart,
  parseRoute,
  routeLabel
} from './darts'
import {
  BOGEY_NUMBERS,
  FINISHABLE_SCORES,
  allRoutes,
  bestRoute,
  isValidFinish,
  minDartsToFinish
} from './routes'
import { STANDARD_CHART_SCORES, standardRoute } from './standardChart'
import { favoriteWarning, taughtRoute } from './calibrate'

const D = (sector: number) => ({ ring: 'D' as const, sector })

describe('darts model', () => {
  it('labels and parses round-trip for every dart', () => {
    for (const d of [...DOUBLES, parseDart('T20'), parseDart('25'), parseDart('7')]) {
      expect(parseDart(dartLabel(d))).toEqual(d)
    }
  })

  it('values are correct', () => {
    expect(dartValue(parseDart('T20'))).toBe(60)
    expect(dartValue(parseDart('Bull'))).toBe(50)
    expect(dartValue(parseDart('25'))).toBe(25)
    expect(dartValue(parseDart('D16'))).toBe(32)
    expect(dartValue(parseDart('7'))).toBe(7)
  })

  it('rejects nonsense darts', () => {
    expect(() => parseDart('T25')).toThrow()
    expect(() => parseDart('D21')).toThrow()
    expect(() => parseDart('X5')).toThrow()
  })
})

describe('standard chart', () => {
  it('covers exactly the finishable scores 2–170', () => {
    expect(STANDARD_CHART_SCORES).toEqual(FINISHABLE_SCORES)
  })

  it('every entry sums to its score and ends on a double', () => {
    for (const score of STANDARD_CHART_SCORES) {
      const route = standardRoute(score)!
      expect(isValidFinish(route, score), `${score}: ${routeLabel(route)}`).toBe(true)
    }
  })

  it('never wastes more than one dart over the minimum', () => {
    for (const score of STANDARD_CHART_SCORES) {
      const route = standardRoute(score)!
      const min = minDartsToFinish(score)!
      expect(route.length, `score ${score}`).toBeLessThanOrEqual(min + 1)
    }
  })

  it('has no routes for bogey numbers', () => {
    for (const bogey of BOGEY_NUMBERS) expect(standardRoute(bogey)).toBeNull()
  })

  it('matches famous checkouts', () => {
    expect(routeLabel(standardRoute(170)!)).toBe('T20 T20 Bull')
    expect(routeLabel(standardRoute(167)!)).toBe('T20 T19 Bull')
    expect(routeLabel(standardRoute(100)!)).toBe('T20 D20')
    expect(routeLabel(standardRoute(40)!)).toBe('D20')
    expect(routeLabel(standardRoute(2)!)).toBe('D1')
  })
})

describe('route generator', () => {
  it('bogey numbers have no 3-dart routes', () => {
    for (const bogey of BOGEY_NUMBERS) expect(allRoutes(bogey, 3)).toHaveLength(0)
  })

  it('every finishable score has at least one route', () => {
    for (const score of FINISHABLE_SCORES) {
      expect(allRoutes(score, 3).length, `score ${score}`).toBeGreaterThan(0)
    }
  })

  it('every generated route is a valid finish', () => {
    for (const score of [2, 19, 41, 67, 99, 110, 125, 158, 170]) {
      for (const route of allRoutes(score, 3)) {
        expect(isValidFinish(route, score), `${score}: ${routeLabel(route)}`).toBe(true)
      }
    }
  })

  it('170 has exactly one route', () => {
    const routes = allRoutes(170, 3)
    expect(routes).toHaveLength(1)
    expect(routeLabel(routes[0])).toBe('T20 T20 Bull')
  })

  it('never routes through a remaining score of 1', () => {
    // For 3 the only route is 1, D1 — never 2 followed by an impossible 1.
    const routes = allRoutes(3, 3)
    expect(routes.map(routeLabel)).toEqual(['1 D1'])
  })

  it('minDartsToFinish is correct', () => {
    expect(minDartsToFinish(170)).toBe(3)
    expect(minDartsToFinish(110)).toBe(2)
    expect(minDartsToFinish(99)).toBe(3) // famous: no 2-dart finish for 99
    expect(minDartsToFinish(50)).toBe(1) // Bull
    expect(minDartsToFinish(40)).toBe(1)
    expect(minDartsToFinish(169)).toBeNull()
  })

  it('isValidFinish rejects busts and non-double endings', () => {
    expect(isValidFinish(parseRoute('T20 20'), 80)).toBe(false) // no double
    expect(isValidFinish(parseRoute('T20 D20'), 90)).toBe(false) // wrong sum
    expect(isValidFinish(parseRoute('2 D1'), 3)).toBe(false) // through 1
  })
})

describe('calibration cascade', () => {
  const favs = { first: D(20), second: D(16) }

  it('uses favourite #1 when it needs no more darts', () => {
    const t = taughtRoute(100, favs)!
    expect(routeLabel(t.route)).toBe('T20 D20')
    expect(t.source).toBe('fav1')
  })

  it('falls back to favourite #2 when #1 is impossible', () => {
    const t = taughtRoute(36, favs)!
    expect(routeLabel(t.route)).toBe('4 D16')
    expect(t.source).toBe('fav2')
    expect(t.directAlternative).toEqual(D(18)) // hint: D18 is the direct finish
  })

  it('prefers fewer darts between the two favourites', () => {
    // 72: D20 needs 32 = one dart? No single 32 → T? 32 not /3 → 2 setup darts (3 total).
    // D16 needs 40 = one dart (S? no, D20 setup... T? no) — 40 in one dart impossible,
    // so both need 3... use 48 instead: D20→8 (2 darts), D16→16 (2 darts): tie → fav1.
    const t48 = taughtRoute(48, favs)!
    expect(t48.source).toBe('fav1')
    expect(routeLabel(t48.route)).toBe('8 D20')
  })

  it('takes the favourite double directly when the score matches', () => {
    const t = taughtRoute(32, favs)!
    expect(routeLabel(t.route)).toBe('D16')
    expect(t.source).toBe('fav2')
  })

  it('falls back to the textbook route when no favourite works', () => {
    const t = taughtRoute(170, favs)!
    expect(routeLabel(t.route)).toBe('T20 T20 Bull')
    expect(t.source).toBe('standard')
  })

  it('reroutes even 1-dart scores to a favourite (real-play habit)', () => {
    const t = taughtRoute(40, { first: D(16) })!
    expect(routeLabel(t.route)).toBe('8 D16')
    expect(t.source).toBe('fav1')
    expect(t.directAlternative).toEqual(D(20))
  })

  it('without favourites teaches the textbook chart', () => {
    const t = taughtRoute(96)!
    expect(routeLabel(t.route)).toBe('T20 D18')
    expect(t.source).toBe('standard')
  })

  it('returns null for bogey numbers', () => {
    expect(taughtRoute(165, favs)).toBeNull()
  })

  it('every finishable score gets a taught route ending on a double', () => {
    for (const score of FINISHABLE_SCORES) {
      const t = taughtRoute(score, favs)!
      expect(isValidFinish(t.route, score), `score ${score}`).toBe(true)
    }
  })

  it('favourite routes actually end on the favourite', () => {
    for (const score of FINISHABLE_SCORES) {
      const t = taughtRoute(score, favs)!
      const last = t.route[t.route.length - 1]
      if (t.source === 'fav1') expect(last).toEqual(D(20))
      if (t.source === 'fav2') expect(last).toEqual(D(16))
    }
  })

  it('never teaches a multi-dart route that opens on a double (treble first)', () => {
    const configs = [{}, { first: D(20) }, { first: D(16) }, favs, { first: D(18), second: D(10) }]
    for (const cfg of configs) {
      for (const score of FINISHABLE_SCORES) {
        const t = taughtRoute(score, cfg)
        if (!t || t.route.length < 2) continue
        expect(t.route[0].ring, `score ${score} cfg ${JSON.stringify(cfg)} → ${routeLabel(t.route)}`).not.toBe('D')
      }
    }
  })
})

describe('favourite warnings', () => {
  it('D1 is the madhouse', () => expect(favoriteWarning(D(1))).toBe('madhouse'))
  it('low odd doubles are unusual', () => {
    expect(favoriteWarning(D(3))).toBe('unusual')
    expect(favoriteWarning(D(13))).toBe('unusual')
  })
  it('normal favourites pass silently', () => {
    expect(favoriteWarning(D(20))).toBeNull()
    expect(favoriteWarning(D(16))).toBeNull()
    expect(favoriteWarning(D(25))).toBeNull() // Bull is a legit favourite
  })
})

describe('bestRoute convention', () => {
  it('prefers the conventional T20 setup for favourite reroutes', () => {
    // 100 forced onto D16: convention is T20, 8, D16.
    expect(routeLabel(bestRoute(100, 3, D(16))!)).toBe('T20 8 D16')
  })
})
