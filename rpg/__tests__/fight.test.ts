import {
  ARENA,
  ARMOR_MS,
  COUNTER_DAMAGE,
  SUMMON_HITS,
  enemyFighter,
  enemyTarget,
  heroDodges,
  heroFighter,
  kindOf,
  newFight,
  NO_INPUT,
  replaySeed,
  simulate,
  stepFight,
  windupOf,
  type Fight,
  type FightInput,
} from '../fight'
import { ENEMY_KINDS, winRate } from '../balance'
import { seeded } from '../rng'
import type { ClassId } from '../types'

const STATS = { STR: 7, END: 5, AGI: 3, VIT: 5 }

const fightVs = (
  kind: 'goblin' | 'ogre' = 'goblin',
  level = 1,
  seed = 's1',
  classId: 'warrior' | 'rogue' = 'warrior'
) =>
  newFight({
    hero: heroFighter(STATS, classId),
    enemy: enemyFighter(kind, level),
    enemyLevel: level,
    seed,
  })

const press = (p: Partial<FightInput>): FightInput => ({ ...NO_INPUT, ...p })

/** Steps until `done` (or `max` steps), feeding `input`. */
function until(
  f: Fight,
  done: () => boolean,
  input: () => FightInput = () => NO_INPUT,
  max = 600
) {
  for (let i = 0; i < max && !done(); i++) stepFight(f, input())
}

/** Freezes the enemy's own decisions (it still reacts to hits). */
const passive = (f: Fight) => {
  f.dummy = true
}

/** Walk in and swing whenever free; dodge when the enemy is about to land. */
function brawler(f: Fight): FightInput {
  const gap = f.enemy.x - f.hero.x
  const close = Math.abs(gap) <= f.hero.stats.reach
  const e = f.enemy
  const danger = e.state === 'attack' && !e.struck && e.t > windupOf(e) - 140
  if (danger) return press({ dodge: true })
  return press({ move: close ? 0 : Math.sign(gap), attack: close })
}

function play(f: Fight, pilot: (f: Fight) => FightInput, maxSteps = 60 * 70) {
  for (let i = 0; i < maxSteps && !f.winner; i++) stepFight(f, pilot(f))
  return f
}

