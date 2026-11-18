/** The chapter cards seen so far, to watch again (Map tab). */
import { Pressable, View } from 'react-native'

import { CHAPTERS } from '../../../rpg/world'
import { C } from '../../theme/tokens'
import { H, Icon, Panel, T } from '../ui'

export function PastScenes({
  seen,
  onPick,
}: {
  seen: string[]
  onPick: (chapterId: string) => void
}) {
  return (
    <Panel label="PAST SCENES" right={`${seen.length} unlocked`}>
      <View style={{ padding: 10, gap: 8 }}>
        {seen.length === 0 ? (
          <T size={13} color={C.mist} style={{ padding: 4 }}>
            Story scenes you unlock appear here to watch again.
          </T>
        ) : (
          seen.map((id) => {
            const ch = CHAPTERS[id]
            if (!ch) return null
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`Replay chapter ${ch.number}`}
                onPress={() => onPick(id)}
                style={({ pressed }) => ({
                  height: 52,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: C.ironDark,
                  borderWidth: 1,
                  borderColor: C.steel,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Icon name="play" size={14} color={C.gold} />
                <View style={{ flex: 1 }}>
                  <T f="body700" size={11} ls={0.1} color={C.steelLight}>
                    CHAPTER {ch.number}
                  </T>
                  <H size={16} lh={1.1}>
                    {ch.title}
                  </H>
                </View>
              </Pressable>
            )
          })
        )}
      </View>
    </Panel>
  )
}
