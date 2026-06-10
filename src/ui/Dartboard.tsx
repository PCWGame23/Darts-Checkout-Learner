// Tappable dartboard. Whole wedges are the tap targets (ring is chosen via
// S/D/T buttons in the parent) — reliable on small screens.

// Standard sector order, clockwise from the top.
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

const R_INNER = 34
const R_OUTER = 160
const R_LABEL = 182
const R_BULL = 15
const STEP = 18 // degrees per wedge

function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [r * Math.sin(rad), -r * Math.cos(rad)]
}

function wedgePath(centerDeg: number): string {
  const a0 = centerDeg - STEP / 2
  const a1 = centerDeg + STEP / 2
  const [x0i, y0i] = polar(R_INNER, a0)
  const [x0o, y0o] = polar(R_OUTER, a0)
  const [x1o, y1o] = polar(R_OUTER, a1)
  const [x1i, y1i] = polar(R_INNER, a1)
  return [
    `M ${x0i} ${y0i}`,
    `L ${x0o} ${y0o}`,
    `A ${R_OUTER} ${R_OUTER} 0 0 1 ${x1o} ${y1o}`,
    `L ${x1i} ${y1i}`,
    `A ${R_INNER} ${R_INNER} 0 0 0 ${x0i} ${y0i}`,
    'Z'
  ].join(' ')
}

interface Props {
  selected?: number // sector 1–20 or 25
  onSelect: (sector: number) => void
}

export default function Dartboard({ selected, onSelect }: Props) {
  return (
    <svg viewBox="-200 -200 400 400" role="group" aria-label="Dartboard">
      <circle r={198} fill="var(--board-dark)" />
      {ORDER.map((sector, i) => {
        const deg = i * STEP
        const dark = i % 2 === 0
        const [lx, ly] = polar(R_LABEL, deg)
        return (
          <g key={sector} onClick={() => onSelect(sector)}>
            <path
              className={`wedge${selected === sector ? ' sel' : ''}`}
              d={wedgePath(deg)}
              fill={dark ? 'var(--board-dark)' : 'var(--board-cream)'}
            />
            <text
              x={lx}
              y={ly}
              fill={selected === sector ? 'var(--accent)' : '#fff'}
              fontSize={17}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {sector}
            </text>
          </g>
        )
      })}
      {/* Outer 25 ring and bull — both select sector 25 */}
      <circle
        r={R_INNER - 2}
        fill={selected === 25 ? 'var(--accent)' : 'var(--board-green)'}
        stroke="#000"
        onClick={() => onSelect(25)}
      />
      <circle
        r={R_BULL}
        fill="var(--board-red)"
        stroke="#000"
        style={{ pointerEvents: 'none' }}
      />
    </svg>
  )
}
