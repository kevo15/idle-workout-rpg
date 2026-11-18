// Exercise diagrams: a stick figure looping through key poses (docs: the
// workout screen's "how to"). Pure data so the app and the workout sheet
// (scripts/buildWorkoutSheet.ts) share it.
//
// Coordinates are on a 120 x 80 grid, floor at y = 74. Side views face
// right. "1" limbs are the near side (drawn bright), "2" the far side (drawn
// dim); a pose that leaves out the far limbs copies the near ones. To add a
// diagram: add an entry keyed by the workout id with 2+ poses. Easier
// versions without their own entry use their main workout's.

import { EXERCISES, type Exercise } from '../../rpg/exercises'

export type Pt = [number, number]

/** H head, N neck/shoulders, P hips, E elbow, W wrist, K knee, F ankle. */
export type Pose = {
  H: Pt
  N: Pt
  P: Pt
  E1: Pt
  W1: Pt
  K1: Pt
  F1: Pt
  E2?: Pt
  W2?: Pt
  K2?: Pt
  F2?: Pt
}

export type Prop =
  | { kind: 'chair'; x: number; seat: number; facing: 'left' | 'right' }
  | { kind: 'wall'; x: number }

export type Diagram = {
  /** Side views draw feet as short toes pointing right. */
  view: 'side' | 'front' | 'lying'
  poses: Pose[]
  /** Milliseconds to move from one pose to the next. */
  ms: number
  props?: Prop[]
}

export const FLOOR = 74
export const GRID = { width: 120, height: 80 }

export const JOINTS = [
  'H',
  'N',
  'P',
  'E1',
  'W1',
  'K1',
  'F1',
  'E2',
  'W2',
  'K2',
  'F2',
] as const
export type Joint = (typeof JOINTS)[number]

/** Bones drawn far side first (dim), then the near side. */
export const FAR_BONES: [Joint, Joint][] = [
  ['N', 'E2'],
  ['E2', 'W2'],
  ['P', 'K2'],
  ['K2', 'F2'],
]
export const NEAR_BONES: [Joint, Joint][] = [
  ['N', 'P'],
  ['P', 'K1'],
  ['K1', 'F1'],
  ['N', 'E1'],
  ['E1', 'W1'],
]

/** Fills in the far limbs from the near ones, a touch behind. */
export function fullPose(p: Pose): Required<Pose> {
  const behind = (q: Pt): Pt => [q[0] - 2, q[1]]
  return {
    ...p,
    E2: p.E2 ?? behind(p.E1),
    W2: p.W2 ?? behind(p.W1),
    K2: p.K2 ?? behind(p.K1),
    F2: p.F2 ?? behind(p.F1),
  }
}

const up = (p: Pose, dy: number): Pose =>
  Object.fromEntries(
    Object.entries(p).map(([k, v]) => [k, [v[0], v[1] - dy]])
  ) as Pose

// ---- shared poses -----------------------------------------------------------

const STAND: Pose = {
  H: [60, 16],
  N: [60, 24],
  P: [60, 46],
  E1: [61, 35],
  W1: [62, 45],
  K1: [61, 60],
  F1: [60, 74],
}
const SQUAT: Pose = {
  H: [63, 29],
  N: [60, 37],
  P: [52, 58],
  E1: [70, 38],
  W1: [80, 38],
  K1: [70, 62],
  F1: [60, 74],
}
/** Squatting with hands on the floor (burpees). */
const CROUCH: Pose = {
  H: [72, 42],
  N: [66, 46],
  P: [54, 60],
  E1: [70, 56],
  W1: [72, 74],
  K1: [68, 60],
  F1: [60, 74],
}
const JUMP: Pose = {
  H: [60, 6],
  N: [60, 14],
  P: [60, 36],
  E1: [63, 6],
  W1: [64, 0],
  K1: [61, 50],
  F1: [62, 63],
}
const PUSH_UP: Pose = {
  H: [90, 50],
  N: [82, 54],
  P: [60, 60],
  E1: [83, 64],
  W1: [84, 74],
  K1: [44, 67],
  F1: [28, 74],
}
const PUSH_DOWN: Pose = {
  H: [90, 62],
  N: [82, 65],
  P: [60, 67],
  E1: [73, 67],
  W1: [84, 74],
  K1: [44, 70],
  F1: [28, 74],
}
/** One leg stepped back from the crouch (step-back burpees). */
const HALF_BACK: Pose = {
  ...CROUCH,
  P: [56, 62],
  K2: [44, 70],
  F2: [32, 74],
}
const LYING: Pose = {
  H: [22, 68],
  N: [30, 70],
  P: [52, 72],
  E1: [38, 66],
  W1: [33, 62],
  K1: [64, 58],
  F1: [74, 74],
}