describe('fights', () => {
  it('plays out the same for the same seed and inputs', () => {
    const a = play(fightVs('goblin', 2, 'same'), brawler)
    const b = play(fightVs('goblin', 2, 'same'), brawler)
    expect(a.log).toEqual(b.log)
    expect(a.winner).toBe(b.winner)
  })

  it('lands a hit at the end of the wind-up: damage, flinch, push back', () => {
    const f = fightVs()
    passive(f)
    f.enemy.x = f.hero.x + 40
    const before = f.enemy.x
    stepFight(f, press({ attack: true }))
    until(f, () => f.enemy.state === 'hurt')
    expect(f.enemy.hp).toBe(f.enemy.stats.maxHp - f.hero.stats.damage)
    expect(f.enemy.x).toBeGreaterThan(before)
  })

  it('lets you walk while swinging, but swing only on the ground', () => {
    const f = fightVs()
    passive(f)
    f.enemy.x = ARENA.right
    const x0 = f.hero.x
    stepFight(f, press({ attack: true, move: 1 }))
    for (let i = 0; i < 6; i++) stepFight(f, press({ move: 1 }))
    expect(f.hero.state).toBe('attack')
    expect(f.hero.x).toBeGreaterThan(x0)

    until(f, () => f.hero.state === 'idle')
    stepFight(f, press({ jump: true }))
    stepFight(f, press({ attack: true }))
    expect(f.hero.z).toBeGreaterThan(0)
    expect(f.hero.state).not.toBe('attack')
    until(f, () => f.hero.z === 0)
    stepFight(f, press({ attack: true }))
    expect(f.hero.state).toBe('attack')
  })

  it('lets enemies jump a swing they see coming', () => {
    let jumps = 0
    for (let i = 0; i < 20; i++) {
      const f = fightVs('goblin', 10, `j${i}`)
      f.enemy.dodgeReadyAt = 1e12 // no back-steps: jumping is the only way out
      f.enemy.attackReadyAt = 1e12
      f.enemy.x = f.hero.x + 40
      stepFight(f, press({ attack: true }))
      until(f, () => f.hero.struck)
      if (f.log.some((e) => e.kind === 'dodged' && e.how === 'jump')) jumps++
    }
    expect(jumps).toBeGreaterThan(0)
  })

  it('jumping clears a ground swing (and leaves the attacker open)', () => {
    const f = fightVs('ogre')
    f.enemy.x = f.hero.x + 50
    f.enemy.attackReadyAt = 0
    until(f, () => f.enemy.state === 'attack')
    // Jump so the hero is high when the swing lands
    until(f, () => windupOf(f.enemy) - f.enemy.t < 260)
    stepFight(f, press({ jump: true }))
    until(f, () => f.enemy.struck || f.enemy.state !== 'attack')
    expect(f.hero.hp).toBe(f.hero.stats.maxHp)
    expect(f.log.some((e) => e.kind === 'dodged' && e.how === 'jump')).toBe(
      true
    )
    expect(f.enemy.state).toBe('stagger')
  })

  it('a dodge avoids the swing and staggers the attacker', () => {
    const f = fightVs('ogre')
    f.enemy.x = f.hero.x + 50
    f.enemy.attackReadyAt = 0
    until(f, () => f.enemy.state === 'attack')
    until(f, () => windupOf(f.enemy) - f.enemy.t < 100)
    stepFight(f, press({ dodge: true }))
    until(f, () => f.enemy.struck || f.enemy.state !== 'attack')
    expect(f.hero.hp).toBe(f.hero.stats.maxHp)
    expect(f.enemy.state).toBe('stagger')
    expect(heroDodges(f)).toBe(1)
  })

  it('trades: a swing isn’t stopped by being hit, both land', () => {
    const f = fightVs('ogre')
    f.enemy.x = f.hero.x + 44
    f.enemy.attackReadyAt = 0
    until(f, () => f.enemy.state === 'attack')
    stepFight(f, press({ attack: true })) // the hero's quicker swing lands first
    until(
      f,
      () => f.enemy.struck,
      () => NO_INPUT,
      120
    )
    expect(f.enemy.hp).toBeLessThan(f.enemy.stats.maxHp)
    expect(f.hero.hp).toBeLessThan(f.hero.stats.maxHp)
    expect(f.log.filter((e) => e.kind === 'hit')).toHaveLength(2)
  })

  it('clashes when both swings land together: no damage, both rocked', () => {
    const f = fightVs()
    f.enemy.x = f.hero.x + 36
    f.enemy.attackReadyAt = 1e12
    // Start both swings so they finish within a step of each other
    f.enemy.stats = { ...f.enemy.stats, windupMs: f.hero.stats.windupMs }
    stepFight(f, press({ attack: true }))
    f.enemy.state = 'attack'
    f.enemy.t = f.hero.t
    f.enemy.struck = false
    until(
      f,
      () => f.log.length > 0,
      () => NO_INPUT,
      60
    )
    expect(f.log[0].kind).toBe('clash')
    expect(f.hero.hp).toBe(f.hero.stats.maxHp)
    expect(f.enemy.hp).toBe(f.enemy.stats.maxHp)
    expect(f.hero.state).toBe('stagger')
    expect(f.enemy.state).toBe('stagger')
  })

  it('can’t pin a fighter in the corner: after a flinch it gets a moment of armour', () => {
    const f = fightVs()
    passive(f)
    f.enemy.x = ARENA.right
    f.hero.x = ARENA.right - 40
    stepFight(f, press({ attack: true }))
    until(f, () => f.enemy.state === 'hurt')
    until(f, () => f.enemy.state === 'idle')
    const armouredUntil = f.enemy.armorUntil
    expect(armouredUntil).toBeGreaterThan(f.now)
    until(f, () => f.hero.state === 'idle')
    stepFight(f, press({ attack: true }))
    until(f, () => f.hero.struck)
    // Hit again inside the armour window: damage, but no flinch
    expect(f.now).toBeLessThan(armouredUntil + ARMOR_MS)
    expect(f.enemy.state).not.toBe('hurt')
  })

  it('knock-back against a wall pushes the attacker away instead', () => {
    const f = fightVs()
    passive(f)
    f.enemy.x = ARENA.right
    f.hero.x = ARENA.right - 40
    stepFight(f, press({ attack: true }))
    until(f, () => f.enemy.state === 'hurt')
    expect(f.enemy.x).toBe(ARENA.right)
    expect(f.hero.x).toBeLessThan(ARENA.right - 40)
  })

  it('gives Rogues a quicker, harder counter after a dodge', () => {
    for (const classId of ['rogue', 'warrior'] as const) {
      const f = fightVs('ogre', 1, 's1', classId)
      f.enemy.x = f.hero.x + 50
      f.enemy.attackReadyAt = 0
      until(f, () => f.enemy.state === 'attack')
      until(f, () => windupOf(f.enemy) - f.enemy.t < 100)
      stepFight(f, press({ dodge: true }))
      until(f, () => f.hero.state === 'idle')
      f.hero.x = f.enemy.x - 40
      stepFight(f, press({ attack: true }))
      if (classId === 'rogue') {
        expect(f.hero.countering).toBe(true)
        expect(windupOf(f.hero)).toBe(f.hero.stats.windupMs / 2)
        until(f, () => f.hero.struck)
        const hit = f.log.find((e) => e.kind === 'hit' && e.by === 'hero')!
        expect(hit.damage).toBeGreaterThan(f.hero.stats.damage)
      } else {
        expect(f.hero.countering).toBe(false)
      }
    }
  })

  it('after the K.O. the swing plays out and the loser falls', () => {
    const f = fightVs()
    passive(f)
    f.enemy.hp = 1
    f.enemy.x = f.hero.x + 40
    stepFight(f, press({ attack: true }))
    until(f, () => f.winner !== null)
    expect(f.winner).toBe('hero')
    const t0 = f.hero.t
    const ko0 = f.enemy.t
    for (let i = 0; i < 5; i++) stepFight(f, press({ attack: true, move: 1 }))
    expect(f.hero.t).toBeGreaterThan(t0) // still animating
    expect(f.enemy.state).toBe('ko')
    expect(f.enemy.t).toBeGreaterThan(ko0)
    expect(f.log.filter((e) => e.kind === 'hit')).toHaveLength(1) // nothing new
  })

  it('makes dodges wait for their cooldown', () => {
    const f = fightVs()
    stepFight(f, press({ dodge: true }))
    expect(f.hero.state).toBe('dodge')
    for (let i = 0; i < 25; i++) stepFight(f, NO_INPUT)
    stepFight(f, press({ dodge: true }))
    expect(f.hero.state).not.toBe('dodge')
  })

  it('reads the hero’s numbers from their stats', () => {
    const weak = heroFighter({ STR: 2, END: 2, AGI: 2, VIT: 2 })
    const strong = heroFighter({ STR: 20, END: 10, AGI: 15, VIT: 12 })
    expect(strong.maxHp).toBeGreaterThan(weak.maxHp)
    expect(strong.damage).toBeGreaterThan(weak.damage)
    expect(strong.speed).toBeGreaterThan(weak.speed)
    expect(strong.dodgeCooldownMs).toBeLessThan(weak.dodgeCooldownMs)
  })

  it('lets a fresh hero who fights back beat a level-1 goblin', () => {
    let wins = 0
    for (let i = 0; i < 10; i++)
      if (play(fightVs('goblin', 1, `g${i}`), brawler).winner === 'hero') wins++
    expect(wins).toBeGreaterThanOrEqual(7)
  })

  it('loses if the hero just stands there', () => {
    expect(play(fightVs('goblin', 1), () => NO_INPUT).winner).toBe('enemy')
  })

  it('maps camp-site enemies to a fighter kind', () => {
    expect(kindOf('Goblin')).toBe('goblin')
    expect(kindOf('Brute')).toBe('ogre')
    expect(kindOf('Forest Wolf')).toBe('lizard')
    expect(kindOf('Wisp')).toBe('goblin')
  })
})

