// The workout-in-progress state machine. Pure reducer, driven by the screen's
// 1-second ticks and button presses:
//
//   ACTIVE (set n) ──SET_DONE / timer hits 0──▶ REST ──timer / SKIP_REST──▶ ACTIVE (n+1)
//   ACTIVE (last set) ──SET_DONE / timer hits 0──▶ DONE
//
// Timed sets (holds) end on their own when the clock reaches 0. Rep sets
// count down a suggested time (REP_SECONDS a rep) as a pace guide, then wait:
// the player taps once when they've done the reps (SET_DONE). No per-rep
// tapping. Completion is self-attested (roadmap D12): SET DONE always counts
// the set, so stopping early is never punished.

import type { Exercise, ExerciseMode } from './exercises'

export const REST_SECONDS = 30
/** Suggested seconds per rep: a rep set's countdown is reps × this. */
export const REP_SECONDS = 3

/** A set's clock: its hold time, or the suggested time for its reps. */
export const setSeconds = (mode: ExerciseMode, target: number) =>
  mode === 'timed' ? target : target * REP_SECONDS

export type SessionPhase = 'ACTIVE' | 'REST' | 'DONE'

export interface SessionState {
  exerciseId: string
  mode: ExerciseMode
  sets: number
  /** Reps per set, or seconds per set for timed exercises. */
  target: number
  set: number
  phase: SessionPhase
  paused: boolean
  /** Seconds left in the set (rep sets stop at 0 and wait) or the rest. */
  remaining: number
  /** Seconds spent in ACTIVE sets so far. */
  activeSeconds: number
}

export type SessionAction =
  | { type: 'TICK' }
  | { type: 'SET_DONE' }
  | { type: 'SKIP_REST' }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'RESTART'; exercise: Exercise }

export function startSession(exercise: Exercise): SessionState {
  return {
    exerciseId: exercise.id,
    mode: exercise.mode,
    sets: exercise.sets,
    target: exercise.target,
    set: 1,
    phase: 'ACTIVE',
    paused: false,
    remaining: setSeconds(exercise.mode, exercise.target),
    activeSeconds: 0,
  }
}

function finishSet(s: SessionState): SessionState {
  if (s.set >= s.sets)
    return { ...s, phase: 'DONE', paused: false, remaining: 0 }
  return { ...s, phase: 'REST', paused: false, remaining: REST_SECONDS }
}

function nextSet(s: SessionState): SessionState {
  return {
    ...s,
    phase: 'ACTIVE',
    set: s.set + 1,
    remaining: setSeconds(s.mode, s.target),
  }
}

export function sessionReducer(
  s: SessionState,
  a: SessionAction
): SessionState {
  if (a.type === 'RESTART') return startSession(a.exercise)
  if (s.phase === 'DONE') return s

  switch (a.type) {
    case 'TOGGLE_PAUSE':
      return { ...s, paused: !s.paused }
    case 'TICK': {
      if (s.paused) return s
      if (s.phase === 'REST') {
        return s.remaining <= 1
          ? nextSet(s)
          : { ...s, remaining: s.remaining - 1 }
      }
      const active = { ...s, activeSeconds: s.activeSeconds + 1 }
      if (s.mode === 'timed') {
        return s.remaining <= 1
          ? finishSet({ ...active, remaining: 0 })
          : { ...active, remaining: s.remaining - 1 }
      }
      // Rep sets: count down the pace guide, then wait for the tap
      return { ...active, remaining: Math.max(0, s.remaining - 1) }
    }
    case 'SET_DONE':
      return s.phase === 'ACTIVE' ? finishSet(s) : s
    case 'SKIP_REST':
      return s.phase === 'REST' ? nextSet(s) : s
  }
}

export function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