// ---- diagrams ---------------------------------------------------------------

export const DIAGRAMS: Record<string, Diagram> = {
  'push-ups': { view: 'side', poses: [PUSH_UP, PUSH_DOWN], ms: 900 },
  'knee-push-ups': {
    view: 'side',
    ms: 900,
    poses: [
      { ...PUSH_UP, P: [60, 63], K1: [46, 74], F1: [32, 66] },
      { ...PUSH_DOWN, P: [60, 69], K1: [46, 74], F1: [32, 66] },
    ],
  },
  'wall-push-ups': {
    view: 'side',
    ms: 900,
    props: [{ kind: 'wall', x: 90 }],
    poses: [
      {
        H: [78, 19],
        N: [74, 26],
        P: [66, 47],
        E1: [81, 27],
        W1: [90, 26],
        K1: [62, 61],
        F1: [58, 74],
      },
      {
        H: [83, 23],
        N: [79, 30],
        P: [68, 49],
        E1: [80, 39],
        W1: [90, 26],
        K1: [63, 62],
        F1: [58, 74],
      },
    ],
  },
  'chair-dips': {
    view: 'side',
    ms: 1000,
    props: [{ kind: 'chair', x: 38, seat: 56, facing: 'right' }],
    poses: [
      {
        H: [52, 27],
        N: [51, 35],
        P: [56, 57],
        E1: [51, 46],
        W1: [50, 56],
        K1: [72, 64],
        F1: [86, 74],
      },
      {
        H: [53, 38],
        N: [52, 46],
        P: [56, 67],
        E1: [42, 47],
        W1: [50, 56],
        K1: [72, 68],
        F1: [86, 74],
      },
    ],
  },
  'bent-knee-dips': {
    view: 'side',
    ms: 1000,
    props: [{ kind: 'chair', x: 38, seat: 56, facing: 'right' }],
    poses: [
      {
        H: [52, 27],
        N: [51, 35],
        P: [56, 57],
        E1: [51, 46],
        W1: [50, 56],
        K1: [70, 58],
        F1: [70, 74],
      },
      {
        H: [53, 35],
        N: [52, 43],
        P: [56, 64],
        E1: [43, 45],
        W1: [50, 56],
        K1: [70, 62],
        F1: [70, 74],
      },
    ],
  },
  'arm-circles': {
    view: 'front',
    ms: 350,
    poses: [
      [82, 20],
      [86, 24],
      [82, 28],
      [78, 24],
    ].map(([x, y]): Pose => ({
      H: [60, 16],
      N: [60, 24],
      P: [60, 46],
      E1: [71, (24 + y) / 2],
      W1: [x, y],
      E2: [49, (24 + y) / 2],
      W2: [120 - x, y],
      K1: [64, 60],
      F1: [66, 74],
      K2: [56, 60],
      F2: [54, 74],
    })),
  },
  plank: {
    view: 'side',
    ms: 1400,
    poses: [
      {
        H: [88, 57],
        N: [80, 60],
        P: [58, 64],
        E1: [80, 74],
        W1: [92, 74],
        K1: [42, 69],
        F1: [26, 74],
      },
      {
        H: [88, 56],
        N: [80, 59],
        P: [58, 62],
        E1: [80, 74],
        W1: [92, 74],
        K1: [42, 68],
        F1: [26, 74],
      },
    ],
  },
  'knee-plank': {
    view: 'side',
    ms: 1400,
    poses: [
      {
        H: [88, 57],
        N: [80, 60],
        P: [60, 65],
        E1: [80, 74],
        W1: [92, 74],
        K1: [44, 74],
        F1: [30, 67],
      },
      {
        H: [88, 56],
        N: [80, 59],
        P: [60, 64],
        E1: [80, 74],
        W1: [92, 74],
        K1: [44, 74],
        F1: [30, 67],
      },
    ],
  },
  squats: {
    view: 'side',
    ms: 900,
    poses: [{ ...STAND, E1: [66, 28], W1: [74, 26] }, SQUAT],
  },
  'chair-squats': {
    view: 'side',
    ms: 1000,
    props: [{ kind: 'chair', x: 36, seat: 58, facing: 'right' }],
    poses: [
      { ...STAND, E1: [66, 28], W1: [74, 26] },
      { ...SQUAT, P: [50, 57] },
    ],
  },
  'jump-squats': { view: 'side', ms: 600, poses: [SQUAT, STAND, JUMP, STAND] },
  lunges: {
    view: 'side',
    ms: 800,
    poses: [
      STAND,
      {
        H: [60, 28],
        N: [60, 36],
        P: [60, 58],
        E1: [61, 46],
        W1: [62, 56],
        K1: [74, 58],
        F1: [74, 74],
        K2: [52, 72],
        F2: [40, 74],
      },
      STAND,
      {
        H: [60, 28],
        N: [60, 36],
        P: [60, 58],
        E1: [61, 46],
        W1: [62, 56],
        K2: [74, 58],
        F2: [74, 74],
        K1: [52, 72],
        F1: [40, 74],
      },
    ],
  },
  'supported-lunges': {
    view: 'side',
    ms: 1000,
    props: [{ kind: 'chair', x: 84, seat: 56, facing: 'left' }],
    poses: [
      { ...STAND, E1: [70, 38], W1: [84, 42] },
      {
        H: [60, 23],
        N: [60, 31],
        P: [60, 53],
        E1: [71, 40],
        W1: [84, 42],
        K1: [70, 58],
        F1: [72, 74],
        K2: [52, 66],
        F2: [44, 74],
      },
    ],
  },
  'mountain-climbers': {
    view: 'side',
    ms: 400,
    poses: [
      { ...PUSH_UP, K1: [66, 64], F1: [58, 72], K2: [44, 67], F2: [28, 74] },
      { ...PUSH_UP, K2: [66, 64], F2: [58, 72], K1: [44, 67], F1: [28, 74] },
    ],
  },
  'wall-sit': {
    view: 'side',
    ms: 1400,
    props: [{ kind: 'wall', x: 40 }],
    poses: [
      {
        H: [45, 28],
        N: [44, 36],
        P: [44, 58],
        E1: [50, 46],
        W1: [56, 55],
        K1: [60, 58],
        F1: [60, 74],
      },
      {
        H: [45, 27],
        N: [44, 35],
        P: [44, 58],
        E1: [50, 45],
        W1: [56, 55],
        K1: [60, 58],
        F1: [60, 74],
      },
    ],
  },
  'calf-raises': {
    view: 'side',
    ms: 700,
    poses: [STAND, { ...up(STAND, 5), F1: [62, 70] }],
  },
  burpees: {
    view: 'side',
    ms: 450,
    poses: [STAND, CROUCH, PUSH_UP, CROUCH, JUMP],
  },
  'step-back-burpees': {
    view: 'side',
    ms: 550,
    poses: [STAND, CROUCH, HALF_BACK, PUSH_UP, HALF_BACK, CROUCH],
  },
  'jumping-jacks': {
    view: 'front',
    ms: 400,
    poses: [
      {
        H: [60, 16],
        N: [60, 24],
        P: [60, 46],
        E1: [63, 34],
        W1: [64, 44],
        E2: [57, 34],
        W2: [56, 44],
        K1: [61, 60],
        F1: [62, 74],
        K2: [59, 60],
        F2: [58, 74],
      },
      {
        H: [60, 13],
        N: [60, 21],
        P: [60, 43],
        E1: [69, 13],
        W1: [73, 4],
        E2: [51, 13],
        W2: [47, 4],
        K1: [66, 57],
        F1: [72, 71],
        K2: [54, 57],
        F2: [48, 71],
      },
    ],
  },
  'step-jacks': {
    view: 'front',
    ms: 600,
    poses: [
      {
        H: [60, 16],
        N: [60, 24],
        P: [60, 46],
        E1: [63, 34],
        W1: [64, 44],
        E2: [57, 34],
        W2: [56, 44],
        K1: [61, 60],
        F1: [62, 74],
        K2: [59, 60],
        F2: [58, 74],
      },
      {
        H: [60, 16],
        N: [60, 24],
        P: [60, 46],
        E1: [69, 16],
        W1: [73, 7],
        E2: [51, 16],
        W2: [47, 7],
        K1: [67, 60],
        F1: [74, 74],
        K2: [59, 60],
        F2: [58, 74],
      },
      {
        H: [60, 16],
        N: [60, 24],
        P: [60, 46],
        E1: [63, 34],
        W1: [64, 44],
        E2: [57, 34],
        W2: [56, 44],
        K1: [61, 60],
        F1: [62, 74],
        K2: [59, 60],
        F2: [58, 74],
      },
      {
        H: [60, 16],
        N: [60, 24],
        P: [60, 46],
        E1: [69, 16],
        W1: [73, 7],
        E2: [51, 16],
        W2: [47, 7],
        K1: [61, 60],
        F1: [62, 74],
        K2: [53, 60],
        F2: [46, 74],
      },
    ],
  },
  'high-knees': {
    view: 'side',
    ms: 300,
    poses: [
      {
        ...up(STAND, 2),
        K1: [70, 44],
        F1: [70, 58],
        K2: [60, 58],
        F2: [60, 72],
        E1: [55, 32],
        W1: [52, 40],
        E2: [66, 30],
        W2: [70, 24],
      },
      {
        ...up(STAND, 2),
        K2: [70, 44],
        F2: [70, 58],
        K1: [60, 58],
        F1: [60, 72],
        E2: [55, 32],
        W2: [52, 40],
        E1: [66, 30],
        W1: [70, 24],
      },
    ],
  },
  'march-in-place': {
    view: 'side',
    ms: 600,
    poses: [
      {
        ...STAND,
        K1: [68, 52],
        F1: [66, 66],
        K2: [60, 60],
        F2: [60, 74],
        E1: [56, 34],
        W1: [54, 42],
        E2: [65, 33],
        W2: [68, 28],
      },
      {
        ...STAND,
        K2: [68, 52],
        F2: [66, 66],
        K1: [60, 60],
        F1: [60, 74],
        E2: [56, 34],
        W2: [54, 42],
        E1: [65, 33],
        W1: [68, 28],
      },
    ],
  },
  'sit-ups': {
    view: 'lying',
    ms: 1000,
    poses: [
      LYING,
      {
        ...LYING,
        H: [44, 42],
        N: [46, 50],
        E1: [52, 56],
        W1: [60, 58],
      },
    ],
  },
  crunches: {
    view: 'lying',
    ms: 900,
    poses: [
      LYING,
      { ...LYING, H: [29, 58], N: [35, 63], E1: [42, 62], W1: [50, 62] },
    ],
  },
  'heel-touches': {
    view: 'lying',
    ms: 600,
    poses: [
      {
        ...LYING,
        H: [27, 61],
        N: [34, 65],
        E1: [44, 70],
        W1: [56, 72],
        E2: [40, 62],
        W2: [44, 60],
      },
      {
        ...LYING,
        H: [27, 61],
        N: [34, 65],
        E2: [44, 70],
        W2: [56, 72],
        E1: [40, 62],
        W1: [44, 60],
      },
    ],
  },
  // Seated, leaning back, knees together and bent, feet just off the floor;
  // the hands twist side to side while the knees sway a touch the other way
  'russian-twists': {
    view: 'front',
    ms: 650,
    poses: [
      {
        H: [63, 33],
        N: [62, 41],
        P: [60, 62],
        E1: [70, 50],
        W1: [76, 56],
        E2: [68, 52],
        W2: [76, 56],
        K1: [59, 52],
        F1: [60, 64],
        K2: [55, 52],
        F2: [55, 64],
      },
      {
        H: [57, 33],
        N: [58, 41],
        P: [60, 62],
        E1: [50, 50],
        W1: [44, 56],
        E2: [52, 52],
        W2: [44, 56],
        K1: [65, 52],
        F1: [65, 64],
        K2: [61, 52],
        F2: [60, 64],
      },
    ],
  },
  'dead-bugs': {
    view: 'lying',
    ms: 900,
    poses: [
      {
        ...LYING,
        E1: [24, 62],
        W1: [16, 64],
        E2: [31, 60],
        W2: [32, 50],
        K1: [52, 58],
        F1: [64, 58],
        K2: [64, 66],
        F2: [78, 70],
      },
      {
        ...LYING,
        E2: [24, 62],
        W2: [16, 64],
        E1: [31, 60],
        W1: [32, 50],
        K2: [52, 58],
        F2: [64, 58],
        K1: [64, 66],
        F1: [78, 70],
      },
    ],
  },
  'heel-taps': {
    view: 'lying',
    ms: 800,
    poses: [
      {
        ...LYING,
        E1: [31, 66],
        W1: [36, 72],
        K1: [52, 58],
        F1: [62, 72],
        K2: [52, 58],
        F2: [64, 58],
      },
      {
        ...LYING,
        E1: [31, 66],
        W1: [36, 72],
        K2: [52, 58],
        F2: [62, 72],
        K1: [52, 58],
        F1: [64, 58],
      },
    ],
  },
  'toe-touches': {
    view: 'lying',
    ms: 700,
    poses: [
      {
        ...LYING,
        K1: [54, 56],
        F1: [56, 40],
        E1: [26, 62],
        W1: [18, 60],
        E2: [26, 63],
        W2: [18, 61],
      },
      {
        ...LYING,
        H: [36, 58],
        N: [40, 62],
        K1: [54, 56],
        F1: [56, 40],
        E1: [48, 52],
        W1: [55, 42],
        E2: [32, 66],
        W2: [26, 64],
      },
      {
        ...LYING,
        K1: [54, 56],
        F1: [56, 40],
        E1: [26, 62],
        W1: [18, 60],
        E2: [26, 63],
        W2: [18, 61],
      },
      {
        ...LYING,
        H: [36, 58],
        N: [40, 62],
        K1: [54, 56],
        F1: [56, 40],
        E2: [48, 52],
        W2: [55, 42],
        E1: [32, 66],
        W1: [26, 64],
      },
    ],
  },
  'lying-knee-raises': {
    view: 'lying',
    ms: 900,
    poses: [
      { ...LYING, E1: [38, 72], W1: [46, 72], K1: [66, 72], F1: [80, 72] },
      { ...LYING, E1: [38, 72], W1: [46, 72], K1: [46, 56], F1: [58, 62] },
    ],
  },
}

/** The diagram for a workout: its own, else its main workout's. */
export function diagramFor(e: Exercise): Diagram | undefined {
  return DIAGRAMS[e.id] ?? (e.variantOf ? DIAGRAMS[e.variantOf] : undefined)
}

/** Workouts with no diagram yet (a test keeps this empty). */
export const missingDiagrams = () =>
  Object.values(EXERCISES)
    .filter((e) => !diagramFor(e))
    .map((e) => e.id)