describe('replays', () => {
  const setup = {
    hero: heroFighter(STATS),
    enemy: enemyFighter('lizard', 2),
    enemyLevel: 2,
  }

  it('finds a recording that ends the way the battle did, win or lose', () => {
    for (const heroWins of [true, false]) {
      const plan = replaySeed(setup, `exp1:${heroWins}`, heroWins)
      expect(plan).not.toBeNull()
      expect(simulate(setup, plan!).winner).toBe(heroWins ? 'hero' : 'enemy')
    }
  })

  it('plays a recording back identically', () => {
    const plan = replaySeed(setup, 'exp2', true)!
    expect(simulate(setup, plan).log).toEqual(simulate(setup, plan).log)
  })
})

describe('fighters keep their sides', () => {
  const inArena = (x: number) =>
    x >= ARENA.left - 1e-6 && x <= ARENA.right + 1e-6

  it('never pass each other or leave the arena, whatever the player mashes', () => {
    for (let n = 0; n < 40; n++) {
      const f = fightVs(n % 2 ? 'ogre' : 'goblin', 1 + (n % 6), `fuzz${n}`)
      const rand = seeded(`mash${n}`)
      for (let i = 0; i < 60 * 60 && !f.winner; i++) {
        const r = rand()
        stepFight(f, {
          move: rand() < 0.75 ? (rand() < 0.6 ? 1 : -1) : 0,
          jump: r < 0.08,
          attack: r > 0.85,
          dodge: r > 0.08 && r < 0.13,
        })
        // Apart, each on its own side (a corner blink swaps the sides)
        const gap = (f.enemy.x - f.hero.x) * (f.heroLeft ? 1 : -1)
        expect([n, i, gap >= ARENA.minGap - 0.01]).toEqual([n, i, true])
        expect(inArena(f.hero.x) && inArena(f.enemy.x)).toBe(true)
      }
    }
  })

  it('lands a jump at the enemy beside it, not behind it', () => {
    const f = fightVs()
    passive(f)
    f.enemy.x = f.hero.x + 40
    stepFight(f, press({ jump: true, move: 1 }))
    until(
      f,
      () => f.hero.z === 0 && f.hero.vz === 0,
      () => press({ move: 1 })
    )
    for (let i = 0; i < 30; i++) stepFight(f, press({ move: 1 }))
    expect(f.hero.x).toBeLessThan(f.enemy.x)
  })

  it('knocks the target away from the attacker even when facing is stale', () => {
    const f = fightVs()
    passive(f)
    f.enemy.x = f.hero.x + 30
    stepFight(f, press({ attack: true }))
    f.hero.facing = -1 // stale facing must not matter
    const before = f.enemy.x
    until(f, () => f.enemy.state === 'hurt')
    expect(f.enemy.x).toBeGreaterThan(before)
    expect(f.enemy.x - f.hero.x).toBeGreaterThanOrEqual(ARENA.minGap)
  })

  it('dodges away from the opponent', () => {
    const f = fightVs('goblin', 1, 's1', 'rogue')
    passive(f)
    f.enemy.x = f.hero.x + 40
    f.hero.facing = -1 // stale facing must not matter
    const x0 = f.hero.x
    stepFight(f, press({ dodge: true }))
    for (let i = 0; i < 8; i++) stepFight(f, NO_INPUT)
    expect(f.hero.x).toBeLessThan(x0)
  })
})

