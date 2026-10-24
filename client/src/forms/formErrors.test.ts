import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { toFormErrors } from './formErrors'

const FIELDS = ['email', 'password'] as const

const apiError = (errors?: Record<string, string[]>, message = 'Request failed') =>
  new ApiError(400, { title: 'Validation failed', status: 400, errors }, message)

describe('toFormErrors', () => {
  it('puts a field error under its input', () => {
    const result = toFormErrors(apiError({ password: ['Too short.'] }), FIELDS)

    expect(result).toEqual({ fields: { password: 'Too short.' }, form: null })
  })

  it('shows an error for an unknown field in the banner instead of dropping it', () => {
    const result = toFormErrors(apiError({ nickname: ['Too long.'] }), FIELDS)

    expect(result).toEqual({ fields: {}, form: 'Too long.' })
  })

  it('uses the error message when there are no field details', () => {
    const result = toFormErrors(apiError(undefined, 'Invalid email or password.'), FIELDS)

    expect(result).toEqual({ fields: {}, form: 'Invalid email or password.' })
  })

  it('shows known and unknown field errors together', () => {
    const result = toFormErrors(apiError({ password: ['Too short.'], nickname: ['Too long.'] }), FIELDS)

    expect(result).toEqual({ fields: { password: 'Too short.' }, form: 'Too long.' })
  })

  it('shows a generic message for anything that is not an ApiError', () => {
    const result = toFormErrors(new Error('boom'), FIELDS)

    expect(result).toEqual({ fields: {}, form: 'Something went wrong. Please try again.' })
  })
})