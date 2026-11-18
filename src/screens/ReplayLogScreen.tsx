/**
 * REPLAY: past expeditions, newest first (docs/game-flow.md §6.4). Each can be
 * WATCHED (read-only) or PLAYED THROUGH once for a bonus. The original
 * night's results never change.
 */
import { View } from 'react-native'

import { approachInfo, playThroughBonus } from '../../rpg/expedition'
import { getCampSite } from '../../rpg/world'
import { Screen, ScreenBody } from '../components/arenabackground/Screen'
import {
  Card,
  CrimsonButton,
  GoldButton,
  H,
  Header,
  IconButton,
  N,
  T,
  TapeTag,
} from '../components/ui'
import { useNav } from '../navigation/useNav'
import { handFight } from '../navigation/fightRoute'
import { useCamp, type LoggedExpedition } from '../state/useCamp'
import { C } from '../theme/tokens'

function when(at: number) {
  const d = new Date(at)
  const today = new Date()
  const days = Math.round(
    (new Date(today.toDateString()).getTime() -
      new Date(d.toDateString()).getTime()) /
      86400000
  )
  if (days === 0) return 'LAST NIGHT'
  if (days === 1) return 'NIGHT BEFORE'
  return `${days} NIGHTS AGO`
}

function Entry({
  entry,
  latest,
}: {
  entry: LoggedExpedition
  latest: boolean
}) {
  const nav = useNav()
  const { expedition: e, result: r } = entry
  const site = getCampSite(e.siteId)
  const id = e.id
  return (
    <Card featured={latest} style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TapeTag label={when(entry.claimedAt)} />
        <TapeTag label={approachInfo(e.approach).label} tilt={2} />
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <View style={{ flexShrink: 1, gap: 2 }}>
          <H size={20} skewLeft>
            {site.name.toUpperCase()}
          </H>
          <T size={12} color={C.mist}>
            Enemy level {e.enemyLevel} · {r.hours}h explored
          </T>
        </View>
        <N size={30} lh={1}>
          {r.won}/{r.battles}{' '}
          <N size={30} color={C.gold}>
            +{r.gold}
          </N>
        </N>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <CrimsonButton
          label="WATCH"
          icon="play"
          height={46}
          fontSize={16}
          style={{ flex: 1 }}
          onPress={() => nav.navigate('Fight', { watch: id })}
        />
        <GoldButton
          label={
            entry.playedThrough
              ? 'PLAY AGAIN'
              : `PLAY · +${playThroughBonus(r)}`
          }
          height={40}
          fontSize={16}
          trackWidth={220}
          style={{ flex: 1.2, borderRadius: 12 }}
          onPress={() => nav.navigate('Fight', handFight({ expeditionId: id }))}
        />
      </View>
    </Card>
  )
}

export default function ReplayLogScreen() {
  const nav = useNav()
  const log = useCamp((s) => s.log)
  return (
    <Screen
      split={104}
      bpm={80}
      glow={{ cx: 0.5, cy: 0.3, rx: 0.8, ry: 0.4, opacity: 0.2 }}
    >
      <Header padLeft={16} gap={12}>
        <IconButton
          icon="x"
          label="Close"
          strokeWidth={2.2}
          onPress={() => nav.goBack()}
        />
        <H size={32} lh={1} skew style={{ flex: 1, marginBottom: 4 }}>
          REPLAYS
        </H>
      </Header>
      <ScreenBody style={{ padding: 16, paddingBottom: 32, gap: 10 }}>
        <T size={13} lh={1.45} color={C.mist}>
          WATCH plays an expedition back as it happened. PLAY puts you in the
          fight: take on its key battles yourself for a one-time gold bonus. The
          original results never change.
        </T>
        {log.length === 0 ? (
          <Card>
            <T size={13} color={C.mist}>
              No expeditions yet. Plan one from Camp with YOUR CALL.
            </T>
          </Card>
        ) : (
          log.map((entry, i) => (
            <Entry key={entry.expedition.id} entry={entry} latest={i === 0} />
          ))
        )}
      </ScreenBody>
    </Screen>
  )
}
