// Map objects, depth-sorted with the hero (ported from Shadow Sprinter).
import React from 'react'
import { Image, StyleSheet, View } from 'react-native'

import { SHEETS } from '../assets'
import type { ObjectPart } from '../objects'
import type { PlacedSprite } from '../sceneObjects'

/** One crop of a sheet, scaled. */
const Part = React.memo(
  ({
    part,
    scale,
    onLoad,
  }: {
    part: ObjectPart
    scale: number
    /** Called with the sheet's name once its image has loaded (or failed). */
    onLoad?: (sheet: string) => void
  }) => {
    const sheet = SHEETS[part.sheet]
    return (
      <View
        style={[
          styles.crop,
          {
            left: part.dx * scale,
            top: part.dy * scale,
            width: part.w * scale,
            height: part.h * scale,
          },
        ]}
      >
        <Image
          source={sheet.src}
          onLoad={() => onLoad?.(part.sheet)}
          onError={() => onLoad?.(part.sheet)}
          style={{
            position: 'absolute',
            left: -part.sx * scale,
            top: -part.sy * scale,
            width: sheet.width * scale,
            height: sheet.height * scale,
          }}
        />
      </View>
    )
  }
)

/**
 * The objects near the hero (already culled). Entry i in the full sorted
 * list sits at zIndex 2i + 2, so the hero (2 * band + 1) slots in between
 * what it stands in front of and what it stands behind. Re-renders only when
 * the culled set changes.
 */
export const MapObjects = React.memo(
  ({
    items,
    scale,
    onLoad,
  }: {
    items: { s: PlacedSprite; i: number }[]
    scale: number
    /** Reports each sheet as its image loads (the overworld's loading screen). */
    onLoad?: (sheet: string) => void
  }) => (
    <>
      {items.map(({ s, i }) => (
        <View
          key={s.key}
          pointerEvents="none"
          style={[
            styles.object,
            { left: s.x * scale, top: s.y * scale, zIndex: 2 * i + 2 },
          ]}
        >
          {s.kind.parts.map((p, j) => (
            <Part key={j} part={p} scale={scale} onLoad={onLoad} />
          ))}
        </View>
      ))}
    </>
  )
)

const styles = StyleSheet.create({
  object: { position: 'absolute', width: 0, height: 0, overflow: 'visible' },
  crop: { position: 'absolute', overflow: 'hidden' },
})
