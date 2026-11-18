// Combat training: a guided first spar against a calm Goblin, one step at a
// time. Each step is a prompt and a check on the fight (its state and the
// events it just logged); the next step starts once you've done it.
//
//   MOVE → ATTACK → (Summoner: WATER) → JUMP → DODGE / BLOCK → the class's
//   trick (Rogue counter, Warrior shove, everyone else's corner blink) →
//   FINISH IT
//
// Nobody can lose: the hero never drops below 1 health, and the Goblin only
// can fall in the last step. The Goblin stands still until the dodge step,
// then walks in and swings slowly (`calm`). Runs once before the first hand
// fight (again after a class change), and can be replayed.

import type { ClassId } from './classes'
import { ARENA, summonAlive, type Fight, type FightEvent } from './fight'

export interface TutorialStep {
  id: string
  title: string
  text: string
  /** Sets the fight up for this step (who acts, who's guarded, where). */
  setup?: (f: Fight) => void
  /** Done: `fresh` are the events since the last check, `startX` where the
   *  hero stood when the step began. */
  done: (f: Fight, fresh: FightEvent[], startX: number) => boolean
}

/** The Goblin stands still and can't fall (the first steps). */
const still = (f: Fight) => {
  f.dummy = true
  f.calm = true
  f.guard = { hero: true, enemy: true }
}
/** The Goblin walks in and swings slowly; it still can't fall. */
const swinging = (f: Fight) => {
  f.dummy = false
  f.calm = true
  f.guard = { hero: true, enemy: true }
}

const heroDid = (fresh: FightEvent[], kind: FightEvent['kind']) =>
  fresh.some((e) => e.kind === kind && e.by === 'hero')
/** The hero avoided a swing (the event is the enemy's). */
const avoided = (fresh: FightEvent[], how: FightEvent['how']) =>
  fresh.some((e) => e.kind === 'dodged' && e.by === 'enemy' && e.how === how)

const ATTACK_TEXT: Record<ClassId, string> = {
  warrior: 'Get in reach and tap ATTACK: a heavy sword swing.',
  rogue: 'Get in reach and tap ATTACK: quick dagger slashes.',
  archer: 'Tap ATTACK: arrows fly across the arena. Keep your distance.',
  mage: 'Tap ATTACK: your spells alternate, a magic bolt then fire or lightning from the staff.',
  summoner:
    'Tap ATTACK: your first cast summons a copy of your foe to fight for you.',
}

/** The steps for this class, in order. */
export function tutorialSteps(classId: ClassId): TutorialStep[] {
  const steps: TutorialStep[] = [
    {
      id: 'move',
      title: 'MOVE',
      text: 'Touch the left side and drag: walk toward the Goblin.',
      setup: still,
      done: (f, _e, startX) => Math.abs(f.hero.x - startX) >= 20,
    },
    {
      id: 'attack',
      title: classId === 'summoner' ? 'SUMMON' : 'ATTACK',
      text: ATTACK_TEXT[classId],
      done: (_f, fresh) =>
        classId === 'summoner'
          ? heroDid(fresh, 'summon')
          : fresh.some((e) => e.kind === 'hit' && e.by === 'hero'),
    },
  ]
  if (classId === 'summoner')
    steps.push({
      id: 'water',
      title: 'WATER BALL',
      text: 'With your summon out, ATTACK fires water balls. Hits on your summon hurt you, and it fades after 2.',
      done: (f, fresh) => summonAlive(f) && heroDid(fresh, 'shot'),
    })
  steps.push(
    {
      id: 'jump',
      title: 'JUMP',
      text: 'Push the stick up to jump.',
      done: (f) => f.hero.z > 0,
    },
    classId === 'warrior'
      ? {
          id: 'block',
          title: 'BLOCK',
          text: 'The Goblin swings now. Tap BLOCK as it swings: your shield stops it and shoves it back.',
          setup: swinging,
          done: (_f, fresh) => avoided(fresh, 'block'),
        }
      : {
          id: 'dodge',
          title: 'DODGE',
          text: 'The Goblin swings now. Tap DODGE as the blow comes, not before. Shots too: dodge as they arrive.',
          setup: swinging,
          done: (_f, fresh) => avoided(fresh, 'dodge'),
        }
  )
  if (classId === 'rogue')
    steps.push({
      id: 'counter',
      title: 'COUNTER',
      text: 'Dodge a swing, then step back in and ATTACK quickly: a fast counter thrust that hits harder.',
      done: (_f, fresh) =>
        fresh.some((e) => e.kind === 'hit' && e.by === 'hero' && e.counter),
    })
  else if (classId === 'warrior')
    steps.push({
      id: 'shove',
      title: 'SHIELD SHOVE',
      text: 'BLOCK works any time: up close it shoves the Goblin out of reach, even mid-swing.',
      done: (_f, fresh) => heroDid(fresh, 'shove'),
    })
  else
    steps.push({
      id: 'blink',
      title: 'CORNER BLINK',
      text: 'Backed into a corner? Dodge a swing there and you blink behind the Goblin.',
      setup: (f) => {
        swinging(f)
        // Into the corner, the Goblin in front
        const dir = f.heroLeft ? 1 : -1
        f.hero.x = f.heroLeft ? ARENA.left + 4 : ARENA.right - 4
        f.enemy.x = f.hero.x + dir * 70
        f.summon = null
      },
      done: (_f, fresh) => heroDid(fresh, 'blink'),
    })
  steps.push({
    id: 'finish',
    title: 'FINISH IT',
    text: 'Everything you need. Beat the Goblin!',
    setup: (f) => {
      f.dummy = false
      f.calm = true
      f.guard = { hero: true, enemy: false }
    },
    done: (f) => f.winner === 'hero',
  })
  return steps
}

/** Short reminders for the pause menu's HOW TO FIGHT card. */
export const FIGHT_TIPS: Record<ClassId, string[]> = {
  warrior: [
    'ATTACK in reach: a heavy swing that knocks foes back.',
    'BLOCK stops swings and shots, and shoves the foe out of reach.',
    'Block any time up close to push them away, even if it is not swinging.',
    'Push the stick up to jump over a low blow.',
  ],
  rogue: [
    'ATTACK: quick dagger slashes up close.',
    'DODGE as a blow lands, then step in and ATTACK quickly: a counter thrust.',
    'Dodge in a corner to blink behind your foe.',
    'Push the stick up to jump.',
  ],
  archer: [
    'ATTACK fires arrows: keep your distance and shoot.',
    'DODGE as a blow lands, or as a shot arrives, not on the wind-up.',
    'Dodge in a corner to blink behind your foe.',
    'Push the stick up to jump.',
  ],
  mage: [
    'ATTACK alternates: a magic bolt, then fire or lightning from the staff.',
    'DODGE as a blow lands, or as a shot arrives, not on the wind-up.',
    'Dodge in a corner to blink behind your foe.',
    'Push the stick up to jump.',
  ],
  summoner: [
    'Your first ATTACK summons a copy of your foe to fight for you.',
    'With it out, ATTACK fires water balls (half its damage).',
    'Hits on your summon hurt you; it fades after 2. One at a time.',
    'DODGE as a blow lands; dodge in a corner to blink behind your foe.',
  ],
}
