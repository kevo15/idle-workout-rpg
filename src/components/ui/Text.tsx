/** Text styles: Inter body (T), Lilita headings (H), Teko scoreboard numbers (N). */
import { type ReactNode } from 'react'
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native'

import { C, F, SKEW } from '../../theme/tokens'

export type Font = keyof typeof F

/**
 * Teko's natural line box is 1.433em (hhea ascent 958 + descent 475 per 1000),
 * but its digits only fill the bottom 0.636em of the ascent. A CSS-style
 * `line-height: 1` is shorter than that box, and iOS/Android take the
 * difference off the top of the line, clipping the digits.
 *
 * So scoreboard numbers keep their natural line box and instead pull the
 * layout in with negative margins (CSS half-leading): same position and
 * footprint as the mockup, nothing clipped.
 */
const TEKO_LINE = 0.958 + 0.475
const isNum = (f: Font) => f === 'num' || f === 'numMedium'

function trimLine(
  size: number,
  lh: number,
  style: StyleProp<TextStyle>
): TextStyle {
  const cut = ((TEKO_LINE - lh) / 2) * size
  const flat = StyleSheet.flatten(style) ?? {}
  const m = (side: 'marginTop' | 'marginBottom') => {
    const v = flat[side] ?? flat.marginVertical ?? flat.margin ?? 0
    return (typeof v === 'number' ? v : 0) - cut
  }
  return { marginTop: m('marginTop'), marginBottom: m('marginBottom') }
}

export function T({
  f = 'body',
  size = 14,
  color = C.chalk,
  ls = 0,
  lh,
  skew,
  skewLeft,
  align,
  style,
  children,
  numberOfLines,
  fit,
}: {
  f?: Font
  size?: number
  color?: string
  /** letter-spacing in em, like the CSS. */
  ls?: number
  /** line-height multiplier. */
  lh?: number
  skew?: boolean
  /** skew with transform-origin left (keeps the left edge aligned). */
  skewLeft?: boolean
  align?: TextStyle['textAlign']
  style?: StyleProp<TextStyle>
  children: ReactNode
  numberOfLines?: number
  /** Shrink to fit one line instead of overflowing (e.g. narrow buttons). */
  fit?: boolean
}) {
  const tight = lh !== undefined && isNum(f) && lh < TEKO_LINE
  return (
    <Text
      numberOfLines={fit ? 1 : numberOfLines}
      adjustsFontSizeToFit={fit}
      minimumFontScale={fit ? 0.6 : undefined}
      style={[
        {
          fontFamily: F[f],
          fontSize: size,
          color,
          letterSpacing: ls * size,
          textAlign: align,
          includeFontPadding: false,
        },
        lh && !tight ? { lineHeight: lh * size } : null,
        skew || skewLeft ? { transform: [{ skewX: SKEW }] } : null,
        skewLeft ? { transformOrigin: 'left center' } : null,
        style,
        tight ? trimLine(size, lh, style) : null,
      ]}
    >
      {children}
    </Text>
  )
}

/** Lilita heading with skew. */
export const H = (p: Omit<Parameters<typeof T>[0], 'f'>) => (
  <T f="display" {...p} />
)
/** Teko scoreboard number. */
export const N = (p: Omit<Parameters<typeof T>[0], 'f'>) => <T f="num" {...p} />
