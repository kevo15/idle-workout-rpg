import fs from 'fs'
import path from 'path'

// Every LPC layer the game ships must offer a license the App Store allows
// (ASSETS.md): OGA-BY, CC BY or CC0. CC-BY-SA and GPL alone forbid DRM.
// (Ported from Shadow Sprinter's test of the same name.)

const ASSETS = path.resolve(__dirname, '../../../assets')
const OK = /^(OGA-BY|CC0|CC-BY [34])/

function creditFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return creditFiles(p)
    return e.name === 'credits.csv' ? [p] : []
  })
}

/** The licenses column of each row (quoted CSV: filename,notes,authors,licenses,urls). */
function rows(file: string): { layer: string; licenses: string[] }[] {
  const lines = fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
  return lines.map((line) => {
    const cells = [
      ...line.matchAll(/"((?:[^"]|"")*)"|([^,]+)|(?<=,)(?=,|$)/g),
    ].map((m) => m[1] ?? m[2] ?? '')
    return {
      layer: cells[0],
      licenses: (cells[3] ?? '').split(',').map((l) => l.trim()),
    }
  })
}

describe('sprite licenses', () => {
  const files = creditFiles(ASSETS)

  it('finds the credits of every sprite set', () => {
    const sets = [
      'fighters/hero/warrior',
      'fighters/hero/archer',
      'fighters/hero/mage',
      'fighters/hero/summoner',
      'fighters/hero/rogue',
      'fighters/goblin',
      'fighters/lizard',
      'fighters/ogre',
      'fighters/oni',
    ]
    for (const dir of sets)
      expect([
        dir,
        files.some((f) => f.includes(path.join(...dir.split('/'), 'credits'))),
      ]).toEqual([dir, true])
  })

  it('keeps each hero class’s generator design next to its sheets', () => {
    for (const c of ['warrior', 'archer', 'mage', 'summoner', 'rogue'])
      expect(
        fs.existsSync(
          path.join(ASSETS, 'fighters', 'hero', c, 'credits', 'character.json')
        )
      ).toBe(true)
  })

  it('ships no layer that is only CC-BY-SA or GPL', () => {
    const bad = files.flatMap((f) =>
      rows(f)
        .filter((r) => !r.licenses.some((l) => OK.test(l)))
        .map(
          (r) =>
            `${path.relative(ASSETS, f)}: ${r.layer} (${r.licenses.join(', ')})`
        )
    )
    expect(bad).toEqual([])
  })
})
