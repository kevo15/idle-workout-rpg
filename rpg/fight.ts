// Hand-played fights: a side-view, Street Fighter-style duel between the hero
// and one enemy. Pure and deterministic: the same seed and the same inputs
// on the same steps always play out the same (so a fight can be recorded
// and watched back later).
//
// The screen calls stepFight 60 times a second with the player's input: the
// stick (left/right to move, up to jump) and the ATTACK and DODGE presses.
// The enemy decides with enemyInput (seeded). Distances are in arena pixels
// (ARENA), heights (z) in pixels above the floor, times in milliseconds.
//
// Moves and rules:
//   MOVE:   walk with the stick, also mid-swing (at half speed) and in the air.
//   JUMP:   push the stick up. A ground swing can't reach a fighter high in
//           the air. Swings start only on the ground. Enemies jump swings
//           too.
//   ATTACK: a wind-up (the other side can see it coming), then the hit lands
//           if the target is in reach. A fighter mid-swing isn't interrupted
//           by being hit: both blows land (a trade). Two swings landing
//           within CLASH_MS of each other CLASH instead: sparks, both are
//           knocked back and staggered, no damage.
//   HIT:    damage, and a flinch with knock-back, except while swinging or
//           just after recovering from a flinch (ARMOR_MS), so nobody can be
//           pinned in a corner and hit forever. Knock-back into a wall pushes
//           the attacker away instead.
//   DODGE:  a quick back-step with a moment of invincibility, then a
//           cooldown. Against a shot it has to be timed to the shot's
//           arrival (inside that moment), not to the shooter's wind-up. Dodging a swing staggers the attacker (STAGGER_MS), so
//           they can't just walk back in and swing again.
//   COUNTER (Rogue): a successful dodge readies a counter: the next swing
//           within COUNTER_WINDOW_MS winds up twice as fast and hits harder.
//   CLASSES: each class has a kit (KITS): the stat behind its damage and
//           how it attacks. Warrior and Rogue swing (melee). Archer and
//           Mage shoot: the attack's wind-up ends by firing an arrow or a
//           bolt (a projectile) that flies until it hits or runs out of
//           range; jumping or dodging it avoids it. The
//           Mage alternates: a spell cast (a purple bolt), then a staff
//           thrust (a fireball), a cast, a thrust (a lightning bolt), ...
//   SUMMON (Summoner): with no summon out, ATTACK is a spell cast that
//           calls up a copy of the enemy it's fighting, on the hero's side,
//           hitting as hard as the Summoner's power. It takes SUMMON_HITS
//           hits and falls; each hit's damage goes to the Summoner. It walks in and fights; the enemy fights whichever of
//           the two is closer. While it stands, ATTACK is a staff thrust
//           firing a water ball (half the summon's damage). One summon at
//           a time; when it falls, the next ATTACK after a short
//           cooldown (SUMMON_COOLDOWN_MS) summons again.
//   BLOCK (Warrior): the DODGE button is a shield thrust instead of a
//           back-step. The Warrior holds ground; a swing or a shot that
//           lands while the shield is up is blocked, and a blocked swing
//           shoves the attacker back and staggers them. Every block
//           shoves, even a badly timed one or with no attack coming: the
//           enemy is pushed just out of its own attack range. No corner blink
//           (the shield thrust is how a Warrior gets out of a corner).
//   BLINK:  a successful back-step dodge while pinned in a corner teleports
//           the dodger behind the attacker (hero and enemy alike). The
//           fighters then swap sides.
//   K.O.:   the winner's swing plays out and the loser falls (the hurt
//           sheet's fall); the clock keeps running for the animation, but
//           nothing else happens.

import { seeded } from './rng'
import type { ClassId, StatKey } from './types'

export const STEP_MS = 1000 / 60

export const ARENA = {
  width: 300,
  /** How far fighters can walk from either edge. */
  left: 20,
  right: 280,
  /** Fighters never get closer than this (their bodies). */
  minGap: 26,
}

/** Swings resolving this close together clash. */
export const CLASH_MS = 90
/** How long a dodged attacker is left open. */
export const STAGGER_MS = 650
/** How long both are rocked back by a clash. */
export const CLASH_STAGGER_MS = 320
/** After a flinch, this long without flinching again. */
export const ARMOR_MS = 500
export const COUNTER_WINDOW_MS = 900
export const COUNTER_DAMAGE = 1.3
/** Jump: upward speed (px/step) and gravity (px/step²). */
export const JUMP_SPEED = 5.4
export const GRAVITY = 0.34
/** A ground swing misses a fighter this high in the air. */
export const JUMP_CLEAR = 18
/** The K.O. animation's length (the fall). */
export const KO_FALL_MS = 900

export interface FighterStats {
  maxHp: number
  /** Damage per landed hit. */
  damage: number
  /** Share of incoming damage ignored (0..0.5). */
  armor: number
  /** Arena pixels per step at full stick. */
  speed: number
  /** Hit reach from the attacker's centre. */
  reach: number
  windupMs: number
  recoverMs: number
  dodgeMs: number
  /** Invincible for this long at the start of a dodge. */
  dodgeSafeMs: number
  dodgeCooldownMs: number
  /** Flinch after being hit. */
  hurtMs: number
  /** A successful dodge readies a counter (Rogue). */
  counter: boolean
  /**
   * A ranged attack: the wind-up fires a projectile (Archer, Mage) instead
   * of a swing. `reach` is then the distance the fighter likes to shoot from.
   */
  shot?: { kind: 'arrow' | 'bolt' | 'water'; speed: number; range: number }
  /**
   * Mage: every other attack is a staff thrust that fires a fireball, then
   * a lightning bolt, in turn (the casts between fire `shot`).
   */
  thrustShots?: boolean
  /** DODGE is a shield thrust that blocks instead of a back-step (Warrior). */
  block?: boolean
  /** Knock-back multiplier on this fighter's hits (Warrior: heavier). */
  knock?: number
  /**
   * Summoner: ATTACK summons a copy of the enemy when none is out (its hits
   * do `damage`); with one out, it fires water balls (`shot`, half damage).
   */
  summons?: boolean
}

