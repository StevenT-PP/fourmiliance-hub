/**
 * Génère public/icons/icon-192.png et icon-512.png
 * Reproduit le favicon Fourmiliance : fond #0F2008 + feuille #4A7A2E + graine #B87520
 * Usage : node scripts/generate-icons.mjs
 */

import { deflateSync } from 'zlib'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── CRC32 ────────────────────────────────────────────────────────────────────

const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  CRC_TABLE[n] = c
}

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const t  = Buffer.from(type, 'ascii')
  const lb = Buffer.allocUnsafe(4); lb.writeUInt32BE(data.length, 0)
  const cb = Buffer.allocUnsafe(4); cb.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([lb, t, data, cb])
}

// ─── Rendu ────────────────────────────────────────────────────────────────────

// Couleurs (RGB)
const BG  = [0x0F, 0x20, 0x08]  // #0F2008 — fond vert sombre
const GRN = [0x4A, 0x7A, 0x2E]  // #4A7A2E — feuille verte
const OCR = [0xB8, 0x75, 0x20]  // #B87520 — graine ocre

// Le SVG source est en 32×32. On mappe les formes en coordonnées normalisées [0,1].
// Feuille (ellipse extérieure) :  cx=0.5 cy=0.44  rx=0.31 ry=0.34
// Graine (ellipse intérieure) :   cx=0.5 cy=0.58  rx=0.16 ry=0.27

function inEllipse(nx, ny, cx, cy, rx, ry) {
  const dx = (nx - cx) / rx
  const dy = (ny - cy) / ry
  return dx * dx + dy * dy <= 1
}

function colorAt(nx, ny) {
  // 4× supersampling horizontal pour des bords plus nets
  if (inEllipse(nx, ny, 0.5, 0.58, 0.16, 0.27)) return OCR
  if (inEllipse(nx, ny, 0.5, 0.44, 0.31, 0.34)) return GRN
  return BG
}

function createIcon(size) {
  const rows = []
  for (let py = 0; py < size; py++) {
    const row = Buffer.allocUnsafe(1 + size * 3)
    row[0] = 0 // filter: None
    for (let px = 0; px < size; px++) {
      // 2×2 supersampling
      const samples = [
        colorAt((px + 0.25) / size, (py + 0.25) / size),
        colorAt((px + 0.75) / size, (py + 0.25) / size),
        colorAt((px + 0.25) / size, (py + 0.75) / size),
        colorAt((px + 0.75) / size, (py + 0.75) / size),
      ]
      row[1 + px * 3]     = Math.round(samples.reduce((s, c) => s + c[0], 0) / 4)
      row[1 + px * 3 + 1] = Math.round(samples.reduce((s, c) => s + c[1], 0) / 4)
      row[1 + px * 3 + 2] = Math.round(samples.reduce((s, c) => s + c[2], 0) / 4)
    }
    rows.push(row)
  }

  const raw        = Buffer.concat(rows)
  const compressed = deflateSync(raw, { level: 9 })

  const sig  = Buffer.from('\x89PNG\r\n\x1a\n', 'binary')
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8]  = 8  // bit depth
  ihdr[9]  = 2  // color type: RGB
  ihdr[10] = 0  // compression
  ihdr[11] = 0  // filter
  ihdr[12] = 0  // interlace

  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))])
}

// ─── Écriture ─────────────────────────────────────────────────────────────────

const outDir = join(__dirname, '..', 'public', 'icons')

writeFileSync(join(outDir, 'icon-192.png'), createIcon(192))
console.log('✅  public/icons/icon-192.png')

writeFileSync(join(outDir, 'icon-512.png'), createIcon(512))
console.log('✅  public/icons/icon-512.png')
