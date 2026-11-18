// Fighter sprite sheets (Shadow Sprinter's LPC characters; see ASSETS.md).
// LPC sheets have 4 rows (up, left, down, right); a side-view fight uses the
// left and right rows. Hurt sheets are one row: their first frame is held as
// the flinch. Big weapon swings use 128 or 192 px frames centred on the body.
import {
  KO_FALL_MS,
  windupOf,
  type EnemyKind,
  type Fighter,
} from '../../rpg/fight'
import type { ClassId } from '../../rpg/types'

export type FightAnim = {
  src: number
  frameWidth: number
  frameHeight: number
  /** Frames per row on the sheet. */
  columns: number
  startFrame: number
  frameCount: number
  /** One loop, in ms (idle and walk). */
  speed: number
  /** One-row sheets (the hurt). */
  oneRow?: boolean
  /** Attacks: the frame the blow lands (or the shot leaves) on. */
  hitFrame?: number
}

export type FighterSkin = {
  idle: FightAnim
  walk: FightAnim
  attack: FightAnim
  /** The flinch: the hurt sheet's first frame. */
  hurt: FightAnim
  /** The K.O.: the hurt sheet's whole fall. */
  ko: FightAnim
  /** In the air. */
  jump: FightAnim
  /**
   * The other attack: the staff thrust (Mage: fireball / lightning;
   * Summoner: water balls while its summon is out).
   */
  attackAlt?: FightAnim
  /** The Warrior's DODGE: the shield thrust (block). */
  block?: FightAnim
}

const lpc = (
  src: number,
  columns: number,
  startFrame: number,
  frameCount: number,
  speed: number
): FightAnim => ({
  src,
  frameWidth: 64,
  frameHeight: 64,
  columns,
  startFrame,
  frameCount,
  speed,
})

const swing = (src: number, size: 64 | 128 | 192, columns = 6): FightAnim => ({
  src,
  frameWidth: size,
  frameHeight: size,
  columns,
  startFrame: 0,
  frameCount: 6,
  speed: 600,
})

const hurt = (src: number, columns: number): FightAnim => ({
  ...lpc(src, columns, 0, 1, 250),
  oneRow: true,
})
/**
 * The K.O.: the hurt sheet's first 5 frames, holding the 5th (slumped on the
 * floor). The 6th is drawn top-down (face-down, head toward the viewer) and
 * looks wrong side-on, so it's left out.
 */
const fall = (src: number, columns: number): FightAnim => ({
  ...lpc(src, columns, 0, 5, 900),
  oneRow: true,
})

/** A 64 px attack on a full 13-column sheet (thrust, shoot, spellcast). */
const attack64 = (
  src: number,
  frameCount: number,
  hitFrame: number
): FightAnim => ({ ...lpc(src, 13, 0, frameCount, 600), hitFrame })

/** One hero class's sheets (LPC generator exports; see ASSETS.md). */
const heroSheets = (
  sheets: { idle: number; run: number; hurt: number; jump: number },
  attack: FightAnim
): FighterSkin => ({
  idle: lpc(sheets.idle, 13, 0, 2, 1000),
  walk: lpc(sheets.run, 13, 0, 8, 640),
  attack,
  hurt: hurt(sheets.hurt, 13),
  ko: fall(sheets.hurt, 13),
  jump: lpc(sheets.jump, 13, 0, 5, 500),
})

/**
 * Each class's look and attack: the Warrior's katana and shield (a 128 px
 * slash), the Rogue's dagger thrust, the Archer's bow, and the Mage's
 * S staff and the Summoner's gnarled staff casting.
 */