/** Something flying across the arena: an arrow, a bolt, a fireball, ... */
export interface Projectile {
  id: number
  kind: 'arrow' | 'bolt' | 'fire' | 'lightning' | 'water'
  by: 'hero' | 'enemy'
  x: number
  /** Flying height above the floor (for drawing; it hits a grounded target). */
  z: number
  /** Arena pixels per step (signed). */
  vx: number
  damage: number
  /** Distance left before it fades. */
  left: number
  /** A Rogue counter shot (unused) or a counter-boosted bolt. */
  countering: boolean
}

export type FighterState =
  'idle' | 'walk' | 'attack' | 'dodge' | 'hurt' | 'stagger' | 'ko'

export interface Fighter {
  side: 'hero' | 'enemy'
  x: number
  /** Height above the floor (jumping). */
  z: number
  vz: number
  /** 1 = facing right, -1 = facing left. */
  facing: 1 | -1
  hp: number
  state: FighterState
  /** Milliseconds spent in the current state. */
  t: number
  /** The current swing has been resolved. */
  struck: boolean
  /** Length of the current stagger. */
  staggerMs: number
  /** Fight clock time the next dodge is allowed. */
  dodgeReadyAt: number
  /** Fight clock time the next attack is allowed (enemy pacing). */
  attackReadyAt: number
  /** Won't flinch until then (just recovered). */
  armorUntil: number
  /** A counter is ready until then (Rogue, after a dodge). */
  counterUntil: number
  /** The current swing is a counter. */
  countering: boolean
  /** The current attack calls up a summon (Summoner). */
  summoning: boolean
  /** Fight clock time a new summon may be called (after one falls). */
  summonReadyAt: number
  /** Attacks started so far (the Mage alternates by it). */
  attacks: number
  /** The current attack is a staff thrust (Mage). */
  thrusting: boolean
  stats: FighterStats
}

export interface FightEvent {
  at: number
  kind:
    | 'hit'
    | 'dodged'
    | 'whiff'
    | 'clash'
    | 'counter'
    | 'ko'
    | 'shot'
    | 'blink'
    | 'summon'
    | 'shove'
  /** Whose swing it was (for 'counter': who readied it). */
  by: 'hero' | 'enemy'
  damage?: number
  /** The hit (or K.O.) landed on the summon, not the hero. */
  onSummon?: boolean
  /** For 'dodged': a back-step or a jump. */
  how?: 'dodge' | 'jump' | 'block'
  /** For 'hit': a counter (the Rogue's thrust after a dodge). */
  counter?: boolean
}

export interface Fight {
  now: number
  hero: Fighter
  enemy: Fighter
  /** Seeded randomness for the enemy (and nothing else). */
  rand: () => number
  enemyLevel: number
  /** Who won, once it's over (on time: the one with more health left). */
  winner: 'hero' | 'enemy' | null
  /** Fight clock time it was decided. */
  endedAt: number | null
  timeLimitMs: number
  log: FightEvent[]
  /** AI memory: what it's doing until when. */
  ai: { plan: 'approach' | 'hold' | 'back'; until: number }
  /**
   * The hero is on the left. Fighters never walk or jump past each other;
   * only a corner blink swaps them (then this flips).
   */
  heroLeft: boolean
  /** In flight right now. */
  projectiles: Projectile[]
  /** The Summoner's summon, while it's out (side 'hero', fights the enemy). */
  summon: Fighter | null
  /** The next projectile's id. */
  nextShot: number
  /** A training dummy: the enemy never acts (it still takes hits). */
  dummy?: boolean
  /**
   * Training (the combat tutorial): the enemy walks in and swings slowly,
   * never dodging, jumping or backing off.
   */
  calm?: boolean
  /** Training: these fighters never drop below 1 health. */
  guard?: { hero?: boolean; enemy?: boolean }
}

export interface FightInput {
  /** -1..1 left/right from the stick. */
  move: number
  /** Pressed this step (the stick pushed up, for jump). */
  jump: boolean
  attack: boolean
  dodge: boolean
}

export const NO_INPUT: FightInput = {
  move: 0,
  jump: false,
  attack: false,
  dodge: false,
}

// ---- fighters -------------------------------------------------------------

/**
 * Each class's kit: the stat its damage comes from (`power`), how it
 * attacks and its multipliers. The damage multipliers are tuned (npm run
 * balance) so every class wins about 75% of autopilot fights at
 * EXPEDITION_SKILL (a hero who dodges and swings readily, like a player)
 * against enemies of its own level: shooters hit lighter
 * because keeping their distance keeps them safe.
 */
export interface ClassKit {
  power: StatKey
  /** Damage multiplier on 6 + power × 0.9. */
  damage: number
  reach: number
  windupMs: number
  recoverMs: number
  /** Armor from END is capped here (END-powered classes aren't also tanks). */
  armorCap: number
  armorBonus: number
  shot?: FighterStats['shot']
  thrustShots?: boolean
  block?: boolean
  knock?: number
  counter?: boolean
  summons?: boolean
}

export const KITS: Record<ClassId, ClassKit> = {
  // A heavy katana swing: hits hard, knocks back, a little extra armor
  warrior: {
    power: 'STR',
    damage: 1.1,
    reach: 46,
    windupMs: 260,
    recoverMs: 240,
    armorCap: 0.3,
    armorBonus: 0.05,
    knock: 1.3,
    block: true,
  },
  // Quick dagger thrusts, and a counter after a dodge
  rogue: {
    power: 'AGI',
    damage: 1,
    reach: 40,
    windupMs: 190,
    recoverMs: 200,
    armorCap: 0.2,
    armorBonus: 0,
    counter: true,
  },
  // Arrows from range: fast and far, light per hit
  archer: {
    power: 'AGI',
    damage: 0.62,
    reach: 170,
    windupMs: 330,
    recoverMs: 260,
    armorCap: 0.2,
    armorBonus: 0,
    shot: { kind: 'arrow', speed: 7, range: 230 },
  },
  // A slower spell bolt from range (light per hit: range keeps it safe)
  mage: {
    power: 'END',
    damage: 0.6,
    reach: 130,
    windupMs: 420,
    recoverMs: 300,
    armorCap: 0.12,
    armorBonus: 0,
    shot: { kind: 'bolt', speed: 4.5, range: 170 },
    thrustShots: true,
  },
  // Summons a copy of the enemy to fight for it, then water balls from the
  // staff while it stands (`damage` sets the summon's hits)
  summoner: {
    power: 'END',
    damage: 1.07,
    reach: 130,
    windupMs: 340,
    recoverMs: 280,
    armorCap: 0.12,
    armorBonus: 0,
    shot: { kind: 'water', speed: 5, range: 170 },
    summons: true,
  },
}

