import { describe, expect, it } from 'vitest'
import { acceptedRoutes, taughtRoute } from '../../engine/calibrate'
import { dartLabel, parseDart, parseRoute, routeLabel } from '../../engine/darts'
import { standardRoute } from '../../engine/standardChart'
import type { LessonItem } from '../../learn/lessons'
import { gradeBuilt } from './common'
import { mergeRouteTiles } from './TileOrder'

describe('dual-route acceptance (favourite + pro)', () => {
  const favs = { first: parseRoute('D16')[0] }
  const taught = taughtRoute(80, favs)!

  it('teaches the favourite-tailored route with a pro tip', () => {
    expect(routeLabel(taught.route)).toBe('T16 D16')
    expect(taught.proTip && routeLabel(taught.proTip)).toBe('T20 D10')
  })

  it('accepts both the favourite and pro routes', () => {
    expect(acceptedRoutes(taught).map(routeLabel)).toEqual(['T16 D16', 'T20 D10'])
  })

  const item: LessonItem = {
    score: 80,
    exercise: 'tiles',
    isNew: false,
    taught
  }

  it('grades the favourite route as good', () => {
    expect(gradeBuilt(parseRoute('T16 D16'), item)).toBe('good')
  })

  it('grades the pro route as good', () => {
    expect(gradeBuilt(parseRoute('T20 D10'), item)).toBe('good')
  })

  it('grades another valid finish as good (any correct math counts)', () => {
    expect(gradeBuilt(parseRoute('D20 D20'), item)).toBe('good')
  })

  it('grades an invalid route as again', () => {
    expect(gradeBuilt(parseRoute('S20 S20'), item)).toBe('again')
  })
})

describe('mergeRouteTiles', () => {
  it('takes the per-label max count, not the sum, across routes', () => {
    const tiles = mergeRouteTiles([parseRoute('D16 D16'), parseRoute('T16 D8')])
    expect(tiles).toHaveLength(4)
    expect(tiles.filter((d) => dartLabel(d) === 'D16')).toHaveLength(2)
    expect(tiles.map(dartLabel).sort()).toEqual(['D16', 'D16', 'D8', 'T16'].sort())
  })
})

describe('dual-route acceptance with differing route lengths (76, fav D16)', () => {
  const favs = { first: parseDart('D16') }
  const taught = taughtRoute(76, favs)!

  it('teaches a 3-dart favourite route ending on D16 with a 2-dart pro tip', () => {
    expect(taught.route).toHaveLength(3)
    expect(taught.route[taught.route.length - 1]).toEqual(parseDart('D16'))
    expect(taught.proTip).toBeTruthy()
    expect(taught.proTip).toHaveLength(2)
    expect(routeLabel(taught.proTip!)).toBe(routeLabel(standardRoute(76)!))
    expect(routeLabel(taught.proTip!)).toBe('T20 D8')
  })

  it('accepts both routes with lengths [3, 2]', () => {
    expect(acceptedRoutes(taught).map((r) => r.length)).toEqual([3, 2])
  })

  const item: LessonItem = {
    score: 76,
    exercise: 'tiles',
    isNew: false,
    taught
  }

  it('grades the full pro route as good', () => {
    expect(gradeBuilt(parseRoute('T20 D8'), item)).toBe('good')
  })

  it('grades the full 3-dart favourite route as good', () => {
    expect(gradeBuilt(taught.route, item)).toBe('good')
  })

  it('grades a non-finishing prefix of the favourite route as again', () => {
    const prefix = taught.route.slice(0, 2)
    expect(gradeBuilt(prefix, item)).toBe('again')
  })

  it('mergeRouteTiles produces the per-label max-count union of both routes', () => {
    const tiles = mergeRouteTiles(acceptedRoutes(taught))
    const expectedCounts = new Map<string, number>()
    for (const route of acceptedRoutes(taught)) {
      const counts = new Map<string, number>()
      for (const d of route) {
        const l = dartLabel(d)
        counts.set(l, (counts.get(l) ?? 0) + 1)
      }
      for (const [l, c] of counts) {
        expectedCounts.set(l, Math.max(expectedCounts.get(l) ?? 0, c))
      }
    }
    const expectedTotal = [...expectedCounts.values()].reduce((a, b) => a + b, 0)
    expect(tiles).toHaveLength(expectedTotal)
    for (const [l, c] of expectedCounts) {
      expect(tiles.filter((d) => dartLabel(d) === l)).toHaveLength(c)
    }
  })
})