describe('class kits', () => {
  const kitFight = (classId: ClassId, stats = STATS) => {
    const f = newFight({
      hero: heroFighter(stats, classId),
      enemy: enemyFighter('goblin', 1),
      enemyLevel: 1,
      seed: `kit:${classId}`,
    })
    passive(f)
    return f
  }

  it('deals damage from each class’s own stat', () => {
    const low = { STR: 2, END: 2, AGI: 2, VIT: 2 }
    const up = (k: keyof typeof low) => ({ ...low, [k]: 30 })
    expect(heroFighter(up('STR'), 'warrior').damage).toBeGreaterThan(
      heroFighter(low, 'warrior').damage
    )
    expect(heroFighter(up('END'), 'mage').damage).toBeGreaterThan(
      heroFighter(low, 'mage').damage
    )
    expect(heroFighter(up('AGI'), 'archer').damage).toBeGreaterThan(
      heroFighter(low, 'archer').damage
    )
    // A mage's damage doesn't care about STR
    expect(heroFighter(up('STR'), 'mage').damage).toBe(
      heroFighter(low, 'mage').damage
    )
  })

  it('fires arrows that hit from range', () => {
    const f = kitFight('archer')
    f.enemy.x = f.hero.x + 140
    stepFight(f, press({ attack: true }))
    until(f, () => f.projectiles.length > 0)
    expect(f.projectiles[0].kind).toBe('arrow')
    const hp = f.enemy.hp
    until(f, () => f.enemy.hp < hp)
    expect(f.enemy.hp).toBeLessThan(hp)
    expect(f.projectiles).toHaveLength(0)
  })

  it('lets a jump clear an arrow', () => {
    const f = kitFight('archer')
    f.enemy.x = f.hero.x + 140
    stepFight(f, press({ attack: true }))
    until(f, () => f.projectiles.length > 0)
    const hp = f.enemy.hp
    until(f, () => Math.abs(f.projectiles[0].x - f.enemy.x) < 40)
    f.enemy.z = 40 // in the air as it arrives
    f.enemy.vz = 0.01
    until(
      f,
      () => f.projectiles.length === 0 || f.enemy.z === 0,
      () => NO_INPUT,
      30
    )
    expect(f.enemy.hp).toBe(hp)
    expect(f.log.some((e) => e.kind === 'dodged' && e.how === 'jump')).toBe(
      true
    )
  })

  it('casts mage bolts', () => {
    const f = kitFight('mage')
    f.enemy.x = f.hero.x + 110
    stepFight(f, press({ attack: true }))
    until(f, () => f.projectiles.length > 0)
    expect(f.projectiles[0].kind).toBe('bolt')
  })

  it('keeps every class close to the same win rate at its own level', () => {
    for (const c of [
      'warrior',
      'archer',
      'mage',
      'summoner',
      'rogue',
    ] as const) {
      const r =
        ENEMY_KINDS.reduce((s, k) => s + winRate(c, 6, k, 6, 8), 0) /
        ENEMY_KINDS.length
      expect([c, r >= 0.55 && r <= 1]).toEqual([c, true])
    }
  })
})