/**
 * The hero's numbers from their stats and class kit: damage from the kit's
 * `power` stat, VIT and END for health and toughness, AGI for speed, wind-up
 * and dodge cooldown.
 */
export function heroFighter(
  stats: Record<StatKey, number>,
  classId: ClassId = 'warrior'
): FighterStats {
  const { END, AGI, VIT } = stats
  const kit = KITS[classId] ?? KITS.warrior
  const base = 6 + stats[kit.power] * 0.9
  const quick = AGI * 4
  return {
    maxHp: Math.round(80 + VIT * 5 + END * 2),
    damage: Math.max(1, Math.round(base * kit.damage)),
    armor: Math.min(kit.armorCap, END * 0.008) + kit.armorBonus,
    speed: 1.4 + Math.min(1, AGI * 0.025),
    reach: kit.reach,
    windupMs: Math.max(kit.windupMs * 0.55, kit.windupMs - quick),
    recoverMs: kit.recoverMs,
    dodgeMs: 300,
    dodgeSafeMs: 260,
    dodgeCooldownMs: Math.max(450, 1100 - AGI * 18),
    hurtMs: 280,
    counter: !!kit.counter,
    shot: kit.shot,
    thrustShots: kit.thrustShots,
    block: kit.block,
    knock: kit.knock,
    summons: kit.summons,
  }
}

export type EnemyKind = 'goblin' | 'lizard' | 'oni' | 'ogre'

/** Each kind's level-1 numbers. */
const ENEMY_BASE: Record<EnemyKind, FighterStats> = {
  // Quick little stabs: weak, fast, short reach
  goblin: {
    maxHp: 48,
    damage: 6,
    armor: 0,
    speed: 1.7,
    reach: 40,
    windupMs: 380,
    recoverMs: 300,
    dodgeMs: 280,
    dodgeSafeMs: 220,
    dodgeCooldownMs: 1400,
    hurtMs: 300,
    counter: false,
  },
  lizard: {
    maxHp: 62,
    damage: 8,
    armor: 0.05,
    speed: 1.4,
    reach: 48,
    windupMs: 440,
    recoverMs: 340,
    dodgeMs: 300,
    dodgeSafeMs: 220,
    dodgeCooldownMs: 1800,
    hurtMs: 300,
    counter: false,
  },
  // Heavy hitters: slow swings you can see coming
  oni: {
    maxHp: 78,
    damage: 11,
    armor: 0.1,
    speed: 1.1,
    reach: 58,
    windupMs: 560,
    recoverMs: 420,
    dodgeMs: 320,
    dodgeSafeMs: 200,
    dodgeCooldownMs: 2600,
    hurtMs: 260,
    counter: false,
  },
  ogre: {
    maxHp: 110,
    damage: 14,
    armor: 0.15,
    speed: 1.0,
    reach: 64,
    windupMs: 620,
    recoverMs: 480,
    dodgeMs: 320,
    dodgeSafeMs: 200,
    dodgeCooldownMs: 3200,
    hurtMs: 220,
    counter: false,
  },
}

/** An enemy's numbers at `level`: tougher and harder-hitting as it rises. */
/**
 * Enemy toughness grows with the stat points a hero has trained by that
 * level (rpg/progress.ts pointsForLevel: 2(L − 1)(L + 4)), so a fight at the
 * hero's own level stays a fight as stats pile up.
 */
export const ENEMY_HP_PER_POINT = 3.2
export const ENEMY_DAMAGE_PER_POINT = 0.2
/**
 * Overall toughness: enough health that a same-level enemy takes several
 * hits (about 7–9 basic ones), and hits to match.
 */
export const ENEMY_SCALE = { hp: 1.3, damage: 1.76 }

export function enemyFighter(kind: EnemyKind, level: number): FighterStats {
  const b = ENEMY_BASE[kind]
  const l = Math.max(1, level) - 1
  const points = 2 * l * (l + 5)
  return {
    ...b,
    maxHp: Math.round(
      ENEMY_SCALE.hp *
        (b.maxHp * (1 + 0.18 * l) +
          (b.maxHp / 70) * ENEMY_HP_PER_POINT * points)
    ),
    damage: Math.round(
      ENEMY_SCALE.damage *
        (b.damage * (1 + 0.12 * l) +
          (b.damage / 10) * ENEMY_DAMAGE_PER_POINT * points)
    ),
    // Better fighters telegraph a little less
    windupMs: Math.max(260, b.windupMs - l * 10),
  }
}

/** Which kind an enemy name from the camp sites fights as (art and moves). */
export function kindOf(enemyName: string): EnemyKind {
  const n = enemyName.toLowerCase()
  if (/ogre|brute|golem|guardian|king|wyrm|knight/.test(n)) return 'ogre'
  if (/oni|gargoyle|ghoul|wraith/.test(n)) return 'oni'
  if (/lizard|wolf|hound|skeleton/.test(n)) return 'lizard'
  return 'goblin'
}

function fighter(
  side: Fighter['side'],
  x: number,
  stats: FighterStats
): Fighter {
  return {
    side,
    x,
    z: 0,
    vz: 0,
    facing: side === 'hero' ? 1 : -1,
    hp: stats.maxHp,
    state: 'idle',
    t: 0,
    struck: false,
    staggerMs: 0,
    dodgeReadyAt: 0,
    attackReadyAt: 900, // a beat before the enemy's first swing
    armorUntil: 0,
    counterUntil: 0,
    countering: false,
    summoning: false,
    summonReadyAt: 0,
    attacks: 0,
    thrusting: false,
    stats,
  }
}

