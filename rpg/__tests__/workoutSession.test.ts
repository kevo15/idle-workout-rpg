import { getExercise } from '../exercises'
import {
  REP_SECONDS,
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
  it('counts a rep set down, waits for the tap, rests, then finishes', () => {
    let s = startSession(getExercise('push-ups')) // 3 x 10 reps
    expect(s.remaining).toBe(10 * REP_SECONDS)
    s = run(s, ...ticks(5))
    expect(s.remaining).toBe(10 * REP_SECONDS - 5)
    // The clock runs out: the set waits for the player's tap
    s = run(s, ...ticks(60))
    expect(s.remaining).toBe(0)
    expect(s.phase).toBe('ACTIVE')
    s = run(s, { type: 'SET_DONE' })
    expect(s.phase).toBe('REST')
    expect(s.remaining).toBe(REST_SECONDS)
    s = run(s, ...ticks(REST_SECONDS))
    expect(s.phase).toBe('ACTIVE')
    expect(s.set).toBe(2)
    expect(s.remaining).toBe(10 * REP_SECONDS)
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

  it('lets a rep set be finished early with one tap', () => {
    let s = startSession(getExercise('squats'))
    s = run(s, ...ticks(3), { type: 'SET_DONE' })
    expect(s.phase).toBe('REST')
  })

  it('freezes the clock while paused', () => {
    let s = startSession(getExercise('plank'))
    s = run(s, { type: 'TOGGLE_PAUSE' }, ...ticks(10))
    expect(s.remaining).toBe(30)
    s = run(s, { type: 'TOGGLE_PAUSE' }, ...ticks(10))
    expect(s.remaining).toBe(20)

    let r = startSession(getExercise('squats'))
    r = run(r, { type: 'TOGGLE_PAUSE' }, ...ticks(4))
    expect(r.remaining).toBe(12 * REP_SECONDS)
  })

  it('restarts cleanly on a swap', () => {
    let s = startSession(getExercise('push-ups'))
    s = run(s, ...ticks(2), { type: 'SET_DONE' })
    s = sessionReducer(s, {
      type: 'RESTART',
      exercise: getExercise('knee-push-ups'),
    })
    expect(s).toEqual(startSession(getExercise('knee-push-ups')))
  })
})
