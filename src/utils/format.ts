import type { Exercise } from '../../rpg/exercises'

/** "3 sets × 12 reps" / "3 sets × 30 sec". */
export function setsLabel(e: Exercise) {
  return `${e.sets} sets × ${e.target} ${e.mode === 'reps' ? 'reps' : 'sec'}`
}

export const formatGold = (n: number) => n.toLocaleString('en-US')
