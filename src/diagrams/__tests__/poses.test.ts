import { EXERCISES } from '../../../rpg/exercises'
import {
  DIAGRAMS,
  diagramFor,
  fullPose,
  GRID,
  JOINTS,
  missingDiagrams,
} from '../poses'

describe('exercise diagrams', () => {
  it('has a diagram for every workout', () => {
    expect(missingDiagrams()).toEqual([])
  })

  it('only draws diagrams for real workouts', () => {
    for (const id of Object.keys(DIAGRAMS)) expect(EXERCISES[id]).toBeDefined()
  })

  it('moves: every diagram has 2+ poses on the grid', () => {
    for (const [id, d] of Object.entries(DIAGRAMS)) {
      expect([id, d.poses.length >= 2]).toEqual([id, true])
      for (const p of d.poses.map(fullPose))
        for (const j of JOINTS) {
          const [x, y] = p[j]
          expect([
            id,
            j,
            x >= 0 && x <= GRID.width && y >= 0 && y <= GRID.height,
          ]).toEqual([id, j, true])
        }
    }
  })

  it('lets easier versions borrow their main workout’s diagram', () => {
    const knee = diagramFor(EXERCISES['crunches'])
    expect(knee).toBeDefined()
  })
})
