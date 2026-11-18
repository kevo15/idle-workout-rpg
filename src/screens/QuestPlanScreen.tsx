/**
 * Today's quests: the whole day's plan from the Quests tab's QUEST BOARD,
 * grouped by when each batch arrives, then the bonus quests. Each shows its
 * exercise, sets, track, reward and where it stands (done, open now,
 * expired, upcoming, locked). Tap an open one to start it; tap any other to
 * see how the move is done.
 */
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { getExercise, type Exercise } from '../../rpg/exercises'
import { questBoard, type BoardEntry } from '../../rpg/progress'
import { Screen, ScreenBody } from '../components/arenabackground/Screen'
import { ExerciseDiagram } from '../components/ExerciseDiagram'
import { HowToModal } from '../components/HowToModal'
import { Card, H, Header, Icon, IconButton, T, TapeTag } from '../components/ui'
import { useNav } from '../navigation/useNav'
import { useHero, useMinuteOfDay } from '../state/useHero'
import { C, STAT_TEXT } from '../theme/tokens'
import { setsLabel } from '../utils/format'

/** "MIDNIGHT", "2:15 PM". */
function clock(min: number) {
  if (min === 0) return 'MIDNIGHT'
  const h = Math.floor(min / 60)
  const m = min % 60
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

const STATUS: Record<
  BoardEntry['status'],
  { label: string; color: string; dim?: boolean }
> = {
  done: { label: 'DONE', color: C.success },
  open: { label: 'OPEN NOW', color: C.gold },
  expired: { label: 'EXPIRED', color: C.steelLight, dim: true },
  upcoming: { label: 'LATER', color: C.mist },
  locked: { label: 'LOCKED', color: C.steelLight, dim: true },
}

function Row({
  entry,
  exercise,
  onPress,
}: {
  entry: BoardEntry
  exercise: Exercise
  onPress: () => void
}) {
  const st = STATUS[entry.status]
  const { quest } = entry
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name}, ${st.label.toLowerCase()}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        borderRadius: 12,
        backgroundColor: entry.status === 'open' ? C.deepRed : C.ironDark,
        borderWidth: 1,
        borderColor: entry.status === 'open' ? C.gold : C.steel,
        opacity: st.dim ? 0.55 : pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          borderRadius: 8,
          backgroundColor: C.floor,
          overflow: 'hidden',
        }}
      >
        <ExerciseDiagram exercise={exercise} width={72} still />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T f="body700" size={10} ls={0.1} color={C.steelLight}>
            {quest.track}
          </T>
          {entry.exerciseId !== quest.exerciseId ? (
            <T f="body700" size={10} ls={0.1} color={C.steelLight}>
              · EASIER
            </T>
          ) : null}
        </View>
        <H size={16} lh={1.1} skewLeft>
          {exercise.name.toUpperCase()}
        </H>
        <T size={12} color={C.mist}>
          {setsLabel(exercise)}
        </T>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <T f="body800" size={13} color={STAT_TEXT[quest.reward.stat]}>
          +{quest.reward.amount} {quest.reward.stat}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {entry.status === 'done' ? (
            <Icon name="check" size={13} color={st.color} />
          ) : null}
          <T f="body800" size={10} ls={0.1} color={st.color}>
            {entry.status === 'upcoming' ? clock(quest.opensAt) : st.label}
          </T>
        </View>
      </View>
    </Pressable>
  )
}

export default function QuestPlanScreen() {
  const nav = useNav()
  const day = useHero((s) => s.today)
  const now = useMinuteOfDay()
  const [howTo, setHowTo] = useState<Exercise | null>(null)
  const board = questBoard(day, now)

  // Batches in order, then the bonus quests
  const groups: { title: string; sub: string; entries: BoardEntry[] }[] = []
  for (const entry of board) {
    const q = entry.quest
    const key = q.kind === 'ad' ? 'BONUS QUESTS' : clock(q.opensAt)
    let g = groups.find((x) => x.title === key)
    if (!g) {
      g = {
        title: key,
        sub:
          q.kind === 'ad'
            ? 'Unlocked with the +1 QUEST button (up to 2 a day).'
            : q.opensAt > now
              ? 'Arrives later today.'
              : now < q.closesAt
                ? 'Out now.'
                : 'Replaced by a newer batch.',
        entries: [],
      }
      groups.push(g)
    }
    g.entries.push(entry)
  }
  const counts = {
    done: board.filter((b) => b.status === 'done').length,
    total: board.filter((b) => b.quest.kind === 'scheduled').length,
  }

  return (
    <Screen
      bpm={90}
      glow={{ cx: 0.5, cy: 0.2, rx: 0.8, ry: 0.3, opacity: 0.18 }}
      split={104}
    >
      <Header padLeft={16} gap={12}>
        <IconButton
          icon="x"
          label="Close"
          strokeWidth={2.2}
          onPress={() => nav.goBack()}
        />
        <H size={30} lh={1} skew style={{ flex: 1, marginBottom: 4 }}>
          TODAY’S QUESTS
        </H>
      </Header>
      <ScreenBody style={{ padding: 16, paddingBottom: 32, gap: 12 }}>
        <T size={13} lh={1.45} color={C.mist}>
          {counts.done} done of {counts.total} planned today. Quests arrive in
          batches every 2–4 hours; each batch replaces the last. Tap an open
          quest to start it, or any quest to see how it’s done.
        </T>
        {board.length === 0 ? (
          <Card>
            <T size={13} color={C.mist}>
              Pick a class to get your first quests.
            </T>
          </Card>
        ) : null}
        {groups.map((g) => (
          <View key={g.title} style={{ gap: 6 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <TapeTag label={g.title} />
              <T size={12} color={C.steelLight}>
                {g.sub}
              </T>
            </View>
            {g.entries.map((entry) => {
              const exercise = getExercise(entry.exerciseId)
              return (
                <Row
                  key={entry.quest.id}
                  entry={entry}
                  exercise={exercise}
                  onPress={() =>
                    entry.status === 'open'
                      ? nav.navigate('Workout', { questId: entry.quest.id })
                      : setHowTo(exercise)
                  }
                />
              )
            })}
          </View>
        ))}
      </ScreenBody>
      <HowToModal exercise={howTo} onClose={() => setHowTo(null)} />
    </Screen>
  )
}
