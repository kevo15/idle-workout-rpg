/**
 * A wild enemy on the map (rpg/encounters.ts): its sprite, name and level,
 * and the choice: FIGHT for gold, TRAIN (one quick set) for +1 stat, or
 * RUN. Shows what's left of today's paid wins and training.
 */
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { encounterGold, type Encounter } from '../../../rpg/encounters'
import { getExercise } from '../../../rpg/exercises'
import { kindOf } from '../../../rpg/fight'
import {
  ENCOUNTER_GOLD_WINS_PER_DAY,
  ENCOUNTER_TRAINING_PER_DAY,
} from '../../../rpg/progress'
import { CrimsonButton, GoldButton, H, T, TapeTag } from '../../components/ui'
import FighterSprite from '../../fight/FighterSprite'
import { ENEMY_SKINS } from '../../fight/sprites'
import { C, STAT_TEXT } from '../../theme/tokens'
import { setsLabel } from '../../utils/format'

/** The enemy idling, facing the hero. */
function EnemyIdle({ enemy, size }: { enemy: string; size: number }) {
  const anim = ENEMY_SKINS[kindOf(enemy)].idle
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = setInterval(
      () => setN((x) => (x + 1) % anim.frameCount),
      anim.speed / anim.frameCount
    )
    return () => clearInterval(t)
  }, [anim])
  return (
    <View style={{ width: size, height: size }}>
      <FighterSprite
        anim={anim}
        frame={anim.startFrame + n}
        facing={-1}
        x={size / 2}
        floorY={size * 0.93}
        scale={size / 68}
      />
    </View>
  )
}

export function EncounterCard({
  encounter,
  area,
  winsLeft,
  trainingLeft,
  onFight,
  onTrain,
  onRun,
  compact = false,
}: {
  encounter: Encounter
  /** The camp site area it came from. */
  area: string
  winsLeft: number
  trainingLeft: number
  onFight: () => void
  onTrain: () => void
  onRun: () => void
  /** Short screens (landscape): a smaller sprite, tighter spacing. */
  compact?: boolean
}) {
  const exercise = getExercise(encounter.exerciseId)
  const one = { ...exercise, sets: 1 }
  return (
    <View style={styles.dim}>
      <View style={[styles.card, compact && { gap: 6, padding: 12 }]}>
        <TapeTag
          label={`${encounter.spotId ? 'TOUGH ONE · ' : ''}${area.toUpperCase()} · LEVEL ${encounter.level}`}
        />
        <View style={{ alignItems: 'center' }}>
          <EnemyIdle enemy={encounter.enemy} size={compact ? 84 : 150} />
        </View>
        <H size={compact ? 20 : 26} lh={1} skew align="center">
          {encounter.spotId
            ? `YOU FOUND A ${encounter.enemy.toUpperCase()}!`
            : `A WILD ${encounter.enemy.toUpperCase()} APPEARS!`}
        </H>
        <GoldButton
          label={
            winsLeft > 0
              ? `FIGHT · +${encounterGold(encounter.level)} GOLD`
              : 'FIGHT · PRACTICE'
          }
          icon="swords"
          height={46}
          fontSize={16}
          trackWidth={320}
          onPress={onFight}
        />
        <CrimsonButton
          label={
            trainingLeft > 0
              ? `TRAIN · +1 ${exercise.stat}`
              : 'TRAIN · NO STAT LEFT TODAY'
          }
          icon="dumbbell"
          height={46}
          fontSize={16}
          onPress={onTrain}
        />
        <T size={12} lh={1.4} color={C.mist} align="center">
          Train instead of fighting:{' '}
          <T f="body700" size={12} color={STAT_TEXT[exercise.stat]}>
            {exercise.name.toLowerCase()}
          </T>
          , {setsLabel(one).replace('1 sets', '1 set')}.
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Run away"
          onPress={onRun}
          hitSlop={8}
          style={{ alignSelf: 'center', paddingVertical: 4 }}
        >
          <T f="body800" size={13} ls={0.12} color={C.steelLight}>
            RUN AWAY
          </T>
        </Pressable>
        <T size={11} color={C.steelLight} align="center">
          Today: {winsLeft}/{ENCOUNTER_GOLD_WINS_PER_DAY} paid wins ·{' '}
          {trainingLeft}/{ENCOUNTER_TRAINING_PER_DAY} stat trainings left
        </T>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  dim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,11,13,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: 360,
    maxWidth: '100%',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.floor,
    borderWidth: 1.5,
    borderColor: C.crimson,
  },
})