export function newFight({
  hero,
  enemy,
  enemyLevel,
  seed,
  timeLimitMs = 60000,
}: {
  hero: FighterStats
  enemy: FighterStats
  enemyLevel: number
  seed: string
  timeLimitMs?: number
}): Fight {
  return {
    now: 0,
    hero: fighter('hero', 95, hero),
    enemy: fighter('enemy', 205, enemy),
    rand: seeded(seed),
    enemyLevel,
    winner: null,
    endedAt: null,
    timeLimitMs,
    log: [],
    ai: { plan: 'approach', until: 0 },
    heroLeft: true,
    projectiles: [],
    nextShot: 1,
    summon: null,
  }
}

// ---- rules ----------------------------------------------------------------

/** States that ignore new input. */
const locked = (f: Fighter) =>
  f.state === 'dodge' ||
  f.state === 'hurt' ||
  f.state === 'stagger' ||
  f.state === 'ko'

const grounded = (f: Fighter) => f.z === 0 && f.vz === 0

/** The current swing's wind-up (counters are twice as quick). */
export const windupOf = (f: Fighter) =>
  f.countering ? f.stats.windupMs / 2 : f.stats.windupMs

function setState(f: Fighter, state: FighterState, staggerMs = 0) {
  f.state = state
  f.t = 0
  f.struck = false
  f.staggerMs = staggerMs
  if (state !== 'attack') f.countering = false
}

/** Starts a jump, swing or dodge, or walks, if the fighter is free to. */
function act(f: Fighter, input: FightInput, now: number, fight?: Fight) {
  if (locked(f)) return
  if (input.jump && grounded(f) && f.state !== 'attack') f.vz = JUMP_SPEED
  if (f.state === 'attack') return // finish the swing (moving is allowed)
  if (input.dodge && grounded(f) && now >= f.dodgeReadyAt) {
    setState(f, 'dodge')
    f.dodgeReadyAt = now + f.stats.dodgeCooldownMs
    return
  }
  if (input.attack && grounded(f)) {
    setState(f, 'attack')
    // A new summon only once the last is gone (fallen and faded) and the
    // cooldown has passed
    f.summoning =
      !!f.stats.summons && !!fight && !fight.summon && now >= f.summonReadyAt
    f.thrusting =
      (!!f.stats.thrustShots && f.attacks % 2 === 1) ||
      (!!f.stats.summons && !f.summoning)
    f.attacks++
    if (now < f.counterUntil) {
      f.countering = true
      f.counterUntil = 0
      // The Rogue's counter is the dagger thrust (its swings are slashes)
      if (f.stats.counter) f.thrusting = true
    }
    return
  }
  if (input.move !== 0) {
    if (f.state !== 'walk') setState(f, 'walk')
  } else if (f.state !== 'idle') setState(f, 'idle')
}

const clampX = (x: number) => Math.max(ARENA.left, Math.min(ARENA.right, x))

/**
 * -1 or 1: the way from `o` to `f`'s side, i.e. away from the opponent.
 * From their positions, not facing (facing is frozen mid-move); exact ties
 * use which side each started on.
 */
function awayFrom(f: Fighter, o: Fighter, heroLeft: boolean): 1 | -1 {
  if (f.x !== o.x) return f.x < o.x ? -1 : 1
  const left = f.side === 'hero' ? heroLeft : !heroLeft
  return left ? -1 : 1
}

function move(f: Fighter, input: FightInput, o: Fighter, heroLeft: boolean) {
  // Walking: full speed, half while swinging; steering in the air too
  if (f.state === 'walk' || f.state === 'attack' || !grounded(f)) {
    if (f.state !== 'ko' && f.state !== 'hurt' && f.state !== 'stagger') {
      const k = f.state === 'attack' ? 0.5 : 1
      f.x += input.move * f.stats.speed * k
    }
  }
  if (f.state === 'dodge' && !f.stats.block) {
    // Back-step away from the opponent, fast at first then easing
    const k = 1 - f.t / f.stats.dodgeMs
    f.x += awayFrom(f, o, heroLeft) * 3.2 * Math.max(0.2, k)
  }
  if (!grounded(f)) {
    f.z += f.vz
    f.vz -= GRAVITY
    if (f.z <= 0) {
      f.z = 0
      f.vz = 0
    }
  }
  f.x = clampX(f.x)
}

/** Pushes `d` away from `a`; against a wall, `a` is pushed back instead. */
function knockBack(fight: Fight, a: Fighter, d: Fighter, amount: number) {
  const want = d.x + awayFrom(d, a, fight.heroLeft) * amount
  d.x = clampX(want)
  const blocked = Math.abs(want - d.x)
  if (blocked > 0) a.x = clampX(a.x + awayFrom(a, d, fight.heroLeft) * blocked)
}

function log(fight: Fight, e: Omit<FightEvent, 'at'>) {
  fight.log.push({ at: fight.now, ...e })
}

/** A swing was avoided: the attacker is left open; a Rogue readies a counter. */
function avoided(fight: Fight, a: Fighter, d: Fighter, how: 'dodge' | 'jump') {
  if (how === 'dodge' && d.stats.block) {
    // The shield thrust: blocked, and the attacker is shoved back and rocked
    log(fight, { kind: 'dodged', by: a.side, how: 'block' })
    setState(a, 'stagger', STAGGER_MS)
    shove(fight, d, a)
    return
  }
  log(fight, { kind: 'dodged', by: a.side, how })
  setState(a, 'stagger', STAGGER_MS)
  if (d.stats.counter) {
    d.counterUntil = fight.now + COUNTER_WINDOW_MS
    log(fight, { kind: 'counter', by: d.side })
  }
  if (how === 'dodge' && a !== fight.summon) blink(fight, d, a)
}