describe('the mage', () => {
  it('alternates spell casts and staff thrusts: bolt, fire, bolt, lightning', () => {
    const f = newFight({
      hero: heroFighter(STATS, 'mage'),
      enemy: enemyFighter('goblin', 1),
      enemyLevel: 1,
      seed: 'mage',
    })
    passive(f)
    f.enemy.x = f.hero.x + 120
    const kinds: string[] = []
    for (let n = 0; n < 4; n++) {
      stepFight(f, press({ attack: true }))
      expect(f.hero.thrusting).toBe(n % 2 === 1)
      const before = f.nextShot
      until(f, () => f.nextShot > before)
      kinds.push(f.projectiles[f.projectiles.length - 1].kind)
      until(f, () => f.hero.state !== 'attack')
    }
    expect(kinds).toEqual(['bolt', 'fire', 'bolt', 'lightning'])
  })
})

describe('corner blink', () => {
  const pinned = () => {
    const f = fightVs('goblin', 1, 'blink', 'rogue')
    f.hero.x = ARENA.left + 4
    f.enemy.x = f.hero.x + 34
    return f
  }

  it('a dodge in the corner teleports the hero behind the enemy', () => {
    const f = pinned()
    // The enemy swings; dodge as it's about to land
    until(
      f,
      () => f.enemy.state === 'attack',
      () => NO_INPUT,
      300
    )
    until(
      f,
      () => windupOf(f.enemy) - f.enemy.t < 120,
      () => NO_INPUT,
      120
    )
    stepFight(f, press({ dodge: true }))
    until(
      f,
      () => f.log.some((e) => e.kind === 'blink'),
      () => NO_INPUT,
      60
    )
    expect(f.log.some((e) => e.kind === 'blink' && e.by === 'hero')).toBe(true)
    expect(f.hero.x).toBeGreaterThan(f.enemy.x)
    expect(f.heroLeft).toBe(false)
    expect(f.hero.facing).toBe(-1)
  })

  it('no blink for a dodge out in the open', () => {
    const f = fightVs('goblin', 1, 'open', 'rogue')
    f.hero.x = 140
    f.enemy.x = 174
    until(
      f,
      () => f.enemy.state === 'attack',
      () => NO_INPUT,
      300
    )
    until(
      f,
      () => windupOf(f.enemy) - f.enemy.t < 120,
      () => NO_INPUT,
      120
    )
    stepFight(f, press({ dodge: true }))
    for (let i = 0; i < 30; i++) stepFight(f, NO_INPUT)
    expect(f.log.some((e) => e.kind === 'blink')).toBe(false)
    expect(f.heroLeft).toBe(true)
  })

  it('works for the enemy too: dodging in its corner puts it behind the hero', () => {
    const f = fightVs('goblin', 1, 'enemy-blink')
    f.enemy.x = ARENA.right - 4
    f.hero.x = f.enemy.x - 34
    f.enemy.dodgeReadyAt = 0
    stepFight(f, press({ attack: true }))
    // Make the enemy dodge right as the swing lands
    until(
      f,
      () => windupOf(f.hero) - f.hero.t < 60,
      () => NO_INPUT,
      60
    )
    f.enemy.state = 'dodge'
    f.enemy.t = 0
    until(
      f,
      () => f.hero.struck,
      () => NO_INPUT,
      30
    )
    expect(f.log.some((e) => e.kind === 'blink' && e.by === 'enemy')).toBe(true)
    expect(f.enemy.x).toBeLessThan(f.hero.x)
  })
})

