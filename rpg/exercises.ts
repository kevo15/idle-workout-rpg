// The exercise catalog: equipment-free movements the quest planner picks
// from (roadmap §3.2). Pure data, shared by the app and (later) the backend.
//
// An exercise's `stat` is the attribute its quest rewards. That's a game
// theme, not a claim that the movement trains only that system. Easier
// variants (`variantOf` set) are never planned on their own: they're offered
// through "Easier" swaps and keep the quest's reward (roadmap T02, T32).

import type { ClassId, StatKey } from './types'

export type ExerciseMode = 'reps' | 'timed'

export type MovementPattern =
  | 'push'
  | 'squat'
  | 'lunge'
  | 'hinge'
  | 'core'
  | 'lateral'
  | 'cardio'
  | 'mobility'

export interface Exercise {
  id: string
  name: string
  stat: StatKey
  mode: ExerciseMode
  sets: number
  /** Reps per set (mode 'reps') or seconds per set (mode 'timed'). */
  target: number
  pattern: MovementPattern
  impact: 'low' | 'medium' | 'high'
  /** Classes whose training theme this fits (roadmap §3.9). */
  classAffinity: ClassId[]
  /** Points a quest built on this exercise awards: 2 easy, 3 standard, 4 hard. */
  reward: number
  /** The easier swap, if there is one. */
  easierId?: string
  /** Set on easier variants: the exercise this one stands in for. */
  variantOf?: string
  cues: string[]
}

const ex = (e: Exercise) => e