/** The shield shove lands this far into a block (the shield's push-out). */
export const SHOVE_AT_MS = 90
/** The shield reaches this far (from the Warrior's centre). */
export const SHIELD_REACH = 70

/**
 * The Warrior's shield shove: pushes `o` back until it's just out of its
 * own attack range (at least a short shove). Once per block.
 */
function shove(fight: Fight, f: Fighter, o: Fighter) {
  if (f.struck) return
  f.struck = true
  const dist = Math.abs(o.x - f.x)
  if (dist > SHIELD_REACH) return
  const want = Math.max(dist + 18, o.stats.reach + 14)
  knockBack(fight, f, o, want - dist)
  log(fight, { kind: 'shove', by: f.side })
}

/**
 * Every block shoves, timed well or not: the shield pushes out a moment in
 * and shoves whatever is in front of it (a block that catches a swing has
 * already shoved, and staggered, the attacker).
 */
function shieldShove(fight: Fight, f: Fighter, o: Fighter) {
  if (!f.stats.block || f.state !== 'dodge' || f.struck) return
  if (f.t < SHOVE_AT_MS || o.state === 'ko') return
  shove(fight, f, o)
}

/** Pinned: this close to the wall it's backing into. */
export const CORNER = 32

/** `f` has its back to a wall, with `o` in front of it. */
export function cornered(f: Fighter, o: Fighter) {
  return o.x > f.x
    ? f.x - ARENA.left < CORNER
    : o.x < f.x
      ? ARENA.right - f.x < CORNER
      : false
}

/**
 * A dodge in the corner: `f` teleports to just behind `o`, if there's room
 * there, and the two swap sides (facing each other again).
 */
function blink(fight: Fight, f: Fighter, o: Fighter) {
  if (!cornered(f, o)) return
  const dir = o.x > f.x ? 1 : -1
  const to = clampX(o.x + dir * (ARENA.minGap + 12))
  if (Math.abs(to - o.x) < ARENA.minGap) return // no room behind it
  f.x = to
  f.z = 0
  f.vz = 0
  f.facing = dir === 1 ? -1 : 1
  if (o.state === 'idle' || o.state === 'walk') o.facing = dir === 1 ? 1 : -1
  fight.heroLeft = !fight.heroLeft
  log(fight, { kind: 'blink', by: f.side })
}

/** Launches a projectile from `a` toward `d`. */
function launch(
  fight: Fight,
  a: Fighter,
  d: Fighter,
  kind: Projectile['kind'],
  speed: number,
  range: number,
  damage: number,
  z: number
) {
  const dir = -awayFrom(a, d, fight.heroLeft)
  fight.projectiles.push({
    id: fight.nextShot++,
    kind,
    by: a.side,
    x: a.x + dir * 14,
    z,
    vx: dir * speed,
    damage,
    left: range,
    countering: false,
  })
  log(fight, { kind: 'shot', by: a.side })
}

/** Resolves `a`'s swing at the end of its wind-up. */
function strike(fight: Fight, a: Fighter, d: Fighter) {
  if (a.state !== 'attack' || a.struck || a.t < windupOf(a)) return
  a.struck = true
  if (d.state === 'ko') return
  // A ranged attack: the wind-up ends by firing
  if (a.summoning) {
    callSummon(fight, a, d)
    return
  }
  if (a.stats.shot) {
    const mult = a.countering ? COUNTER_DAMAGE : 1
    if (a.stats.summons) {
      // Water balls from the staff: half the summon's hits
      launch(
        fight,
        a,
        d,
        'water',
        a.stats.shot.speed,
        a.stats.shot.range,
        a.stats.damage * 0.5 * mult,
        26
      )
      return
    }
    if (a.thrusting) {
      // Staff thrusts: a fireball (slower, harder) then a lightning bolt
      // (fast, lighter), in turn; about a bolt's worth on average
      const fire = a.attacks % 4 === 2
      launch(
        fight,
        a,
        d,
        fire ? 'fire' : 'lightning',
        fire ? 4 : 8.5,
        a.stats.shot.range,
        a.stats.damage * mult * (fire ? 1.15 : 0.85),
        26
      )
      return
    }
    launch(
      fight,
      a,
      d,
      a.stats.shot.kind,
      a.stats.shot.speed,
      a.stats.shot.range,
      a.stats.damage * mult,
      22
    )
    return
  }
  const dist = Math.abs(d.x - a.x)
  const inReach = dist <= a.stats.reach + 10

  // Both swings landing together: clash
  if (
    d.state === 'attack' &&
    !d.stats.shot &&
    !d.struck &&
    windupOf(d) - d.t <= CLASH_MS &&
    inReach &&
    dist <= d.stats.reach + 10 &&
    Math.abs(a.z - d.z) < JUMP_CLEAR
  ) {
    d.struck = true
    log(fight, { kind: 'clash', by: a.side })
    setState(a, 'stagger', CLASH_STAGGER_MS)
    setState(d, 'stagger', CLASH_STAGGER_MS)
    knockBack(fight, a, d, 14)
    knockBack(fight, d, a, 14)
    return
  }
  // Avoided: a back-step (any part of it), or a jump over a ground swing
  if (d.state === 'dodge') return avoided(fight, a, d, 'dodge')
  if (inReach && a.z === 0 && d.z >= JUMP_CLEAR)
    return avoided(fight, a, d, 'jump')
  if (!inReach) {
    log(fight, { kind: 'whiff', by: a.side })
    return
  }

  const mult = a.countering ? COUNTER_DAMAGE : 1
  land(fight, a, d, a.stats.damage * mult, a.stats.knock ?? 1)
}

/** The lowest a fighter's health can go (training guards keep 1). */
const minHp = (fight: Fight, f: Fighter) =>
  (f === fight.hero && fight.guard?.hero) ||
  (f === fight.enemy && fight.guard?.enemy)
    ? 1
    : 0

