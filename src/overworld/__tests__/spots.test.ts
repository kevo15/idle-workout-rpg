import { SAFE_RADIUS } from '../../../rpg/encounters'
import { CAMP_SITES, REGION_GATES } from '../../../rpg/world'
import { isBlocked } from '../collision'
import { MAPS } from '../maps'
import { TILE } from '../mapTypes'
import { daySpots, SPOT_SPACING, SPOTS_PER_MAP, spotAt } from '../spots'
import { solidRects } from '../terrain'

describe.each(Object.values(MAPS).map((m) => [m.id, m] as const))(
  'enemies to find on %s',
  (_, map) => {
    const sites = CAMP_SITES.filter((s) => s.mapId === map.id)
    const gates = REGION_GATES.filter((g) => g.mapId === map.id)
    const spots = daySpots(map, sites, gates, '2026-11-15')

    it('places a full set on open grass, spread out, away from camps', () => {
      expect(spots).toHaveLength(SPOTS_PER_MAP)
      const solids = solidRects(map)
      for (const s of spots) {
        expect(map.terrain[s.y][s.x]).toBe('.')
        expect(
          isBlocked({ x: s.x * TILE + 16, y: s.y * TILE + 28 }, solids)
        ).toBe(false)
        for (const c of sites)
          expect(
            Math.hypot(s.x - c.position.x, s.y - c.position.y)
          ).toBeGreaterThanOrEqual(SAFE_RADIUS)
        for (const o of spots)
          if (o !== s)
            expect(Math.hypot(s.x - o.x, s.y - o.y)).toBeGreaterThanOrEqual(
              SPOT_SPACING
            )
      }
    })

    it('is the same all day and moves the next day', () => {
      expect(daySpots(map, sites, gates, '2026-11-15')).toEqual(spots)
      const tomorrow = daySpots(map, sites, gates, '2026-11-16')
      expect(tomorrow.map((s) => [s.x, s.y])).not.toEqual(
        spots.map((s) => [s.x, s.y])
      )
    })

    it('fields tougher enemies: the top half of the area’s band', () => {
      for (const s of spots) {
        const site = sites.find((c) => c.id === s.siteId)!
        const [lo, hi] = site.levelBand
        expect(s.level).toBeGreaterThanOrEqual(Math.ceil((lo + hi) / 2))
        expect(s.level).toBeLessThanOrEqual(hi)
        expect(site.enemies).toContain(s.enemy)
      }
    })

    it('is found by walking up to it', () => {
      const s = spots[0]
      const feet = { x: (s.x + 0.5) * TILE, y: (s.y + 2) * TILE }
      expect(spotAt(feet, spots)?.id).toBe(s.id)
      expect(spotAt({ x: feet.x + 5 * TILE, y: feet.y }, spots)).toBeUndefined()
    })
  }
)
