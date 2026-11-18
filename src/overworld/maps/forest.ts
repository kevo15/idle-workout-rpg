import { buildRegionMap, MAP_H, MAP_W } from './region'

// The Whispering Forest (chapter 1):
//   - a river meandering down the west side, crossed by two fords;
//   - the north road from Mossy Clearing (south) through Guardian's Rise to
//     the Fallen Kingdom gate, the cross road from the Old Mill (west) to
//     Hollow Stones (east), and the south-west loop;
//   - two ponds and open glades; pines in the colder north.

export const FOREST_W = MAP_W
export const FOREST_H = MAP_H

export const forest = buildRegionMap({
  id: 'forest',
  name: 'Whispering Forest',
  theme: 'forest',
  rivers: [
    [
      [24, 0],
      [24, 34],
      [28, 34],
      [28, 70],
      [32, 70],
      [32, 105],
    ],
  ],
  ponds: [
    { x: 84, y: 76, width: 9, height: 7 },
    { x: 86, y: 83, width: 5, height: 2 },
    { x: 44, y: 11, width: 6, height: 5 },
  ],
  roads: [
    [59, 0, 59, 94],
    [18, 60, 100, 60],
    [18, 62, 18, 96],
    [18, 96, 59, 96],
  ],
  glades: [
    { x: 40, y: 40, r: 7 },
    { x: 86, y: 30, r: 8 },
    { x: 80, y: 90, r: 7 },
    { x: 44, y: 80, r: 6 },
    { x: 100, y: 88, r: 6 },
  ],
  density: 0.62,
  pines: { north: 0.7, south: 0.15 },
  barrels: [
    { x: 21, y: 59 },
    { x: 22, y: 59 },
    { x: 14, y: 63 },
    { x: 64, y: 92 },
    { x: 104, y: 56 },
  ],
  entry: { x: 60, y: 96 },
})
