// Class balance: how often each class wins on autopilot, from a typical
// hero at a level (its base stats plus trained points spread by its stat
// weights). Used by scripts/balance.ts (the full table) and the class
// balance test (a small sample).
import { CLASSES } from './classes'
import {
  enemyFighter,
  EXPEDITION_SKILL,
  heroFighter,
  simulate,
  type EnemyKind,
} from './fight'
import { pointsForLevel } from './progress'
import type { ClassId, StatKey } from './types'

export const ENEMY_KINDS: EnemyKind[] = ['goblin', 'lizard', 'oni', 'ogre']

/** A typical hero of `classId` at `level`. */
export function profileAt(
  classId: ClassId,
  level: number
): Record<StatKey, number> {
  const c = CLASSES[classId]
  const points = pointsForLevel(level)
  const out = { ...c.baseStats }
  for (const k of Object.keys(out) as StatKey[])
    out[k] = Math.round(out[k] + points * c.statWeights[k])
  return out
}

/** Share of `n` autopilot fights won against `kind` at `enemyLevel`. */
export function winRate(
  classId: ClassId,
  level: number,
  kind: EnemyKind,
  enemyLevel: number,
  n: number,
  skill = EXPEDITION_SKILL
) {
  const hero = heroFighter(profileAt(classId, level), classId)
  const enemy = enemyFighter(kind, enemyLevel)
  let won = 0
  for (let i = 0; i < n; i++) {
    const f = simulate(
      { hero, enemy, enemyLevel },
      { seed: `bal:${classId}:${level}:${kind}:${enemyLevel}:${i}`, skill }
    )
    if (f.winner === 'hero') won++
  }
  return won / n
}

/**
 * Basic hits a typical `classId` hero at `level` needs to beat a same-level
 * `kind` (its plain attack, before armor; a Summoner's water ball).
 */
export function hitsToKill(classId: ClassId, level: number, kind: EnemyKind) {
  const hero = heroFighter(profileAt(classId, level), classId)
  const enemy = enemyFighter(kind, level)
  const per = hero.summons ? hero.damage * 0.5 : hero.damage
  return Math.ceil(enemy.maxHp / Math.max(1, per * (1 - enemy.armor)))
}
