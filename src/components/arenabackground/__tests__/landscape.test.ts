import { DESIGN_W } from '../../../theme/tokens'
import { LAND_H, landscapeLayout } from '../layout'

describe('landscapeLayout', () => {
  // iPhone 14 on its side
  const W = 844
  const H = 390

  it('fills the height with a LAND_H canvas', () => {
    const L = landscapeLayout(W, H, { sceneH: 266 })
    expect(L.s).toBeCloseTo(H / LAND_H)
    expect(L.canvasW * L.s).toBeCloseTo(W)
  })

  it('shows a short scene at full size', () => {
    const L = landscapeLayout(W, H, { sceneH: 266 })
    expect(L.k).toBe(1)
    expect(L.sceneW).toBe(DESIGN_W)
    expect(L.regionH).toBe(LAND_H)
  })

  it('shrinks a tall scene to fit', () => {
    const L = landscapeLayout(W, H, { sceneH: 560 })
    expect(L.k).toBeCloseTo(LAND_H / 560)
    expect(L.sceneW).toBeCloseTo(DESIGN_W * (LAND_H / 560))
  })

  it('leaves the notch insets empty and gives the rest to the body', () => {
    const L = landscapeLayout(W, H, {
      sceneH: 266,
      insets: { left: 47, right: 47 },
    })
    expect(L.sceneLeft).toBeCloseTo(47 / L.s)
    expect(L.bodyLeft).toBeCloseTo(L.sceneLeft + L.sceneW)
    expect(L.bodyLeft + L.bodyW + L.right).toBeCloseTo(L.canvasW)
    expect(L.bodyW).toBeGreaterThan(300)
  })

  it('fits the scene above a full-width tab bar', () => {
    const L = landscapeLayout(W, H, { sceneH: 394, tabH: 56 })
    expect(L.colH).toBe(LAND_H - 56)
    expect(L.k).toBeCloseTo((LAND_H - 56) / 394)
    expect(L.bodyLeft + L.bodyW).toBeCloseTo(L.canvasW)
  })

  it('widens the scene column for a wider scene', () => {
    const L = landscapeLayout(W, H, { sceneH: 430, sceneW: 560 })
    expect(L.k).toBe(1)
    expect(L.sceneW).toBe(560)
    expect(L.bodyW).toBeCloseTo(L.canvasW - 560)
  })
})
