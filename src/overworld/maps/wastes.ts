import { buildRegionMap } from './region'

// The Ashen Wastes (chapter 3): grey ash, dead trees, rivers of lava.
//   - a lava flow winds from the west edge to the east, crossed by the road
//     north from Cinder Camp (where you arrive);
//   - side roads to Ash Flats (west) and Ember Peak (north-east);
//   - wide ash fields and two lava pools.

export const wastes = buildRegionMap({
  id: 'wastes',
  name: 'Ashen Wastes',
  theme: 'ash',
  rivers: [
    [
      [0, 74],
      [38, 74],
      [38, 62],
      [84, 62],
      [84, 34],
      [117, 34],
    ],
  ],
  ponds: [
    { x: 30, y: 16, width: 7, height: 6 },
    { x: 100, y: 48, width: 9, height: 7 },
  ],
  plazas: [
    { x: 70, y: 72, width: 30, height: 20 },
    { x: 8, y: 84, width: 22, height: 14 },
    { x: 40, y: 26, width: 12, height: 8 },
  ],
  roads: [
    [59, 20, 59, 104],
    [22, 40, 59, 40],
    [59, 20, 96, 20],
  ],
  glades: [
    { x: 20, y: 60, r: 8 },
    { x: 100, y: 96, r: 7 },
  ],
  density: 0.28,
  pines: { north: 0.2, south: 0.2 },
  barrels: [
    { x: 64, y: 93 },
    { x: 18, y: 37 },
    { x: 99, y: 19 },
  ],
  entry: { x: 60, y: 103 },
})
