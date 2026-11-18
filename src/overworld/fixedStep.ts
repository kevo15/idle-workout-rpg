// Ported from Shadow Sprinter (src/game/fixedStep.ts).
// Movement constants are px per 1/60s step. Driving the simulation straight
// off requestAnimationFrame made game speed follow the display rate — slow in
// dev builds that drop frames, up to 2x too fast on 120Hz phones in release.
// This runs `step` at a fixed 60Hz regardless of how often frames arrive.
export const STEP_MS = 1000 / 60
// Cap on catch-up steps per frame, so a long stall (backgrounding, a GC
// pause) doesn't fast-forward the game in one burst.
const MAX_STEPS_PER_FRAME = 4
// A step may run this much early. Frame callbacks arrive with a millisecond
// or two of jitter, and on 120Hz screens the accumulator sits right on a step
// boundary every other frame, so without slack the steps came out 0-1-0-2
// instead of 0-1-0-1: visible stutter. The early time is paid back from the
// next step (acc goes slightly negative), so the average rate stays 60Hz.
const STEP_TOLERANCE_MS = 2

export type StepClock = { last: number | null; acc: number }

export const newStepClock = (): StepClock => ({ last: null, acc: 0 })

/**
 * Advances `clock` to `now` and returns how many fixed steps are due this
 * frame. Paused (or first frame): no steps, and no time banked to replay on
 * resume.
 */
export function stepsDue(
  clock: StepClock,
  now: number,
  paused = false
): number {
  if (clock.last === null || paused) {
    clock.last = now
    clock.acc = 0
    return 0
  }
  clock.acc += Math.min(now - clock.last, STEP_MS * MAX_STEPS_PER_FRAME)
  clock.last = now
  let steps = 0
  while (
    clock.acc >= STEP_MS - STEP_TOLERANCE_MS &&
    steps < MAX_STEPS_PER_FRAME
  ) {
    clock.acc -= STEP_MS
    steps++
  }
  return steps
}

/**
 * Calls `step` at a fixed 60Hz from a requestAnimationFrame chain. `step`
 * returning false stops the loop. Pass a persistent `clock` when the loop is
 * torn down and rebuilt mid-run so leftover time carries over. Returns a
 * cancel function.
 */
export function runFixedStep(
  step: () => boolean | void,
  opts: { isPausedRef?: { current: boolean }; clock?: StepClock } = {}
): () => void {
  const clock = opts.clock ?? newStepClock()
  let raf: number | null = null
  let stopped = false

  const frame = () => {
    if (stopped) return
    const steps = stepsDue(clock, performance.now(), opts.isPausedRef?.current)
    for (let i = 0; i < steps; i++) {
      if (step() === false) {
        stopped = true
        return
      }
    }
    raf = requestAnimationFrame(frame)
  }

  raf = requestAnimationFrame(frame)
  return () => {
    stopped = true
    if (raf !== null) cancelAnimationFrame(raf)
  }
}
