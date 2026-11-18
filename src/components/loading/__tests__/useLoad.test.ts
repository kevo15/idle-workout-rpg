import { errorMessage, loadReducer, type LoadState } from '../useLoad'

describe('loading states', () => {
  const loading: LoadState<number> = { status: 'loading' }

  it('goes loading -> ready with the data', () => {
    expect(loadReducer(loading, { type: 'done', data: 7 })).toEqual({
      status: 'ready',
      data: 7,
    })
  })

  it('reports a failure and keeps old data for a retry', () => {
    const ready: LoadState<number> = { status: 'ready', data: 7 }
    const failed = loadReducer(ready, { type: 'fail', error: 'offline' })
    expect(failed).toEqual({ status: 'error', error: 'offline', data: 7 })
    expect(loadReducer(failed, { type: 'start' })).toEqual({
      status: 'loading',
      data: 7,
    })
  })

  it('turns anything thrown into a message', () => {
    expect(errorMessage(new Error('timeout'))).toBe('timeout')
    expect(errorMessage('nope')).toBe('nope')
    expect(errorMessage(42)).toBe('Something went wrong.')
  })
})
