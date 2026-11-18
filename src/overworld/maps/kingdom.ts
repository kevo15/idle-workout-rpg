import { buildRegionMap } from './region'

// The Fallen Kingdom (chapter 2): autumn woods around a ruined city.
//   - a moat rings the old keep, crossed by the two royal roads;
//   - the Throne Plaza inside the moat, the West Barracks yard, a market
//     square to the south-east, and King's Road where you arrive (south);
//   - a river down the east side; the Ashen Wastes gate at the north end.

export const kingdom = buildRegionMap({
  id: 'kingdom',
  name: 'Fallen Kingdom',
  theme: 'kingdom',
  rivers: [
    [
      [100, 0],
      [100, 30],
      [106, 30],
      [106, 105],
    ],
  ],
  ponds: [
    // The moat
    { x: 44, y: 38, width: 33, height: 3 },
    { x: 44, y: 62, width: 33, height: 3 },
    { x: 44, y: 38, width: 3, height: 27 },
    { x: 74, y: 38, width: 3, height: 27 },
  ],
  plazas: [
    { x: 50, y: 44, width: 21, height: 15 },
    { x: 9, y: 46, width: 15, height: 12 },
    { x: 82, y: 78, width: 14, height: 11 },
  ],
  roads: [
    [59, 0, 59, 104],
    [6, 52, 114, 52],
    [61, 84, 82, 84],
  ],
  glades: [
    { x: 30, y: 24, r: 7 },
    { x: 26, y: 84, r: 7 },
    { x: 88, y: 20, r: 6 },
  ],
  density: 0.45,
  pines: { north: 0.3, south: 0.1 },
  barrels: [
    { x: 52, y: 45 },
    { x: 53, y: 45 },
    { x: 68, y: 56 },
    { x: 10, y: 47 },
    { x: 11, y: 47 },
    { x: 22, y: 56 },
    { x: 84, y: 79 },
    { x: 93, y: 87 },
    { x: 64, y: 94 },
  ],
  entry: { x: 60, y: 103 },
})
