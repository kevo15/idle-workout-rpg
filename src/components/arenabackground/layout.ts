// Canvas sizing for <Screen>, in design units (docs/mockups are 390 × 844).
// Pure so it can be unit tested without React Native.

import { DESIGN_H, DESIGN_W } from '../../theme/tokens'

/** Canvas height in landscape, in design units. */
export const LAND_H = 430
/** Tab bar height in design units. */
export const TAB_H = 84
export const TAB_H_LAND = 56

/**
 * Scale for a portrait container of the given size. Phones fill the width;
 * wide screens show a phone-sized column.
 */
export function designScale(width: number, height: number) {
  const s =
    width <= 500
      ? width / DESIGN_W
      : Math.min(width / DESIGN_W, height / DESIGN_H, 1.2)
  return { s, width, height, canvasH: height / s }
}

/**
 * Landscape layout: canvas scale `s` and width, and the scene column's scale
 * `k` and width so a `sceneW`-wide portrait scene from 0 to `sceneH` fits
 * above the tab bar (`tabH`, full width). The body column takes the rest of
 * the width, inside the side insets (the notch). `colH` is both columns'
 * height.
 */
export function landscapeLayout(
  width: number,
  height: number,
  {
    sceneH,
    sceneW = DESIGN_W,
    insets = { left: 0, right: 0 },
    tabH = 0,
  }: {
    sceneH: number
    sceneW?: number
    insets?: { left: number; right: number }
    tabH?: number
  }
) {
  const s = height / LAND_H
  const canvasW = width / s
  const colH = LAND_H - tabH
  const regionH = Math.max(colH, sceneH)
  const k = colH / regionH
  const left = insets.left / s
  const right = insets.right / s
  const colW = sceneW * k
  return {
    s,
    canvasW,
    colH,
    regionH,
    k,
    sceneLeft: left,
    sceneW: colW,
    bodyLeft: left + colW,
    bodyW: canvasW - left - right - colW,
    right,
  }
}