describe('dodging shots', () => {
  const archerFight = (seed = 'shot') => {
    const f = newFight({
      hero: heroFighter(STATS, 'archer'),
      enemy: enemyFighter('goblin', 8),
      enemyLevel: 8,
      seed,
    })
    f.enemy.x = f.hero.x + 150
    return f
  }

  it('the enemy never dodges off the shooter’s wind-up', () => {
    for (let n = 0; n < 20; n++) {
      const f = archerFight(`windup${n}`)
      f.enemy.attackReadyAt = 1e9 // it only reacts, never swings
      stepFight(f, press({ attack: true }))
      // Through the whole wind-up, before anything is in the air
      while (f.hero.state === 'attack' && f.projectiles.length === 0) {
        stepFight(f, NO_INPUT)
        expect(f.enemy.state).not.toBe('dodge')
        expect(f.enemy.z).toBe(0)
      }
    }
  })

  it('a back-step timed to the arrow clears it', () => {
    const f = archerFight()
    passive(f)
    stepFight(f, press({ attack: true }))
    until(f, () => f.projectiles.length > 0)
    const hp = f.enemy.hp
    until(f, () => Math.abs(f.projectiles[0].x - f.enemy.x) < 20)
    f.enemy.state = 'dodge'
    f.enemy.t = 0
    until(
      f,
      () => f.projectiles.length === 0 || f.enemy.state !== 'dodge',
      () => NO_INPUT,
      20
    )
    expect(f.enemy.hp).toBe(hp)
    expect(f.log.some((e) => e.kind === 'dodged' && e.how === 'dodge')).toBe(
      true
    )
  })

  it('a back-step made too early (past its invincible moment) is hit', () => {
    const f = archerFight()
    passive(f)
    stepFight(f, press({ attack: true }))
    until(f, () => f.projectiles.length > 0)
    const hp = f.enemy.hp
    until(f, () => Math.abs(f.projectiles[0].x - f.enemy.x) < 20)
    f.enemy.state = 'dodge'
    f.enemy.t = f.enemy.stats.dodgeSafeMs + 1 // dodged long before it arrived
    until(
      f,
      () => f.enemy.hp < hp,
      () => NO_INPUT,
      20
    )
    expect(f.enemy.hp).toBeLessThan(hp)
  })
})

describe('the warrior’s shield', () => {
  const swingAt = (f: Fight) => {
    // The enemy swings; raise the shield as it's about to land
    until(
      f,
      () => f.enemy.state === 'attack',
      () => NO_INPUT,
      300
    )
    until(
      f,
      () => windupOf(f.enemy) - f.enemy.t < 120,
      () => NO_INPUT,
      120
    )
    stepFight(f, press({ dodge: true }))
  }

  it('blocks a swing, holds ground and shoves the attacker back', () => {
    const f = fightVs('goblin', 1, 'shield')
    f.enemy.x = f.hero.x + 34
    const hp = f.hero.hp
    const x0 = f.hero.x
    swingAt(f)
    until(
      f,
      () => f.enemy.struck,
      () => NO_INPUT,
      40
    )
    expect(f.hero.hp).toBe(hp)
    expect(f.log.some((e) => e.kind === 'dodged' && e.how === 'block')).toBe(
      true
    )
    expect(f.enemy.state).toBe('stagger')
    expect(f.hero.x).toBeCloseTo(x0, 0) // no back-step
    expect(f.enemy.x - f.hero.x).toBeGreaterThan(34)
  })

  it('never blinks: a block in the corner shoves instead', () => {
    const f = fightVs('goblin', 1, 'shield-corner')
    f.hero.x = ARENA.left + 4
    f.enemy.x = f.hero.x + 34
    swingAt(f)
    until(
      f,
      () => f.enemy.struck,
      () => NO_INPUT,
      40
    )
    expect(f.log.some((e) => e.kind === 'blink')).toBe(false)
    expect(f.heroLeft).toBe(true)
  })

  it('stops shots dead', () => {
    const f = newFight({
      hero: heroFighter(STATS, 'archer'),
      enemy: heroFighter(STATS, 'warrior'),
      enemyLevel: 1,
      seed: 'shield-shot',
    })
    passive(f)
    f.enemy.x = f.hero.x + 150
    stepFight(f, press({ attack: true }))
    until(f, () => f.projectiles.length > 0)
    until(f, () => Math.abs(f.projectiles[0].x - f.enemy.x) < 20)
    const hp = f.enemy.hp
    f.enemy.state = 'dodge'
    f.enemy.t = 0
    until(
      f,
      () => f.projectiles.length === 0,
      () => NO_INPUT,
      10
    )
    expect(f.enemy.hp).toBe(hp)
    expect(f.log.some((e) => e.kind === 'dodged' && e.how === 'block')).toBe(
      true
    )
  })
})

