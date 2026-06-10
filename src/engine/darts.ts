// Core dart segment model.
// Sectors 1–20 exist as Single/Double/Treble; 25 exists as Single (outer bull)
// and Double (inner bull = 50, "Bull"). There is no Treble 25.

export type Ring = 'S' | 'D' | 'T'

export interface Dart {
  ring: Ring
  sector: number // 1–20 or 25
}

export type Route = Dart[]

export const SECTORS: readonly number[] = Object.freeze(
  Array.from({ length: 20 }, (_, i) => i + 1)
)

/** Every throwable scoring segment. */
export const ALL_DARTS: readonly Dart[] = Object.freeze([
  ...SECTORS.flatMap((sector): Dart[] => [
    { ring: 'S', sector },
    { ring: 'D', sector },
    { ring: 'T', sector }
  ]),
  { ring: 'S', sector: 25 },
  { ring: 'D', sector: 25 }
])

/** All legal finishing darts: D1–D20 and Bull. */
export const DOUBLES: readonly Dart[] = Object.freeze(
  ALL_DARTS.filter((d) => d.ring === 'D')
)

export function dartValue(d: Dart): number {
  return d.sector * (d.ring === 'S' ? 1 : d.ring === 'D' ? 2 : 3)
}

export function routeValue(route: Route): number {
  return route.reduce((sum, d) => sum + dartValue(d), 0)
}

export function sameDart(a: Dart, b: Dart): boolean {
  return a.ring === b.ring && a.sector === b.sector
}

/**
 * Display label. Convention: singles as the plain number ("20"),
 * doubles "D16", trebles "T20", outer bull "25", inner bull "Bull".
 */
export function dartLabel(d: Dart): string {
  if (d.sector === 25) return d.ring === 'D' ? 'Bull' : '25'
  if (d.ring === 'S') return String(d.sector)
  return `${d.ring}${d.sector}`
}

export function routeLabel(route: Route): string {
  return route.map(dartLabel).join(' ')
}

/** Parse "T20", "D16", "Bull", "25" or "7" back into a Dart. */
export function parseDart(s: string): Dart {
  const t = s.trim()
  if (/^bull$/i.test(t)) return { ring: 'D', sector: 25 }
  const m = /^([SDT]?)(\d+)$/i.exec(t)
  if (!m) throw new Error(`Cannot parse dart: "${s}"`)
  const ring = (m[1].toUpperCase() || 'S') as Ring
  const sector = Number(m[2])
  const valid =
    (sector >= 1 && sector <= 20) || (sector === 25 && ring !== 'T')
  if (!valid) throw new Error(`Invalid dart: "${s}"`)
  return { ring, sector }
}

export function parseRoute(s: string): Route {
  return s.split(/\s+/).map(parseDart)
}
