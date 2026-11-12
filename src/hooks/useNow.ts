import { useEffect, useState } from 'react'

/** The current time, refreshed every `everyMs` while the component is mounted. */
export function useNow(everyMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(t)
  }, [everyMs])
  return now
}
