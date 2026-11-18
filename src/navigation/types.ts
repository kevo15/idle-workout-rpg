import type { ClassId } from '../../rpg/types'
export type RootStackParamList = {
  Title: undefined
  ClassSelect: undefined
  // Tab screens: TabNav switches between them with `replace`
  Camp: undefined
  Quests: undefined
  Hero: undefined
  /** Map tab: area select (buy and pick a region). */
  Map: undefined
  /** A region's walkable overworld (opened from the Map tab). */
  Overworld: { regionId: string }
  /** A daily quest, or the warm-up before an expedition. */
  Workout:
    | { questId: string }
    | { warmup: true }
    /** A map encounter skipped with a quick set of this exercise. */
    | { encounter: string }
    /** YOUR CALL → WATCH: a set of this exercise to boost the hero first. */
    | { checkpointBoost: string }
  /** YOUR CALL: plan and start the next expedition. */
  Plan: undefined
  /** REPLAY: past expeditions. */
  ReplayLog: undefined
  /** YOUR CALL at the running expedition's checkpoint. */
  Replay: { mode: 'decision' }
  /**
   * Fights:
   *   - a spar: one enemy (its camp-site name picks the fighter kind) at `level`;
   *   - PLAY THROUGH: a logged expedition's key battles in a row (`expeditionId`;
   *     its once-only bonus is paid on finishing);
   *   - WATCH: the same battles replayed with the hero on autopilot, ending as
   *     they really did (`watch`: the expedition id);
   *   - the checkpoint: taking control against the Brute (`checkpoint`), or
   *     watching the hero fight it alone (`auto`: with or without the
   *     boost set); the outcome is recorded on the running expedition.
   */
  Fight:
    | FightParams
    /**
     * Combat training (rpg/tutorial.ts): before the first hand fight, then
     * on to that fight (`then`); `asClass` for the DEV replay.
     */
    | { tutorial: true; asClass?: ClassId; then?: FightParams }
  /** The day's whole quest plan (from the QUEST BOARD). */
  QuestPlan: undefined
  /** Every quest workout, by class (from the QUEST BOARD). */
  Workouts: undefined
  /** Player settings (orientation). */
  Settings: undefined
}

/** Every fight but the combat training. */
export type FightParams =
  /** A spar (`asClass`: DEV only, fight as another class at your level). */
  | { enemy: string; level: number; asClass?: ClassId }
  | { expeditionId: string }
  | { watch: string }
  | { checkpoint: true; auto?: { boosted: boolean } }
  /** A wild enemy met on the map: one fight, gold for a win (daily cap). */
  | { encounter: { enemy: string; level: number } }

export type TabRoute = 'Camp' | 'Quests' | 'Hero' | 'Map'