describe('the summoner', () => {
  const sumFight = (kind: 'goblin' | 'ogre' = 'goblin', seed = 'sum') => {
    const f = newFight({
      hero: heroFighter(STATS, 'summoner'),
      enemy: enemyFighter(kind, 3),
      enemyLevel: 3,
      seed,
    })
    f.enemy.x = f.hero.x + 120
    return f
  }
  /** Attacks once and waits for the attack to finish. */
  const attackOnce = (f: Fight) => {
    stepFight(f, press({ attack: true }))
    until(f, () => f.hero.state !== 'attack')
  }

  it('first summons a copy of the enemy (a spell cast)', () => {
    const f = sumFight('ogre')
    passive(f)
    stepFight(f, press({ attack: true }))
    expect(f.hero.summoning).toBe(true)
    expect(f.hero.thrusting).toBe(false)
    until(f, () => f.summon !== null)
    const s = f.summon!
    expect(s.side).toBe('hero')
    // Takes two hits; hits as hard as the summoner's power
    expect(s.stats.maxHp).toBe(2) // two hits, each hurting the summoner
    expect(s.stats.damage).toBe(f.hero.stats.damage)
    expect(s.stats.reach).toBe(f.enemy.stats.reach) // the enemy's own moves
    expect(f.log.some((e) => e.kind === 'summon')).toBe(true)
  })

  it('then fires weak water balls (a staff thrust) at half the summon’s damage', () => {
    const f = sumFight()
    passive(f)
    attackOnce(f)
    expect(f.summon).not.toBeNull()
    stepFight(f, press({ attack: true }))
    expect(f.hero.thrusting).toBe(true)
    expect(f.hero.summoning).toBe(false)
    until(f, () => f.projectiles.some((p) => p.kind === 'water'))
    const ball = f.projectiles.find((p) => p.kind === 'water')!
    expect(ball.damage).toBeCloseTo(f.summon!.stats.damage * 0.5)
  })

  it('keeps one summon at a time', () => {
    const f = sumFight()
    passive(f)
    attackOnce(f)
    const first = f.summon
    attackOnce(f)
    attackOnce(f)
    expect(f.summon).toBe(first)
    expect(f.log.filter((e) => e.kind === 'summon')).toHaveLength(1)
  })

  it('the summon fights the enemy, and the enemy turns on it when it’s closer', () => {
    const f = sumFight('goblin', 'sum-fight')
    f.enemy.attackReadyAt = 1e9
    attackOnce(f)
    const hp = f.enemy.hp
    until(
      f,
      () => f.enemy.hp < hp,
      () => NO_INPUT,
      60 * 6
    )
    expect(f.enemy.hp).toBeLessThan(hp)
    f.enemy.attackReadyAt = 0
    expect(enemyTarget(f)).toBe(f.summon)
  })

  it('summons again once the summon has fallen and the cooldown is up', () => {
    const f = sumFight('ogre', 'sum-again')
    passive(f)
    attackOnce(f)
    f.summon!.hp = 0
    f.summon!.state = 'ko'
    f.summon!.t = 0
    until(
      f,
      () => f.summon === null,
      () => NO_INPUT,
      120
    )
    // Too soon: a water ball instead
    attackOnce(f)
    expect(f.summon).toBeNull()
    until(
      f,
      () => f.now >= f.hero.summonReadyAt,
      () => NO_INPUT,
      60 * 12
    )
    stepFight(f, press({ attack: true }))
    expect(f.hero.summoning).toBe(true)
    until(f, () => f.summon !== null)
    expect(f.summon!.state).not.toBe('ko')
  })
})

