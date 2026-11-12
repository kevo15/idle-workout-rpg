/** Header strip, cards and scoreboard panels. */
import { type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'

import { C } from '../../theme/tokens'
import { HazardStripes } from './HazardStripes'
import { Icon } from './Icon'
import { H, N, T } from './Text'

/** Header strip: 104px, stripes, steel bottom border. */
export function Header({
  children,
  padLeft = 20,
  gap,
}: {
  children: ReactNode
  padLeft?: number
  gap?: number
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 104,
        paddingLeft: padLeft,
        paddingRight: 16,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap,
        backgroundColor: C.floor,
        borderBottomWidth: 1,
        borderBottomColor: C.steel,
      }}
    >
      <HazardStripes width={390} height={104} color="rgba(200,16,46,0.15)" />
      {children}
    </View>
  )
}

export function HeaderTitle({
  children,
  size = 36,
}: {
  children: ReactNode
  size?: number
}) {
  return (
    <H size={size} ls={0.02} skew lh={1}>
      {children}
    </H>
  )
}

export function GoldPill({ amount }: { amount: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 40,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: C.iron,
        borderWidth: 2,
        borderColor: C.steel,
      }}
    >
      <Icon name="coin" size={18} />
      <N size={28} color={C.gold} lh={1} style={{ paddingTop: 4 }}>
        {amount}
      </N>
    </View>
  )
}

/** Card: iron 90%, 14 radius, 1px steel, 4px crimson left bar; featured = gold border. */
export function Card({
  children,
  featured,
  accent = C.crimson,
  style,
}: {
  children: ReactNode
  featured?: boolean
  accent?: string
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View
      style={[
        {
          backgroundColor: 'rgba(30,31,36,0.9)',
          borderWidth: 1,
          borderColor: featured ? C.gold : C.steel,
          borderLeftWidth: 4,
          borderLeftColor: accent,
          borderRadius: 14,
          paddingVertical: 12,
          paddingHorizontal: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

/** Scoreboard panel: iron box, 2px steel border, crimson label strip. */
export function Panel({
  label,
  right,
  children,
  stripPad = [6, 14],
  stripSize = 11,
  radius = 14,
  style,
}: {
  label: string
  right?: string
  children: ReactNode
  stripPad?: [number, number]
  stripSize?: number
  radius?: number
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View
      style={[
        {
          backgroundColor: C.iron,
          borderWidth: 2,
          borderColor: C.steel,
          borderRadius: radius,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          backgroundColor: C.crimson,
          paddingVertical: stripPad[0],
          paddingHorizontal: stripPad[1],
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* both sides may wrap on narrow phones (the mockup wraps them too) */}
        <T f="body700" size={stripSize} ls={0.14} style={{ flexShrink: 1 }}>
          {label}
        </T>
        {right ? (
          <T f="body600" size={11} align="right" style={{ flexShrink: 1 }}>
            {right}
          </T>
        ) : null}
      </View>
      {children}
    </View>
  )
}
