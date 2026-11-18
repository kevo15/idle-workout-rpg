/**
 * Shows a screen's content once its data has loaded (see useLoad): the
 * LoadingScreen while waiting, the content when ready, and a "couldn't
 * load" card with RETRY if it fails (offline, server down).
 */
import { type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { C } from '../../theme/tokens'
import { CrimsonButton, H, T } from '../ui'
import { LoadingScreen } from './LoadingScreen'
import type { LoadResult } from './useLoad'

export function LoadGate<T>({
  load,
  title,
  subtitle,
  tips,
  holdMs,
  children,
}: {
  load: LoadResult<T>
  title?: string
  subtitle?: string
  tips?: string[]
  /** How long the loading screen stays after the data arrives (default 3 s). */
  holdMs?: number
  children: (data: T) => ReactNode
}) {
  if (load.status === 'error') {
    return (
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <View style={styles.card}>
          <H size={24} lh={1} skewLeft>
            COULDN’T LOAD
          </H>
          <T size={14} lh={1.45} color={C.mist}>
            Check your connection and try again. Your progress on this phone is
            safe.
          </T>
          <T size={12} color={C.steelLight}>
            {load.error}
          </T>
          <CrimsonButton
            label="RETRY"
            height={46}
            fontSize={17}
            onPress={load.retry}
          />
        </View>
      </View>
    )
  }
  return (
    <>
      {load.data !== undefined ? children(load.data) : null}
      {/* Fades out over the content once ready; a retry starts a new one */}
      <LoadingScreen
        key={load.attempt}
        ready={load.status === 'ready'}
        title={title}
        subtitle={subtitle}
        tips={tips}
        holdMs={holdMs}
      />
    </>
  )
}

const styles = StyleSheet.create({
  center: {
    backgroundColor: C.floorDeep,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: 340,
    maxWidth: '100%',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.floor,
    borderWidth: 1,
    borderColor: C.crimson,
  },
})
