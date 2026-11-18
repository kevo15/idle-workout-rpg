// Overworld art build (ported from Shadow Sprinter's scripts/buildMaps.ts).
//
// For each map in src/overworld/maps:
//   1. The ground (grass, dirt, water) baked into a grid of chunk images,
//      CHUNK_W x CHUNK_H tiles each: <id>-ground-<col>-<row>.png. One image
//      for a 120 x 108 map would be 3840 x 3456, too big for some phones.
//      Objects are drawn at runtime instead, depth-sorted with the hero.
//   2. A mini-map, MINI px per tile: <id>-mini.png.
//   3. Its theme's recoloured sheets (THEMES): autumn grass and crowns for
//      the Fallen Kingdom; grey ash, dead crowns and lava for water in the
//      Ashen Wastes. Crowns are saved (treetop_<theme>.png, drawn at
//      runtime); terrain recolours only exist in the baked ground.
//
//   npm run maps:build                 writes the chunks and mini-maps
//   npm run maps:build -- --preview D  also writes D/<id>-preview.png with
//                                      the objects and colliders drawn in
//
// Rebuild after changing a map. src/overworld/assets.ts lists the outputs.
import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'
import { MAPS } from '../src/overworld/maps'
import { OBJECTS, baselineOf, type ObjectPart } from '../src/overworld/objects'
import { CHUNK_H, CHUNK_W } from '../src/overworld/sceneObjects'
import {
  autotile,
  mapSize,
  solidRects,
  tileHash,
} from '../src/overworld/terrain'
import { TILE, type MapDef, type MapTheme } from '../src/overworld/mapTypes'

const ROOT = path.join(__dirname, '..')
const TILES = path.join(ROOT, 'assets/overworld/tiles')
const OUT = path.join(ROOT, 'assets/overworld/maps')
/** Mini-map pixels per tile. */
const MINI = 2

const read = (file: string) => PNG.sync.read(fs.readFileSync(file))
const sheets = new Map<string, PNG>()
const sheet = (name: string) => {
  if (!sheets.has(name)) sheets.set(name, read(path.join(TILES, `${name}.png`)))
  return sheets.get(name)!
}

// ---- colour (from Shadow Sprinter's sheet recolours) ----------------------

type HSV = [number, number, number]

function toHsv(r: number, g: number, b: number): HSV {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const d = max - min
  let h = 0
  if (d > 0) {
    if (max === r / 255) h = ((g - b) / 255 / d) % 6
    else if (max === g / 255) h = (b - r) / 255 / d + 2
    else h = (r - g) / 255 / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [h, max === 0 ? 0 : d / max, max]
}

function toRgb([h, s, v]: HSV): [number, number, number] {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
type Shift = (hsv: HSV) => HSV
/** Recolours per hue band: greens (foliage, grass), blues (water), browns (dirt, bark). */
type Palette = { green?: Shift; blue?: Shift; brown?: Shift }

const band = (h: number): keyof Palette | null =>
  h >= 45 && h < 165
    ? 'green'
    : h >= 165 && h < 260
      ? 'blue'
      : h >= 8 && h < 45
        ? 'brown'
        : null

/** A copy of `src` with every pixel recoloured by its hue band. */
function recolor(src: PNG, palette: Palette): PNG {
  const png = new PNG({ width: src.width, height: src.height })
  src.data.copy(png.data)
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] === 0) continue
    const hsv = toHsv(png.data[i], png.data[i + 1], png.data[i + 2])
    if (hsv[1] < 0.12) continue
    const k = band(hsv[0])
    const fn = k ? palette[k] : undefined
    if (!fn) continue
    const [r, g, b] = toRgb(fn(hsv))
    png.data[i] = r
    png.data[i + 1] = g
    png.data[i + 2] = b
  }
  return png
}

