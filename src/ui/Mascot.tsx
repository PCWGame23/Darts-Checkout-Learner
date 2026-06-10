/**
 * The app mascot — a friendly pixel-art dart.
 * Rendered as crisp SVG rects so it scales perfectly at any size.
 *
 * NOTE: the same pixel grid is duplicated in scripts/make-icons.mjs (which
 * generates the PWA icons). If you tweak the art here, update it there too
 * and re-run `npm run icons`.
 */

// '.' = transparent. One character per pixel, 17 columns x 38 rows.
export const MASCOT_GRID = [
  '.......OOO.......',
  '......ORORO......',
  '.....OBRORBO.....',
  '....OBRRORRBO....',
  '...OBRRRORRRBO...',
  '..OBRRRRORRRRBO..',
  '..OBRERRORRERBO..',
  '..OBRERRORRERBO..',
  '..OBRRRRORRRRBO..',
  '..OBRRMRORMRRBO..',
  '..OBRRRMMMRRRBO..',
  '...OBRRRORRRBO...',
  '....OBRRORRBO....',
  '.....OBRORBO.....',
  '......OOOOO......',
  '.......OSO.......',
  '.......OSO.......',
  '.......OSO.......',
  '.......OSO.......',
  '.......OSO.......',
  '......OOOOO......',
  '.....OGGGGGO.....',
  '.....OGGGGGO.....',
  '.....OgggggO.....',
  '.....OGGGGGO.....',
  '.....OgggggO.....',
  '.....OGGGGGO.....',
  '.....OgggggO.....',
  '.....OGGGGGO.....',
  '.....OGGGGGO.....',
  '......OOOOO......',
  '.......OSO.......',
  '.......OSO.......',
  '.......OSO.......',
  '.......OSO.......',
  '.......OsO.......',
  '.......OsO.......',
  '........O........'
]

export const MASCOT_COLORS: Record<string, string> = {
  O: '#3b150c', // dark outline
  B: '#262019', // black flight panels
  R: '#d6403a', // red flight
  E: '#2f1c13', // eyes
  M: '#2f1c13', // mouth
  S: '#e9e4d6', // shaft / tip light
  s: '#b8b0a0', // shaft shade
  G: '#e0ae35', // brass barrel
  g: '#a17a1a'  // barrel grip lines
}

export const MASCOT_COLS = MASCOT_GRID[0].length
export const MASCOT_ROWS = MASCOT_GRID.length

interface Run {
  x: number
  y: number
  w: number
  c: string
}

// Merge horizontal runs of equal pixels into single rects (fewer DOM nodes).
const RUNS: Run[] = []
MASCOT_GRID.forEach((row, y) => {
  let x = 0
  while (x < row.length) {
    const c = row[x]
    if (c === '.') {
      x++
      continue
    }
    let w = 1
    while (row[x + w] === c) w++
    RUNS.push({ x, y, w, c })
    x += w
  }
})

export default function Mascot({ height = 96 }: { height?: number }) {
  return (
    <svg
      viewBox={`0 0 ${MASCOT_COLS} ${MASCOT_ROWS}`}
      width={(height / MASCOT_ROWS) * MASCOT_COLS}
      height={height}
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {RUNS.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={MASCOT_COLORS[r.c]} />
      ))}
    </svg>
  )
}
