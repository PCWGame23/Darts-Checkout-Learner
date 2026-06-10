/**
 * Generates the PWA icons (public/icons/icon-192.png, icon-512.png and
 * icon.svg) from the pixel-art mascot. No dependencies — PNG encoding is
 * done by hand with node:zlib.
 *
 * Run: npm run icons
 *
 * NOTE: the pixel grid is duplicated from src/ui/Mascot.tsx — keep in sync.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const GRID = [
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

const COLORS = {
  O: '#3b150c',
  B: '#262019',
  R: '#d6403a',
  E: '#2f1c13',
  M: '#2f1c13',
  S: '#e9e4d6',
  s: '#b8b0a0',
  G: '#e0ae35',
  g: '#a17a1a'
}

const BG = '#0e3b2e' // app theme background
const COLS = GRID[0].length
const ROWS = GRID.length

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const RGB = Object.fromEntries(Object.entries(COLORS).map(([k, v]) => [k, hex(v)]))
const BG_RGB = hex(BG)

// ---------- minimal PNG encoder ----------

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})

function crc32(buf) {
  let c = -1
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // raw scanlines, filter byte 0 per row
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ---------- icon rendering ----------

function insideRoundedRect(x, y, size, radius) {
  const cx = x < radius ? radius : x >= size - radius ? size - radius - 1 : null
  const cy = y < radius ? radius : y >= size - radius ? size - radius - 1 : null
  if (cx === null || cy === null) return true
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= radius * radius
}

function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const radius = Math.round(size * 0.1875) // matches 96/512 of old icon

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!insideRoundedRect(x, y, size, radius)) continue
      const i = (y * size + x) * 4
      rgba[i] = BG_RGB[0]
      rgba[i + 1] = BG_RGB[1]
      rgba[i + 2] = BG_RGB[2]
      rgba[i + 3] = 255
    }
  }

  // mascot centered, ~80% of icon height
  const cell = Math.max(1, Math.floor((size * 0.8) / ROWS))
  const ox = Math.floor((size - COLS * cell) / 2)
  const oy = Math.floor((size - ROWS * cell) / 2)
  for (let gy = 0; gy < ROWS; gy++) {
    for (let gx = 0; gx < COLS; gx++) {
      const c = GRID[gy][gx]
      if (c === '.') continue
      const [r, g, b] = RGB[c]
      for (let py = 0; py < cell; py++) {
        const row = oy + gy * cell + py
        for (let px = 0; px < cell; px++) {
          const i = (row * size + ox + gx * cell + px) * 4
          rgba[i] = r
          rgba[i + 1] = g
          rgba[i + 2] = b
          rgba[i + 3] = 255
        }
      }
    }
  }

  return encodePng(size, rgba)
}

function renderSvg() {
  const rects = []
  GRID.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const c = row[x]
      if (c === '.') {
        x++
        continue
      }
      let w = 1
      while (row[x + w] === c) w++
      rects.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${COLORS[c]}"/>`)
      x += w
    }
  })
  // mascot occupies the middle 80% vertically, like the PNGs
  const scale = (512 * 0.8) / ROWS
  const ox = (512 - COLS * scale) / 2
  const oy = (512 - ROWS * scale) / 2
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges">',
    `  <rect width="512" height="512" rx="96" fill="${BG}"/>`,
    `  <g transform="translate(${ox} ${oy}) scale(${scale})">`,
    ...rects.map((r) => `    ${r}`),
    '  </g>',
    '</svg>',
    ''
  ].join('\n')
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'icon-192.png'), renderIcon(192))
writeFileSync(join(outDir, 'icon-512.png'), renderIcon(512))
writeFileSync(join(outDir, 'icon.svg'), renderSvg())
console.log('Icons written to public/icons/ (192, 512, svg)')