/** Terrain and crown recolours per theme (forest: none). */
const THEMES: Record<MapTheme, { terrain: Palette; crown: Palette }> = {
  forest: { terrain: {}, crown: {} },
  // Autumn: olive grass, orange-red crowns
  kingdom: {
    terrain: { green: ([h, s, v]) => [h - 32, s * 0.8, v * 0.95] },
    crown: {
      green: ([h, s, v]) => [
        16 + ((h - 45) / 120) * 26,
        clamp01(s * 1.05),
        clamp01(v * 1.08),
      ],
    },
  },
  // Ash: grey ground, dead grey crowns, lava for water
  ash: {
    terrain: {
      green: ([, s, v]) => [28, s * 0.14, v * 0.6],
      brown: ([h, s, v]) => [h, s * 0.35, v * 0.62],
      blue: ([, s, v]) => [
        8 + v * 30,
        clamp01(0.75 + s * 0.25),
        clamp01(0.55 + v * 0.5),
      ],
    },
    crown: {
      green: ([, s, v]) => [30, s * 0.1, v * 0.48],
      blue: ([, s, v]) => [30, s * 0.1, v * 0.48],
    },
  },
}

/** A terrain or crown sheet in `theme`'s colours. */
const themed = (name: string, theme: MapTheme, kind: 'terrain' | 'crown') => {
  const key = `${name}@${theme}`
  if (!sheets.has(key))
    sheets.set(key, recolor(sheet(name), THEMES[theme][kind]))
  return sheets.get(key)!
}

/** Saves each theme's crowns for the app (objects.ts treetop_<theme>). */
function writeCrowns() {
  const names: [MapTheme, string][] = [
    ['kingdom', 'treetop_autumn'],
    ['ash', 'treetop_ash'],
  ]
  for (const [theme, name] of names) {
    const png = themed('treetop', theme, 'crown')
    fs.writeFileSync(path.join(TILES, `${name}.png`), PNG.sync.write(png))
    sheets.set(name, png)
  }
}

/** Draws a crop of `src` onto `dst`, alpha-blended over what's there. */
function blit(
  dst: PNG,
  src: PNG,
  sx: number,
  sy: number,
  w: number,
  h: number,
  dx: number,
  dy: number
) {
  dx = Math.round(dx)
  dy = Math.round(dy)
  for (let j = 0; j < h; j++) {
    const ty = dy + j
    if (ty < 0 || ty >= dst.height) continue
    for (let i = 0; i < w; i++) {
      const tx = dx + i
      if (tx < 0 || tx >= dst.width) continue
      const s = ((sy + j) * src.width + sx + i) * 4
      const d = (ty * dst.width + tx) * 4
      const a = src.data[s + 3] / 255
      if (a === 0) continue
      const da = dst.data[d + 3] / 255
      const oa = a + da * (1 - a)
      for (let c = 0; c < 3; c++) {
        dst.data[d + c] = Math.round(
          (src.data[s + c] * a + dst.data[d + c] * da * (1 - a)) / oa
        )
      }
      dst.data[d + 3] = Math.round(oa * 255)
    }
  }
}

/** The whole ground as one image (kept in memory only). */
function buildGround(map: MapDef) {
  const { width, height } = mapSize(map)
  const ground = new PNG({ width, height })
  // Grass everywhere: mostly the plain fill, with the three textured fills
  // from row 5 mixed in.
  const grass = themed('grass', map.theme, 'terrain')
  for (let r = 0; r < map.terrain.length; r++) {
    for (let c = 0; c < map.terrain[r].length; c++) {
      const v = tileHash(c, r)
      const [col, row] = v < 3 ? [v, 5] : [1, 3]
      blit(
        ground,
        grass,
        col * TILE,
        row * TILE,
        TILE,
        TILE,
        c * TILE,
        r * TILE
      )
    }
  }
  for (const [kind, name] of [
    ['d', 'dirt'],
    ['w', 'water'],
  ] as const) {
    const src = themed(name, map.theme, 'terrain')
    for (const q of autotile(map.terrain, kind))
      blit(ground, src, q.sx, q.sy, 16, 16, q.dx, q.dy)
  }
  return ground
}

