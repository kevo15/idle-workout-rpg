/**
 * "How to": a big looping diagram of an exercise with its cues. Opened by
 * tapping a diagram (workout screen, quest cards). A native Modal, so it
 * works on any screen, in any orientation.
 */
import { Modal, Pressable, View } from 'react-native'

import type { Exercise } from '../../rpg/exercises'
import { C } from '../theme/tokens'
import { ExerciseDiagram } from './ExerciseDiagram'
import { CrimsonButton, H, T, TapeTag } from './ui'

const dose = (e: Exercise) =>
  `${e.sets} sets × ${e.target}${e.mode === 'timed' ? ' seconds' : ' reps'}`

export function HowToModal({
  exercise,
  onClose,
}: {
  /** The exercise to show; null hides the modal. */
  exercise: Exercise | null
  onClose: () => void
}) {
  return (
    <Modal
      visible={exercise !== null}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close how-to"
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(11,11,13,0.9)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        {exercise ? (
          <Pressable
            onPress={() => {}}
            style={{
              width: 340,
              maxWidth: '100%',
              backgroundColor: C.floor,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.gold,
              padding: 16,
              gap: 10,
            }}
          >
            <TapeTag label="HOW TO" />
            <H size={26} lh={1} skewLeft>
              {exercise.name.toUpperCase()}
            </H>
            <View
              style={{
                alignItems: 'center',
                backgroundColor: C.ironDark,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.steel,
                paddingVertical: 6,
              }}
            >
              <ExerciseDiagram exercise={exercise} width={300} />
            </View>
            <T f="body700" size={13} color={C.gold}>
              {dose(exercise)}
            </T>
            {exercise.cues.map((c, i) => (
              <View key={c} style={{ flexDirection: 'row', gap: 8 }}>
                <T f="body800" size={14} color={C.crimson}>
                  {i + 1}
                </T>
                <T size={14} lh={1.45} color={C.parchment} style={{ flex: 1 }}>
                  {c}
                </T>
              </View>
            ))}
            <CrimsonButton
              label="GOT IT"
              height={46}
              fontSize={17}
              onPress={onClose}
            />
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  )
}
