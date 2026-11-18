import data from '../data/workouts.json'
import {
  getExercise,
  loadWorkouts,
  type WorkoutEntry,
  type WorkoutsFile,
} from '../exercises'

const base: WorkoutEntry = {
  id: 'test-squats',
  name: 'Test squats',
  classes: ['warrior'],
  stat: 'END',
  sets: 3,
  reps: 10,
  reward: 3,
  pattern: 'squat',
  impact: 'low',
  cues: ['Sit back.'],
}
const file = (...workouts: WorkoutEntry[]): WorkoutsFile => ({
  warmups: {},
  workouts,
})

describe('rpg/data/workouts.json', () => {
  it('loads cleanly', () => {
    expect(() => loadWorkouts(data as WorkoutsFile)).not.toThrow()
  })

  it('turns reps and seconds into the game’s mode and target', () => {
    const { exercises } = loadWorkouts(
      file(base, { ...base, id: 'test-hold', reps: undefined, seconds: 30 })
    )
    expect(exercises['test-squats']).toMatchObject({ mode: 'reps', target: 10 })
    expect(exercises['test-hold']).toMatchObject({ mode: 'timed', target: 30 })
  })

  it('marks easier versions so the planner skips them', () => {
    const { exercises } = loadWorkouts(
      file(
        { ...base, easier: 'test-easy' },
        { ...base, id: 'test-easy', easierVersionOf: 'test-squats' }
      )
    )
    expect(exercises['test-squats'].easierId).toBe('test-easy')
    expect(exercises['test-easy'].variantOf).toBe('test-squats')
  })

  it('explains typos instead of making odd quests', () => {
    const bad = file(
      { ...base, classes: ['wizard'] },
      { ...base, id: 'two', seconds: 30 },
      { ...base, id: 'three', stat: 'STRENGTH', easier: 'nope' },
      { ...base, id: 'three', pattern: 'jumping' }
    )
    let msg = ''
    try {
      loadWorkouts(bad)
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toContain('unknown class "wizard"')
    expect(msg).toContain('give either "reps" or "seconds"')
    expect(msg).toContain('stat must be one of')
    expect(msg).toContain('easier swap "nope" isn\'t a workout')
    expect(msg).toContain('id is used twice')
    expect(msg).toContain('pattern must be one of')
  })

  it('keeps old saves working: retired ids give their replacement', () => {
    expect(getExercise('reverse-lunges').id).toBe('lunges')
    expect(getExercise('side-steps').id).toBe('lunges')
    expect(() => getExercise('never-existed')).toThrow()
  })

  it('checks warm-ups point at main workouts', () => {
    const f = {
      warmups: { warrior: 'missing' },
      workouts: [base],
    }
    expect(() => loadWorkouts(f)).toThrow('"missing" isn\'t a workout')
  })
})