/** `d` takes a hit from `a` (a swing or a projectile). */
function land(
  fight: Fight,
  a: Fighter,
  d: Fighter,
  raw: number,
  knock: number
) {
  // The summon takes hits, not damage: the Summoner feels each one (their
  // health, their armor) and the summon falls after SUMMON_HITS of them
  if (d === fight.summon) {
    const h = fight.hero
    const damage = Math.max(1, Math.round(raw * (1 - h.stats.armor)))
    h.hp = Math.max(minHp(fight, h), h.hp - damage)
    d.hp = Math.max(0, d.hp - 1)
    log(fight, { kind: 'hit', by: a.side, damage, onSummon: true })
    if (h.hp === 0) {
      setState(h, 'ko')
      log(fight, { kind: 'ko', by: a.side })
    }
    if (d.hp === 0) {
      setState(d, 'ko')
      log(fight, { kind: 'ko', by: a.side, onSummon: true })
      knockBack(fight, a, d, 12 * knock)
      return
    }
    setState(d, 'hurt')
    knockBack(fight, a, d, 16 * knock)
    return
  }
  const damage = Math.max(1, Math.round(raw * (1 - d.stats.armor)))
  d.hp = Math.max(minHp(fight, d), d.hp - damage)
  log(fight, {
    kind: 'hit',
    by: a.side,
    damage,
    counter: (a.countering && a.state === 'attack') || undefined,
  })
  if (d.hp === 0) {
    setState(d, 'ko')
    log(fight, { kind: 'ko', by: a.side })
    knockBack(fight, a, d, 12 * knock)
    return
  }
  // Mid-swing or just recovered: take the damage, keep going (a trade)
  if (d.state === 'attack' || fight.now < d.armorUntil) {
    knockBack(fight, a, d, 5 * knock)
    return
  }
  setState(d, 'hurt')
  knockBack(fight, a, d, 16 * knock)
}

/**
 * Moves everything in flight. A projectile hits the fighter it crosses,
 * unless they're high in the air or back-stepping (avoided: a Rogue readies
 * a counter, but a distant shooter isn't staggered).
 */
function fly(fight: Fight) {
  const keep: Projectile[] = []
  for (const p of fight.projectiles) {
    const from = p.x
    p.x += p.vx
    p.left -= Math.abs(p.vx)
    const shooter = p.by === 'hero' ? fight.hero : fight.enemy
    const target = p.by === 'hero' ? fight.enemy : fight.hero
    const lo = Math.min(from, p.x) - 8
    const hi = Math.max(from, p.x) + 8
    const crossed =
      fight.winner === null &&
      target.state !== 'ko' &&
      target.x >= lo &&
      target.x <= hi
    if (crossed) {
      // A back-step only clears a shot timed to it: still in the dodge's
      // invincible moment as the shot arrives
      const dodged =
        target.state === 'dodge' && target.t < target.stats.dodgeSafeMs
      if (dodged && target.stats.block) {
        log(fight, { kind: 'dodged', by: p.by, how: 'block' })
        continue // stopped by the shield
      }
      if (dodged || target.z >= JUMP_CLEAR) {
        log(fight, {
          kind: 'dodged',
          by: p.by,
          how: dodged ? 'dodge' : 'jump',
        })
        if (target.stats.counter) {
          target.counterUntil = fight.now + COUNTER_WINDOW_MS
          log(fight, { kind: 'counter', by: target.side })
        }
        if (dodged) blink(fight, target, shooter)
        keep.push(p) // it flies on past
        continue
      }
      land(fight, shooter, target, p.damage, 0.6)
      continue
    }
    if (p.left > 0 && p.x > ARENA.left - 30 && p.x < ARENA.right + 30)
      keep.push(p)
  }
  fight.projectiles = keep
}

// ---- the summon (Summoner) -------------------------------------------------

/** After a summon falls, this long before the next can be called. */
export const SUMMON_COOLDOWN_MS = 3000
/** A summon falls after this many hits (their damage goes to the Summoner). */
export const SUMMON_HITS = 2

/** A summon is out and still standing. */
export const summonAlive = (fight: Fight) =>
  !!fight.summon && fight.summon.state !== 'ko'

/**
 * Calls up a copy of the enemy on the hero's side, in front of the hero:
 * the enemy's own moves, health 1.5× the enemy's hit, hits as hard as the
 * Summoner's power (`a.stats.damage`).
 */
function callSummon(fight: Fight, a: Fighter, e: Fighter) {
  if (fight.summon) return
  const dir = e.x > a.x ? 1 : -1
  const room = Math.abs(e.x - a.x) - ARENA.minGap
  const x = clampX(a.x + dir * Math.max(0, Math.min(30, room)))
  const s = fighter('hero', x, {
    ...e.stats,
    // Hits it can take (each one hurts the Summoner instead)
    maxHp: SUMMON_HITS,
    damage: a.stats.damage,
    armor: 0,
    counter: false,
    shot: undefined,
    block: undefined,
    summons: undefined,
    thrustShots: undefined,
  })
  s.facing = dir === 1 ? 1 : -1
  s.attackReadyAt = fight.now + 300
  fight.summon = s
  log(fight, { kind: 'summon', by: 'hero' })
}

/** The summon's input: walk in, swing when in reach and rested. */
function summonInput(fight: Fight): FightInput {
  const s = fight.summon
  const e = fight.enemy
  if (!s || locked(s) || s.state === 'attack') return NO_INPUT
  const dist = Math.abs(e.x - s.x)
  if (dist <= s.stats.reach && fight.now >= s.attackReadyAt) {
    s.attackReadyAt =
      fight.now + windupOf(s) + s.stats.recoverMs + 250 + fight.rand() * 350
    return { ...NO_INPUT, attack: true }
  }
  if (dist <= s.stats.reach - 6) return NO_INPUT
  return { ...NO_INPUT, move: e.x > s.x ? 1 : -1 }
}

