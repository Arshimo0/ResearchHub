import { describe, expect, it } from 'vitest'
import { ApiError } from './client'
import { createQueryClient } from './queryClient'

type RetryFn = (failureCount: number, error: Error) => boolean

const retry = createQueryClient().getDefaultOptions().queries?.retry as RetryFn
const failure = (status: number) => new ApiError(status, null, `failed ${status}`)

describe('query retry policy', () => {
  it('does not retry client errors, which will not fix themselves', () => {
    for (const status of [400, 401, 403, 404, 409]) {
      expect(retry(0, failure(status))).toBe(false)
    }
  })

  it('retries server errors twice', () => {
    expect(retry(0, failure(500))).toBe(true)
    expect(retry(1, failure(500))).toBe(true)
    expect(retry(2, failure(500))).toBe(false)
  })

  it('retries when the server cannot be reached', () => {
    expect(retry(0, failure(0))).toBe(true)
  })
})