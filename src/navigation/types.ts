export type RootStackParamList = {
  Title: undefined
  ClassSelect: undefined
  // Tab screens: TabNav switches between them with `replace`
  Camp: undefined
  Quests: undefined
  Hero: undefined
  Map: undefined
  /** A daily quest, or the warm-up before an expedition. */
  Workout: { questId: string } | { warmup: true }
  /** YOUR CALL: plan and start the next expedition. */
  Plan: undefined
  /** REPLAY: past expeditions. */
  ReplayLog: undefined
  /**
   * The battle view. `decision`: answer the running expedition's checkpoint.
   * `watch`: read-only playback of a logged expedition. `play`: play a logged
   * expedition through for its once-only bonus.
   */
  Replay:
    { mode: 'decision' } | { mode: 'watch' | 'play'; expeditionId: string }
}

export type TabRoute = 'Camp' | 'Quests' | 'Hero' | 'Map'
