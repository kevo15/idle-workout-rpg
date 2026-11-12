/** Skewed gold / crimson buttons and square icon buttons (docs/ui-theme.md §4). */
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'

import { C, SKEW } from '../../theme/tokens'
import { HazardStripes } from './HazardStripes'
import { Icon, type IconName } from './Icon'
import { T } from './Text'

type BtnProps = {
  label: string
  onPress?: () => void
  height: number
  fontSize: number
  icon?: IconName
  iconSize?: number
  ls?: number
  style?: StyleProp<ViewStyle>
  disabled?: boolean
}

function SkewButton({
  label,
  onPress,
  height,
  fontSize,
  icon,
  iconSize = 13,
  ls = 0.04,
  bg,
  fg,
  radius = 10,
  style,
  disabled,
}: BtnProps & { bg: string; fg: string; radius?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height,
          borderRadius: radius,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.5 : 1,
          transform: [{ skewX: SKEW }, { scale: pressed ? 0.96 : 1 }],
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={iconSize} color={fg} /> : null}
      <T f="display" size={fontSize} color={fg} ls={ls}>
        {label}
      </T>
    </Pressable>
  )
}

/** Gold primary button sitting in a sliding hazard-stripe track. */
export function GoldButton({
  trackWidth,
  stripeOpacity = 0.35,
  style,
  ...p
}: BtnProps & { trackWidth: number; stripeOpacity?: number }) {
  const outerH = p.height + 6
  return (
    <View style={[{ padding: 3, borderRadius: 13, overflow: 'hidden' }, style]}>
      <HazardStripes
        width={trackWidth}
        height={outerH}
        color={`rgba(200,16,46,${stripeOpacity})`}
      />
      <SkewButton {...p} bg={C.gold} fg={C.floor} radius={9} />
    </View>
  )
}

export function CrimsonButton(p: BtnProps) {
  return <SkewButton {...p} bg={C.crimson} fg={C.chalk} />
}

/** Square outline icon button (close, settings…). */
export function IconButton({
  icon,
  onPress,
  size = 44,
  iconSize = 18,
  color = C.chalk,
  label,
  strokeWidth,
  radius = 10,
}: {
  icon: IconName
  onPress?: () => void
  size?: number
  iconSize?: number
  color?: string
  label: string
  strokeWidth?: number
  radius?: number
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: radius,
        borderWidth: 1.5,
        borderColor: C.steel,
        backgroundColor: C.floor,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon
        name={icon}
        size={iconSize}
        color={color}
        strokeWidth={strokeWidth}
      />
    </Pressable>
  )
}