/** Cuts the ground into CHUNK_W x CHUNK_H-tile images. */
function writeChunks(map: MapDef, ground: PNG) {
  const cw = CHUNK_W * TILE
  const ch = CHUNK_H * TILE
  const cols = Math.ceil(ground.width / cw)
  const rows = Math.ceil(ground.height / ch)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const w = Math.min(cw, ground.width - col * cw)
      const h = Math.min(ch, ground.height - row * ch)
      const chunk = new PNG({ width: w, height: h })
      PNG.bitblt(ground, chunk, col * cw, row * ch, w, h, 0, 0)
      fs.writeFileSync(
        path.join(OUT, `${map.id}-ground-${col}-${row}.png`),
        PNG.sync.write(chunk)
      )
    }
  }
  return { cols, rows }
}

type RGB = [number, number, number]
const MINI_COLORS: Record<MapTheme, Record<string, RGB> & { tree: RGB }> = {
  forest: {
    '.': [86, 120, 62],
    d: [150, 118, 78],
    w: [62, 116, 158],
    tree: [44, 82, 40],
  },
  kingdom: {
    '.': [112, 118, 60],
    d: [150, 118, 78],
    w: [62, 116, 158],
    tree: [150, 74, 34],
  },
  ash: {
    '.': [92, 88, 84],
    d: [104, 92, 80],
    w: [214, 84, 30],
    tree: [58, 56, 54],
  },
}

/** Terrain at MINI px per tile, trees as darker blobs. */
function writeMini(map: MapDef) {
  const cols = map.terrain[0].length
  const rows = map.terrain.length
  const png = new PNG({ width: cols * MINI, height: rows * MINI })
  const colors = MINI_COLORS[map.theme]
  const put = (x: number, y: number, [r, g, b]: [number, number, number]) => {
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) return
    const d = (y * png.width + x) * 4
    png.data.set([r, g, b, 255], d)
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      for (let j = 0; j < MINI; j++)
        for (let i = 0; i < MINI; i++)
          put(c * MINI + i, r * MINI + j, colors[map.terrain[r][c]])
  // Each tree: its crown's 3 x 3 tiles, dark green
  for (const o of map.objects) {
    if (o.kind === 'barrel') continue
    const shade = colors.tree
    for (let j = 0; j < 3 * MINI; j++)
      for (let i = 0; i < 3 * MINI; i++)
        put(o.x * MINI + i, (o.y + 1) * MINI + j, shade)
  }
  fs.writeFileSync(path.join(OUT, `${map.id}-mini.png`), PNG.sync.write(png))
}

/** Ground + objects in depth order + colliders, for checking a map by eye. */
function preview(map: MapDef, ground: PNG, dir: string) {
  const img = new PNG({ width: ground.width, height: ground.height })
  ground.data.copy(img.data)
  const draw = (parts: ObjectPart[], ox: number, oy: number) => {
    for (const p of parts)
      blit(img, sheet(p.sheet), p.sx, p.sy, p.w, p.h, ox + p.dx, oy + p.dy)
  }
  const placed = map.objects
    .filter((o) => OBJECTS[o.kind])
    .sort(
      (a, b) =>
        baselineOf(OBJECTS[a.kind], a.y * TILE) -
        baselineOf(OBJECTS[b.kind], b.y * TILE)
    )
  for (const o of placed) draw(OBJECTS[o.kind].parts, o.x * TILE, o.y * TILE)

  const dot = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) return
    const d = (Math.round(y) * img.width + Math.round(x)) * 4
    img.data.set([255, 0, 255, 255], d)
  }
  for (const s of solidRects(map)) {
    for (let i = 0; i < s.width; i++) {
      dot(s.x + i, s.y)
      dot(s.x + i, s.y + s.height - 1)
    }
    for (let j = 0; j < s.height; j++) {
      dot(s.x, s.y + j)
      dot(s.x + s.width - 1, s.y + j)
    }
  }
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${map.id}-preview.png`), PNG.sync.write(img))
}

fs.mkdirSync(OUT, { recursive: true })
writeCrowns()
const previewAt = process.argv.indexOf('--preview')
for (const map of Object.values(MAPS)) {
  const ground = buildGround(map)
  const { cols, rows } = writeChunks(map, ground)
  writeMini(map)
  if (previewAt >= 0) preview(map, ground, process.argv[previewAt + 1])
  console.log(
    `Built ${map.id} (${ground.width}x${ground.height}, ${cols}x${rows} chunks, ${map.objects.length} objects)`
  )
}
