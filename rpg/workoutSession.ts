// The workout-in-progress state machine. Pure reducer, driven by the screen's
// 1-second ticks and button presses:
//
//   ACTIVE (set n) ──SET_DONE / timer hits 0──▶ REST ──timer / SKIP_REST──▶ ACTIVE (n+1)
//   ACTIVE (last set) ──SET_DONE / timer hits 0──▶ DONE
//
// Completion is self-attested (roadmap D12): SET DONE always counts the set,
// whatever the rep count, so stopping early is never punished.

import type { Exercise, ExerciseMode } from './exercises'

export const REST_SECONDS = 30

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
  /** Reps counted in the current set (reps mode). */
  reps: number
  /** Seconds left in a timed set or the rest. */
  remaining: number
  /** Seconds spent in ACTIVE sets so far. */
  activeSeconds: number
}

export type SessionAction =
  | { type: 'TICK' }
  | { type: 'REP' }
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
    reps: 0,
    remaining: exercise.mode === 'timed' ? exercise.target : 0,
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
    reps: 0,
    remaining: s.mode === 'timed' ? s.target : 0,
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
      return active
    }
    case 'REP':
      if (s.phase !== 'ACTIVE' || s.mode !== 'reps' || s.paused) return s
      return { ...s, reps: Math.min(s.reps + 1, s.target * 2) }
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