/** Keeps the summon off the enemy (on its own side of it), facing it. */
function settleSummon(fight: Fight) {
  const s = fight.summon
  if (!s) return
  const e = fight.enemy
  const side =
    s.x === e.x ? -awayFrom(e, fight.hero, fight.heroLeft) : s.x < e.x ? -1 : 1
  if (Math.abs(e.x - s.x) < ARENA.minGap) {
    s.x = clampX(e.x + side * ARENA.minGap)
    // Pinned at a wall: the enemy gives way instead
    if (Math.abs(e.x - s.x) < ARENA.minGap)
      e.x = clampX(s.x - side * ARENA.minGap)
  }
  if (s.state === 'idle' || s.state === 'walk') s.facing = e.x >= s.x ? 1 : -1
}

/** Who the enemy fights: the hero, or the summon if it's closer. */
export function enemyTarget(fight: Fight): Fighter {
  const s = fight.summon
  if (!s || s.state === 'ko') return fight.hero
  const e = fight.enemy
  return Math.abs(s.x - e.x) < Math.abs(fight.hero.x - e.x) ? s : fight.hero
}

function advance(f: Fighter, dt: number, now: number) {
  f.t += dt
  if (f.state === 'attack' && f.t >= windupOf(f) + f.stats.recoverMs)
    setState(f, 'idle')
  else if (f.state === 'dodge' && f.t >= f.stats.dodgeMs) setState(f, 'idle')
  else if (f.state === 'hurt' && f.t >= f.stats.hurtMs) {
    setState(f, 'idle')
    f.armorUntil = now + ARMOR_MS
  } else if (f.state === 'stagger' && f.t >= f.staggerMs) setState(f, 'idle')
}

/**
 * Keeps each fighter on its own side, at least minGap apart, whatever their
 * heights (no jumping over), and facing each other when free to turn.
 */
function settle(fight: Fight) {
  const { hero: h, enemy: e } = fight
  // +1: the enemy belongs to the hero's right
  const dir = fight.heroLeft ? 1 : -1
  const gap = () => (e.x - h.x) * dir
  if (gap() < ARENA.minGap) {
    // Split the push between them, then fix up against a wall
    const push = (ARENA.minGap - gap()) / 2
    h.x = clampX(h.x - dir * push)
    e.x = clampX(e.x + dir * push)
    if (gap() < ARENA.minGap) e.x = clampX(h.x + dir * ARENA.minGap)
    if (gap() < ARENA.minGap) h.x = clampX(e.x - dir * ARENA.minGap)
  }
  for (const [f, o] of [
    [h, e],
    [e, h],
  ] as const) {
    if (f.state === 'idle' || f.state === 'walk') f.facing = o.x >= f.x ? 1 : -1
  }
}

// ---- the enemy ------------------------------------------------------------

/**
 * The enemy's input this step: close in, swing when in reach and rested,
 * sometimes step back, and dodge a swing it sees coming (more often at
 * higher levels). Pinned against a wall, it swings back sooner.
 */
export function enemyInput(fight: Fight): FightInput {
  const { enemy: e, hero: h, now, rand } = fight
  if (fight.dummy || locked(e) || e.state === 'attack') return NO_INPUT
  const foe = enemyTarget(fight)
  const dist = Math.abs(foe.x - e.x)
  const toward = foe.x > e.x ? 1 : -1

  // Training: walk in, swing slowly (time to read it), nothing else
  if (fight.calm) {
    if (dist <= e.stats.reach) {
      if (now < e.attackReadyAt) return NO_INPUT
      e.attackReadyAt =
        now + windupOf(e) + e.stats.recoverMs + 1300 + rand() * 600
      return { ...NO_INPUT, attack: true }
    }
    return { ...NO_INPUT, move: toward * 0.6 }
  }
  const skill = Math.min(0.6, 0.12 + fight.enemyLevel * 0.04)
  const cornered =
    Math.min(e.x - ARENA.left, ARENA.right - e.x) < 30 && dist < 60

  // A swing is coming and it's in reach: maybe back-step or jump it. Only
  // swings: a shot is dodged as it arrives (below), not off the wind-up.
  if (
    h.state === 'attack' &&
    !h.stats.shot &&
    !h.struck &&
    Math.abs(h.x - e.x) <= h.stats.reach + 12 &&
    grounded(e) &&
    rand() < skill * 0.08
  ) {
    const canDodge = now >= e.dodgeReadyAt
    // Jump late in the wind-up (so it's high when the swing lands)
    const late = windupOf(h) - h.t < 260
    if (late && (!canDodge || rand() < 0.5)) return { ...NO_INPUT, jump: true }
    if (canDodge) return { ...NO_INPUT, dodge: true }
  }

  // Something flying at it, about to arrive: maybe jump or back-step it
  const incoming = fight.projectiles.some(
    (p) =>
      p.by === 'hero' &&
      Math.sign(e.x - p.x) === Math.sign(p.vx) &&
      Math.abs(e.x - p.x) < Math.abs(p.vx) * 9
  )
  if (incoming && grounded(e) && rand() < skill * 0.12) {
    if (rand() < 0.65 || now < e.dodgeReadyAt)
      return { ...NO_INPUT, jump: true }
    return { ...NO_INPUT, dodge: true }
  }

  if (now >= fight.ai.until) {
    const r = rand()
    fight.ai =
      r < 0.12 && !cornered
        ? { plan: 'back', until: now + 300 + rand() * 300 }
        : r < 0.22
          ? { plan: 'hold', until: now + 250 + rand() * 400 }
          : { plan: 'approach', until: now + 400 + rand() * 400 }
  }

  const rested = now >= e.attackReadyAt || (cornered && rand() < 0.08)
  if (dist <= e.stats.reach && rested) {
    e.attackReadyAt = now + windupOf(e) + e.stats.recoverMs + 250 + rand() * 650
    return { ...NO_INPUT, attack: true }
  }
  if (fight.ai.plan === 'back') return { ...NO_INPUT, move: -toward * 0.7 }
  if (fight.ai.plan === 'hold' || dist <= e.stats.reach - 6) return NO_INPUT
  return { ...NO_INPUT, move: toward }
}

// ---- the step -------------------------------------------------------------

/**
 * Advances the fight one step (mutates it). Returns the winner, if any.
 * After the K.O. it keeps animating (the winner's swing finishes, the loser
 * falls) but takes no input and resolves nothing.
 */
