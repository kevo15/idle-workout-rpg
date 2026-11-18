// Loading data that comes from somewhere slow (the database, once it
// exists). `useLoad` runs an async fetcher and tracks loading / ready /
// error, with retry; <LoadGate> shows the LoadingScreen, the content or a
// retry card from it.
//
// Today every screen's data lives on the device (zustand + AsyncStorage,
// hydrated before the app renders). When the backend lands (roadmap Track
// C), a screen that fetches wraps its content like this:
//
//   const result = useLoad(() => api.expeditionLog(), [])
//   return (
//     <LoadGate load={result} title="LOADING REPLAYS">
//       {(log) => <ReplayList log={log} />}
//     </LoadGate>
//   )
//
// Features that will fetch: hero profile and stats (Hero), the day's quests
// and completions (Quests, Workout), expedition results, gold claims and
// checkpoints (Camp, YOUR CALL), battle events (Replay), wallet and region
// unlocks (Map), and the overworld's state when it's server-side.
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type DependencyList,
} from 'react'

export type LoadState<T> =
  | { status: 'loading'; data?: T }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: string; data?: T }

export type LoadAction<T> =
  | { type: 'start' }
  | { type: 'done'; data: T }
  | { type: 'fail'; error: string }

/** Pure transitions: a retry keeps the last data while it reloads. */
export function loadReducer<T>(
  state: LoadState<T>,
  action: LoadAction<T>
): LoadState<T> {
  switch (action.type) {
    case 'start':
      return { status: 'loading', data: state.data }
    case 'done':
      return { status: 'ready', data: action.data }
    case 'fail':
      return { status: 'error', error: action.error, data: state.data }
  }
}

/** A readable message for anything a fetcher throws. */
export const errorMessage = (e: unknown) =>
  e instanceof Error
    ? e.message
    : typeof e === 'string'
      ? e
      : 'Something went wrong.'

export type LoadResult<T> = LoadState<T> & {
  retry: () => void
  /** Counts loads (first load and each retry), e.g. to restart a spinner. */
  attempt: number
}

/**
 * Runs `fetcher` now and whenever `deps` change (or on retry). Results that
 * arrive after the screen moved on, or after a newer request, are ignored.
 */
export function useLoad<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList
): LoadResult<T> {
  const [state, dispatch] = useReducer(
    loadReducer as (s: LoadState<T>, a: LoadAction<T>) => LoadState<T>,
    { status: 'loading' }
  )
  const run = useRef(0)
  const [attempt, setAttempt] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(() => {
    const id = ++run.current
    setAttempt((a) => a + 1)
    dispatch({ type: 'start' })
    fetcherRef
      .current()
      .then((data) => {
        if (id === run.current) dispatch({ type: 'done', data })
      })
      .catch((e: unknown) => {
        if (id === run.current)
          dispatch({ type: 'fail', error: errorMessage(e) })
      })
  }, [])

  useEffect(() => {
    load()
    return () => {
      run.current++ // ignore anything still in flight
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ...state, retry: load, attempt }
}