export const EXERCISES: Record<string, Exercise> = Object.fromEntries(
  [
    // ---- push
    ex({
      id: 'push-ups',
      name: 'Push-ups',
      stat: 'STR',
      mode: 'reps',
      sets: 3,
      target: 10,
      pattern: 'push',
      impact: 'medium',
      classAffinity: ['warrior'],
      reward: 4,
      easierId: 'knee-push-ups',
      cues: ['Keep your core engaged.', 'Lower with control, then push up.'],
    }),
    ex({
      id: 'knee-push-ups',
      name: 'Knee push-ups',
      stat: 'STR',
      mode: 'reps',
      sets: 3,
      target: 10,
      pattern: 'push',
      impact: 'low',
      classAffinity: ['warrior'],
      reward: 4,
      easierId: 'wall-push-ups',
      variantOf: 'push-ups',
      cues: ['Knees down, body in a straight line from knees to head.'],
    }),
    ex({
      id: 'wall-push-ups',
      name: 'Wall push-ups',
      stat: 'STR',
      mode: 'reps',
      sets: 3,
      target: 12,
      pattern: 'push',
      impact: 'low',
      classAffinity: ['warrior'],
      reward: 4,
      variantOf: 'push-ups',
      cues: [
        'Hands on the wall at shoulder height.',
        'Bend your elbows and press back.',
      ],
    }),
    // ---- squat
    ex({
      id: 'squats',
      name: 'Bodyweight squats',
      stat: 'END',
      mode: 'reps',
      sets: 3,
      target: 12,
      pattern: 'squat',
      impact: 'medium',
      classAffinity: ['warrior'],
      reward: 3,
      easierId: 'chair-squats',
      cues: [
        'Feet shoulder-width apart.',
        'Sit back, chest up, then stand tall.',
      ],
    }),
    ex({
      id: 'chair-squats',
      name: 'Chair squats',
      stat: 'END',
      mode: 'reps',
      sets: 3,
      target: 10,
      pattern: 'squat',
      impact: 'low',
      classAffinity: ['warrior'],
      reward: 3,
      variantOf: 'squats',
      cues: ['Lower until you touch the chair, then stand back up.'],
    }),
    ex({
      id: 'wall-sit',
      name: 'Wall sit',
      stat: 'END',
      mode: 'timed',
      sets: 3,
      target: 30,
      pattern: 'squat',
      impact: 'low',
      classAffinity: ['warrior'],
      reward: 3,
      easierId: 'chair-squats',
      cues: [
        'Back flat on the wall, knees over ankles.',
        'Slide only as low as feels good.',
      ],
    }),
    // ---- core
    ex({
      id: 'plank',
      name: 'Plank hold',
      stat: 'VIT',
      mode: 'timed',
      sets: 3,
      target: 30,
      pattern: 'core',
      impact: 'low',
      classAffinity: ['warrior'],
      reward: 2,
      easierId: 'knee-plank',
      cues: ['Elbows under shoulders.', 'Squeeze your glutes and breathe.'],
    }),
    ex({
      id: 'knee-plank',
      name: 'Knee plank',
      stat: 'VIT',
      mode: 'timed',
      sets: 3,
      target: 20,
      pattern: 'core',
      impact: 'low',
      classAffinity: ['warrior'],
      reward: 2,
      variantOf: 'plank',
      cues: ['Knees down, straight line from knees to head.'],
    }),
    ex({
      id: 'bird-dogs',
      name: 'Bird dogs',
      stat: 'VIT',
      mode: 'reps',
      sets: 3,
      target: 10,
      pattern: 'core',
      impact: 'low',
      classAffinity: [],
      reward: 2,
      cues: [
        'On hands and knees, reach one arm and the opposite leg.',
        'Switch sides each rep.',
      ],
    }),
    ex({
      id: 'superman-hold',
      name: 'Superman hold',
      stat: 'VIT',
      mode: 'timed',
      sets: 3,
      target: 20,
      pattern: 'core',
      impact: 'low',
      classAffinity: [],
      reward: 2,
      cues: [
        'Lie face down, lift arms and legs a little.',
        'Keep your neck long.',
      ],
    }),
    // ---- hinge
    ex({
      id: 'glute-bridges',
      name: 'Glute bridges',
      stat: 'VIT',
      mode: 'reps',
      sets: 3,
      target: 12,
      pattern: 'hinge',
      impact: 'low',
      classAffinity: [],
      reward: 2,
      cues: [
        'Feet flat, knees bent.',
        'Drive through your heels and lift your hips.',
      ],
    }),
    // ---- lunge
    ex({
      id: 'reverse-lunges',
      name: 'Reverse lunges',
      stat: 'END',
      mode: 'reps',
      sets: 3,
      target: 12,
      pattern: 'lunge',
      impact: 'medium',
      classAffinity: ['archer'],
      reward: 3,
      easierId: 'supported-split-squats',
      cues: [
        'Step back, lower gently, alternate legs.',
        'Count each leg as a rep.',
      ],
    }),
    ex({
      id: 'supported-split-squats',
      name: 'Supported split squats',
      stat: 'END',
      mode: 'reps',
      sets: 3,
      target: 10,
      pattern: 'lunge',
      impact: 'low',
      classAffinity: ['archer'],
      reward: 3,
      variantOf: 'reverse-lunges',
      cues: [
        'Hold a wall or chair for balance.',
        'Lower straight down, then rise.',
      ],
    }),
    // ---- lateral / agility
    ex({
      id: 'side-steps',
      name: 'Side steps',
      stat: 'AGI',
      mode: 'timed',
      sets: 3,
      target: 40,
      pattern: 'lateral',
      impact: 'low',
      classAffinity: ['archer'],
      reward: 3,
      cues: ['Stay low and step side to side.', 'Quick, light feet.'],
    }),
    ex({
      id: 'skater-steps',
      name: 'Skater steps',
      stat: 'AGI',
      mode: 'reps',
      sets: 3,
      target: 12,
      pattern: 'lateral',
      impact: 'medium',
      classAffinity: ['archer'],
      reward: 4,
      easierId: 'side-steps',
      cues: [
        'Step wide to one side and swing the back leg behind.',
        'Controlled, no jumping needed.',
      ],
    }),
    // ---- cardio
    ex({
      id: 'jumping-jacks',
      name: 'Jumping jacks',
      stat: 'AGI',
      mode: 'timed',
      sets: 3,
      target: 30,
      pattern: 'cardio',
      impact: 'high',
      classAffinity: ['archer'],
      reward: 3,
      easierId: 'step-jacks',
      cues: ['Jump feet out while arms go up.', 'Land softly.'],
    }),
    ex({
      id: 'step-jacks',
      name: 'Step jacks',
      stat: 'AGI',
      mode: 'timed',
      sets: 3,
      target: 30,
      pattern: 'cardio',
      impact: 'low',
      classAffinity: ['archer'],
      reward: 3,
      variantOf: 'jumping-jacks',
      cues: ['Step one foot out as your arms go up, then switch.'],
    }),
    ex({
      id: 'mountain-climbers',
      name: 'Mountain climbers',
      stat: 'AGI',
      mode: 'timed',
      sets: 3,
      target: 20,
      pattern: 'cardio',
      impact: 'medium',
      classAffinity: ['archer'],
      reward: 4,
      easierId: 'march-in-place',
      cues: [
        'Plank position, drive knees in one at a time.',
        'Go at your own pace.',
      ],
    }),
    ex({
      id: 'march-in-place',
      name: 'March in place',
      stat: 'END',
      mode: 'timed',
      sets: 3,
      target: 45,
      pattern: 'cardio',
      impact: 'low',
      classAffinity: [],
      reward: 2,
      cues: ['Lift your knees and swing your arms.', 'Breathe steadily.'],
    }),
    // ---- mobility
    ex({
      id: 'arm-circles',
      name: 'Arm circles',
      stat: 'AGI',
      mode: 'timed',
      sets: 3,
      target: 30,
      pattern: 'mobility',
      impact: 'low',
      classAffinity: ['archer'],
      reward: 2,
      cues: [
        'Arms out wide, small circles growing bigger.',
        'Reverse halfway through.',
      ],
    }),
    ex({
      id: 'calf-raises',
      name: 'Calf raises',
      stat: 'END',
      mode: 'reps',
      sets: 3,
      target: 15,
      pattern: 'mobility',
      impact: 'low',
      classAffinity: [],
      reward: 2,
      cues: [
        'Rise onto your toes, pause, lower slowly.',
        'Hold a wall for balance if you like.',
      ],
    }),
  ].map((e) => [e.id, e])
)

export function getExercise(id: string): Exercise {
  const e = EXERCISES[id]
  if (!e) throw new Error(`Unknown exercise: ${id}`)
  return e
}

/** Exercises the planner may schedule (easier variants are swap-only). */
export const PRIMARY_EXERCISES: Exercise[] = Object.values(EXERCISES).filter(
  (e) => !e.variantOf
)