export function stepFight(
  fight: Fight,
  heroIn: FightInput,
  dt: number = STEP_MS
): Fight['winner'] {
  const { hero: h, enemy: e } = fight
  const over = fight.winner !== null
  const heroInput = over ? NO_INPUT : heroIn
  const enemyIn = over ? NO_INPUT : enemyInput(fight)

  const s = fight.summon
  const summonIn = over || !s ? NO_INPUT : summonInput(fight)

  if (!over) {
    act(h, heroInput, fight.now, fight)
    act(e, enemyIn, fight.now)
    if (s) act(s, summonIn, fight.now)
  }
  move(h, heroInput, e, fight.heroLeft)
  move(e, enemyIn, h, fight.heroLeft)
  if (s) move(s, summonIn, e, fight.heroLeft)
  settle(fight)
  settleSummon(fight)
  advance(h, dt, fight.now)
  advance(e, dt, fight.now)
  if (s) advance(s, dt, fight.now)
  if (!over) {
    strike(fight, h, e)
    strike(fight, e, enemyTarget(fight))
    if (s) strike(fight, s, e)
    shieldShove(fight, h, e)
  }
  fly(fight)
  // A fallen summon fades once it's down; a new one takes a while to call
  if (s && s.state === 'ko' && s.t >= KO_FALL_MS) {
    fight.summon = null
    h.summonReadyAt = fight.now + SUMMON_COOLDOWN_MS
  }
  fight.now += dt

  if (!over) {
    if (e.hp === 0) fight.winner = 'hero'
    else if (h.hp === 0) fight.winner = 'enemy'
    else if (fight.now >= fight.timeLimitMs)
      fight.winner =
        h.hp / h.stats.maxHp >= e.hp / e.stats.maxHp ? 'hero' : 'enemy'
    if (fight.winner) fight.endedAt = fight.now
  }
  return fight.winner
}

/** Health as a share of the maximum, 0..1. */
export const hpShare = (f: Fighter) => f.hp / f.stats.maxHp

/** Seconds left on the clock. */
export const timeLeft = (fight: Fight) =>
  Math.max(0, Math.ceil((fight.timeLimitMs - fight.now) / 1000))

/** Swings the hero avoided (dodged or jumped). */
export const heroDodges = (fight: Fight) =>
  fight.log.filter((e) => e.kind === 'dodged' && e.by === 'enemy').length

/** Hits the hero landed. */
export const heroHits = (fight: Fight) =>
  fight.log.filter((e) => e.kind === 'hit' && e.by === 'hero').length

// ---- replays (WATCH) --------------------------------------------------------

/**
 * The hero on autopilot, for watching an expedition's fights back: closes
 * in, swings when in reach, and (with chance `skill`) dodges or jumps a
 * swing that's about to land. Its own seeded `rand`, so a replay plays out
 * the same every time.
 */
export function heroAutopilot(
  fight: Fight,
  rand: () => number,
  skill: number
): FightInput {
  const { hero: h, enemy: e } = fight
  if (skill < 0) return NO_INPUT // the last resort for a recorded loss
  const gap = e.x - h.x
  const dist = Math.abs(gap)
  const landing =
    e.state === 'attack' &&
    !e.struck &&
    windupOf(e) - e.t < 160 &&
    dist <= e.stats.reach + 12
  if (landing && rand() < skill * 0.35)
    return rand() < 0.6
      ? { ...NO_INPUT, dodge: true }
      : { ...NO_INPUT, jump: true }
  // A shooter backs off when the enemy closes in, and fires from range
  if (h.stats.shot) {
    const room = gap > 0 ? h.x - ARENA.left : ARENA.right - h.x
    if (dist < 70 && room > 30 && rand() < 0.3 + skill * 0.6)
      return { ...NO_INPUT, move: -Math.sign(gap) }
    if (dist <= h.stats.reach)
      return { ...NO_INPUT, attack: rand() < 0.01 + skill * 0.25 }
  }
  // A sharp hero swings readily; a sloppy one hesitates and hangs back
  if (dist <= h.stats.reach - 4)
    return { ...NO_INPUT, attack: rand() < 0.01 + skill * 0.25 }
  if (rand() > 0.35 + skill * 0.65) return NO_INPUT
  return { ...NO_INPUT, move: Math.sign(gap) }
}

/** How sharply the hero fights on an expedition (autopilot skill). */
export const EXPEDITION_SKILL = 0.6

/** A recorded fight: replay it with this seed and autopilot skill. */
export interface ReplayPlan {
  seed: string
  skill: number
}

/** Plays a whole fight on autopilot (no screen); returns it finished. */
export function simulate(
  setup: { hero: FighterStats; enemy: FighterStats; enemyLevel: number },
  plan: ReplayPlan,
  maxSteps = 60 * 75
): Fight {
  const fight = newFight({ ...setup, seed: plan.seed })
  const pilot = seeded(`${plan.seed}:pilot`)
  for (let i = 0; i < maxSteps && !fight.winner; i++)
    stepFight(fight, heroAutopilot(fight, pilot, plan.skill))
  return fight
}

/**
 * Finds a seed whose autopilot fight ends the way the real battle did
 * (`heroWins`), so WATCH shows the hero winning the battles they won and
 * losing the ones they lost. A sharp autopilot for wins, a sloppy one for
 * losses. Null only for a win the hero can't manage at all (far
 * outmatched); the caller then shows their best try.
 */
export function replaySeed(
  setup: { hero: FighterStats; enemy: FighterStats; enemyLevel: number },
  base: string,
  heroWins: boolean,
  tries = 40
): ReplayPlan | null {
  // A recorded loss can always be shown: a hero who stands still loses
  const skills = heroWins ? [0.85, 0.6, 1] : [0.15, 0.05, 0, -1]
  for (const skill of skills)
    for (let i = 0; i < tries; i++) {
      const plan = { seed: `${base}:${i}`, skill }
      const f = simulate(setup, plan)
      if ((f.winner === 'hero') === heroWins) return plan
    }
  return null
}
