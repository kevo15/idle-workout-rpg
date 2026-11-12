import { getExercise } from '../exercises'
import {
  REST_SECONDS,
  sessionReducer,
  startSession,
  type SessionAction,
  type SessionState,
} from '../workoutSession'

const run = (s: SessionState, ...actions: SessionAction[]) =>
  actions.reduce(sessionReducer, s)
const ticks = (n: number): SessionAction[] =>
  Array.from({ length: n }, () => ({ type: 'TICK' }))

describe('workout session', () => {
  it('counts reps, rests between sets and finishes after the last set', () => {
    let s = startSession(getExercise('push-ups')) // 3 x 10 reps
    s = run(s, { type: 'REP' }, { type: 'REP' })
    expect(s.reps).toBe(2)
    s = run(s, { type: 'SET_DONE' })
    expect(s.phase).toBe('REST')
    expect(s.remaining).toBe(REST_SECONDS)
    s = run(s, ...ticks(REST_SECONDS))
    expect(s.phase).toBe('ACTIVE')
    expect(s.set).toBe(2)
    expect(s.reps).toBe(0)
    s = run(
      s,
      { type: 'SET_DONE' },
      { type: 'SKIP_REST' },
      { type: 'SET_DONE' }
    )
    expect(s.phase).toBe('DONE')
  })

  it('runs timed sets down to zero on their own', () => {
    let s = startSession(getExercise('plank')) // 3 x 30 s
    s = run(s, ...ticks(30))
    expect(s.phase).toBe('REST')
    s = run(
      s,
      { type: 'SKIP_REST' },
      ...ticks(30),
      { type: 'SKIP_REST' },
      ...ticks(30)
    )
    expect(s.phase).toBe('DONE')
    expect(s.activeSeconds).toBe(90)
  })

  it('freezes the clock and rep counter while paused', () => {
    let s = startSession(getExercise('plank'))
    s = run(s, { type: 'TOGGLE_PAUSE' }, ...ticks(10))
    expect(s.remaining).toBe(30)
    s = run(s, { type: 'TOGGLE_PAUSE' }, ...ticks(10))
    expect(s.remaining).toBe(20)

    let r = startSession(getExercise('squats'))
    r = run(r, { type: 'TOGGLE_PAUSE' }, { type: 'REP' })
    expect(r.reps).toBe(0)
  })

  it('restarts cleanly on a swap', () => {
    let s = startSession(getExercise('push-ups'))
    s = run(s, { type: 'REP' }, { type: 'SET_DONE' })
    s = sessionReducer(s, {
      type: 'RESTART',
      exercise: getExercise('knee-push-ups'),
    })
    expect(s).toEqual(startSession(getExercise('knee-push-ups')))
  })
})
