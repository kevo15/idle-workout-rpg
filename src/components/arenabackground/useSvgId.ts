import { useId } from 'react'

/** Document-unique SVG id (gradient ids collide on web when several screens are mounted). */
export function useSvgId(prefix: string): string {
  return prefix + useId().replace(/[^a-zA-Z0-9_-]/g, '')
}