export const HERO_SKINS: Record<ClassId, FighterSkin> = {
  warrior: {
    ...heroSheets(
      {
        idle: require('../../assets/fighters/hero/warrior/idle.png'),
        run: require('../../assets/fighters/hero/warrior/run.png'),
        hurt: require('../../assets/fighters/hero/warrior/hurt.png'),
        jump: require('../../assets/fighters/hero/warrior/jump.png'),
      },
      swing(require('../../assets/fighters/hero/warrior/slash_128.png'), 128)
    ),
    // The shield thrust (the generator's thrust: the round shield pushed out)
    block: lpc(
      require('../../assets/fighters/hero/warrior/thrust.png'),
      13,
      0,
      8,
      300
    ),
  },
  rogue: {
    ...heroSheets(
      {
        idle: require('../../assets/fighters/hero/rogue/idle.png'),
        run: require('../../assets/fighters/hero/rogue/run.png'),
        hurt: require('../../assets/fighters/hero/rogue/hurt.png'),
        jump: require('../../assets/fighters/hero/rogue/jump.png'),
      },
      // Slashes; the dagger thrust is the counter (after a dodge)
      attack64(require('../../assets/fighters/hero/rogue/slash.png'), 6, 4)
    ),
    attackAlt: attack64(
      require('../../assets/fighters/hero/rogue/thrust.png'),
      8,
      5
    ),
  },
  archer: heroSheets(
    {
      idle: require('../../assets/fighters/hero/archer/idle.png'),
      run: require('../../assets/fighters/hero/archer/run.png'),
      hurt: require('../../assets/fighters/hero/archer/hurt.png'),
      jump: require('../../assets/fighters/hero/archer/jump.png'),
    },
    attack64(require('../../assets/fighters/hero/archer/shoot.png'), 13, 9)
  ),
  mage: {
    ...heroSheets(
      {
        idle: require('../../assets/fighters/hero/mage/idle.png'),
        run: require('../../assets/fighters/hero/mage/run.png'),
        hurt: require('../../assets/fighters/hero/mage/hurt.png'),
        jump: require('../../assets/fighters/hero/mage/jump.png'),
      },
      attack64(require('../../assets/fighters/hero/mage/spellcast.png'), 7, 5)
    ),
    // The S staff thrust (192 px frames, 8 per row): the shot leaves as
    // the staff reaches full stretch
    attackAlt: {
      ...swing(
        require('../../assets/fighters/hero/mage/thrust_oversize.png'),
        192,
        8
      ),
      frameCount: 8,
      hitFrame: 3,
    },
  },
  summoner: {
    // The spell cast summons; the gnarled staff thrust fires water balls
    ...heroSheets(
      {
        idle: require('../../assets/fighters/hero/summoner/idle.png'),
        run: require('../../assets/fighters/hero/summoner/run.png'),
        hurt: require('../../assets/fighters/hero/summoner/hurt.png'),
        jump: require('../../assets/fighters/hero/summoner/jump.png'),
      },
      attack64(
        require('../../assets/fighters/hero/summoner/spellcast.png'),
        7,
        5
      )
    ),
    attackAlt: {
      ...swing(
        require('../../assets/fighters/hero/summoner/thrust_oversize.png'),
        192,
        8
      ),
      frameCount: 8,
      hitFrame: 3,
    },
  },
}

/** The hero's skin for a class (the Warrior's if unknown). */
export const heroSkin = (classId: ClassId | null | undefined) =>
  HERO_SKINS[classId ?? 'warrior'] ?? HERO_SKINS.warrior

/** Enemies with the LPC generator's full 13-column sheets. */
const fullSheet = (
  sheets: { idle: number; walk: number; hurt: number; jump: number },
  attack: FightAnim
): FighterSkin => ({
  idle: lpc(sheets.idle, 13, 0, 2, 1000),
  walk: lpc(sheets.walk, 13, 1, 8, 760),
  attack,
  hurt: hurt(sheets.hurt, 13),
  ko: fall(sheets.hurt, 13),
  jump: lpc(sheets.jump, 13, 0, 5, 500),
})

