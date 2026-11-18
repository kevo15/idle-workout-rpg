import { useHero } from '../state/useHero'
import type { FightParams, RootStackParamList } from './types'

/**
 * A fight the player takes control of: until combat training is done (a new
 * hero, or after a class change), the training runs first and then goes on
 * to this fight.
 */
export function handFight(params: FightParams): RootStackParamList['Fight'] {
  return useHero.getState().tutorialDone
    ? params
    : { tutorial: true, then: params }
}
