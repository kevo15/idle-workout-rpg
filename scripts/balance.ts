// Prints each class's autopilot win rate by level and enemy level offset,
// averaged over the enemy kinds. Run: npm run balance
import { ENEMY_KINDS, hitsToKill, winRate } from '../rpg/balance'
import { CLASS_ORDER } from '../rpg/classes'

const N = Number(process.argv[2] ?? 40)
const LEVELS = [1, 3, 5, 8, 12]
const OFFSETS = [-1, 0, 2]

for (const offset of OFFSETS) {
  console.log(`\nenemy level ${offset >= 0 ? '+' : ''}${offset}`)
  console.log(['class   ', ...LEVELS.map((l) => `L${l}`.padStart(5))].join(''))
  for (const c of CLASS_ORDER) {
    const row = LEVELS.map((l) => {
      const el = Math.max(1, l + offset)
      const r =
        ENEMY_KINDS.reduce((s, k) => s + winRate(c, l, k, el, N), 0) /
        ENEMY_KINDS.length
      return `${Math.round(r * 100)}%`.padStart(5)
    })
    console.log([c.padEnd(8), ...row].join(''))
  }
}

console.log('')
console.log('basic hits to beat a same-level enemy (average over kinds)')
console.log(['class   ', ...LEVELS.map((l) => `L${l}`.padStart(5))].join(''))
for (const c of CLASS_ORDER) {
  const row = LEVELS.map((l) => {
    const h =
      ENEMY_KINDS.reduce((s, k) => s + hitsToKill(c, l, k), 0) /
      ENEMY_KINDS.length
    return h.toFixed(1).padStart(5)
  })
  console.log([c.padEnd(8), ...row].join(''))
}