export const ENEMY_SKINS: Record<EnemyKind, FighterSkin> = {
  goblin: fullSheet(
    {
      idle: require('../../assets/fighters/goblin/idle.png'),
      walk: require('../../assets/fighters/goblin/walk.png'),
      hurt: require('../../assets/fighters/goblin/hurt.png'),
      jump: require('../../assets/fighters/goblin/jump.png'),
    },
    swing(require('../../assets/fighters/goblin/slash.png'), 64, 13)
  ),
  lizard: fullSheet(
    {
      idle: require('../../assets/fighters/lizard/idle.png'),
      walk: require('../../assets/fighters/lizard/walk.png'),
      hurt: require('../../assets/fighters/lizard/hurt.png'),
      jump: require('../../assets/fighters/lizard/jump.png'),
    },
    swing(require('../../assets/fighters/lizard/slash_128.png'), 128)
  ),
  ogre: fullSheet(
    {
      idle: require('../../assets/fighters/ogre/idle.png'),
      walk: require('../../assets/fighters/ogre/walk.png'),
      hurt: require('../../assets/fighters/ogre/hurt.png'),
      jump: require('../../assets/fighters/ogre/jump.png'),
    },
    swing(require('../../assets/fighters/ogre/slash_oversize.png'), 192)
  ),
  oni: {
    idle: lpc(require('../../assets/fighters/oni/idle.png'), 2, 0, 2, 1000),
    walk: lpc(require('../../assets/fighters/oni/walk.png'), 9, 1, 8, 760),
    attack: swing(require('../../assets/fighters/oni/slash_oversize.png'), 192),
    hurt: hurt(require('../../assets/fighters/oni/hurt.png'), 6),
    ko: fall(require('../../assets/fighters/oni/hurt.png'), 6),
    jump: lpc(require('../../assets/fighters/oni/jump.png'), 5, 0, 5, 500),
  },
}

/** Every distinct sheet a skin uses (to keep mounted and to preload). */
export function sheetsOf(skin: FighterSkin): FightAnim[] {
  const seen = new Set<number>()
  return [
    skin.idle,
    skin.walk,
    skin.attack,
    ...(skin.attackAlt ? [skin.attackAlt] : []),
    ...(skin.block ? [skin.block] : []),
    skin.hurt,
    skin.ko,
    skin.jump,
  ].filter((a) => !seen.has(a.src) && (seen.add(a.src), true))
}

/**
 * Which animation and frame to show for a fighter. Attacks show the frames
 * up to their hit frame over the wind-up (so the blow lands, or the shot
 * leaves, when the engine resolves it) and the rest over the recovery. The dodge plays the
 * walk quickly (no dodge sheet in the generator). A flinch or stagger holds
 * the hurt sheet's first frame; a K.O. plays the fall and stays down,
 * slumped (see `fall`). In the air: the jump sheet.
 */
export function poseFor(
  skin: FighterSkin,
  f: Fighter
): { anim: FightAnim; frame: number } {
  const t = f.t
  const loop = (a: FightAnim, speed = a.speed) => ({
    anim: a,
    frame:
      a.startFrame + (Math.floor(t / (speed / a.frameCount)) % a.frameCount),
  })
  switch (f.state) {
    case 'attack': {
      const a = f.thrusting && skin.attackAlt ? skin.attackAlt : skin.attack
      const windup = windupOf(f)
      // Up to the hit frame over the wind-up, the rest over the recovery
      const hit = a.hitFrame ?? 4
      const n =
        t < windup
          ? Math.floor((t / windup) * hit)
          : hit +
            Math.floor(
              ((t - windup) / f.stats.recoverMs) * (a.frameCount - hit)
            )
      return { anim: a, frame: a.startFrame + Math.min(a.frameCount - 1, n) }
    }
    case 'ko': {
      const fall = skin.ko
      const n = Math.min(
        fall.frameCount - 1,
        Math.floor((t / KO_FALL_MS) * fall.frameCount)
      )
      return { anim: fall, frame: fall.startFrame + n }
    }
    case 'hurt':
    case 'stagger':
      return { anim: skin.hurt, frame: skin.hurt.startFrame }
    case 'dodge': {
      // Shield thrust: push out fast, hold it while blocking, ease back
      const b = skin.block
      if (b) {
        const n = Math.min(
          b.frameCount - 1,
          Math.floor((t / f.stats.dodgeMs) * b.frameCount)
        )
        return { anim: b, frame: b.startFrame + n }
      }
      return loop(skin.walk, f.stats.dodgeMs)
    }
  }
  if (f.z > 0) {
    // Rise, hang, fall: pick the jump frame from the vertical speed
    const j = skin.jump
    const n = f.vz > 2 ? 1 : f.vz > -2 ? 2 : 3
    return { anim: j, frame: j.startFrame + Math.min(j.frameCount - 1, n) }
  }
  return f.state === 'walk' ? loop(skin.walk) : loop(skin.idle)
}