describe('rogue and summon tuning', () => {
  it('the rogue slashes, and thrusts only for a counter (×1.3)', () => {
    expect(COUNTER_DAMAGE).toBe(1.3)
    const f = fightVs('goblin', 1, 'rogue-slash', 'rogue')
    passive(f)
    f.enemy.x = f.hero.x + 34
    stepFight(f, press({ attack: true }))
    expect(f.hero.thrusting).toBe(false) // a plain slash
    until(f, () => f.hero.state !== 'attack')
    f.hero.counterUntil = f.now + 500 // a counter is ready (after a dodge)
    stepFight(f, press({ attack: true }))
    expect(f.hero.countering).toBe(true)
    expect(f.hero.thrusting).toBe(true)
  })

  it('a hit on the summon hurts the summoner; the second hit ends it', () => {
    const f = newFight({
      hero: heroFighter(STATS, 'summoner'),
      enemy: enemyFighter('goblin', 2),
      enemyLevel: 2,
      seed: 'summon-hits',
    })
    passive(f)
    f.enemy.x = f.hero.x + 120
    stepFight(f, press({ attack: true }))
    until(f, () => f.summon !== null)
    const s = f.summon!
    expect(s.hp).toBe(SUMMON_HITS)
    const heroHp = f.hero.hp
    // The enemy swings at the summon twice
    f.dummy = false
    f.enemy.attackReadyAt = 0
    until(
      f,
      () => s.hp < SUMMON_HITS,
      () => NO_INPUT,
      60 * 6
    )
    expect(s.hp).toBe(SUMMON_HITS - 1)
    expect(f.hero.hp).toBeLessThan(heroHp)
    expect(f.log.some((e) => e.kind === 'hit' && e.onSummon)).toBe(true)
    until(
      f,
      () => s.state === 'ko',
      () => NO_INPUT,
      60 * 8
    )
    expect(s.hp).toBe(0)
  })
})

describe('the warrior’s shield shove', () => {
  it('shoves an enemy that isn’t attacking out of its attack range', () => {
    const f = fightVs('goblin', 2, 'shove-idle')
    passive(f)
    f.enemy.x = f.hero.x + 34
    stepFight(f, press({ dodge: true }))
    until(
      f,
      () => f.log.some((e) => e.kind === 'shove'),
      () => NO_INPUT,
      20
    )
    expect(f.log.some((e) => e.kind === 'shove')).toBe(true)
    expect(f.enemy.x - f.hero.x).toBeGreaterThan(f.enemy.stats.reach)
  })

  it('a badly timed block still shoves, and the swing misses', () => {
    const f = fightVs('ogre', 2, 'shove-early')
    f.enemy.x = f.hero.x + 40
    until(
      f,
      () => f.enemy.state === 'attack',
      () => NO_INPUT,
      300
    )
    // Block right at the start of a long wind-up: far too early to catch it
    stepFight(f, press({ dodge: true }))
    const hp = f.hero.hp
    until(
      f,
      () => f.enemy.struck,
      () => NO_INPUT,
      90
    )
    expect(f.log.some((e) => e.kind === 'shove')).toBe(true)
    expect(f.hero.hp).toBe(hp)
    expect(f.log.some((e) => e.kind === 'whiff' && e.by === 'enemy')).toBe(true)
  })

  it('shoves only once per block, and not from across the arena', () => {
    const f = fightVs('goblin', 2, 'shove-far')
    passive(f)
    f.enemy.x = f.hero.x + 150
    const x = f.enemy.x
    stepFight(f, press({ dodge: true }))
    for (let i = 0; i < 30; i++) stepFight(f, NO_INPUT)
    expect(f.enemy.x).toBe(x)
    expect(f.log.filter((e) => e.kind === 'shove')).toHaveLength(0)
  })
})
