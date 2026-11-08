import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MAX_TAGS, TagInput } from './TagInput'

function Harness({ onSubmit = () => {} }: { onSubmit?: () => void }) {
  const [tags, setTags] = useState<string[]>([])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <TagInput label="Tags" value={tags} onChange={setTags} />
      <p data-testid="value">{tags.join('|')}</p>
    </form>
  )
}

const value = () => screen.getByTestId('value').textContent ?? ''

describe('TagInput', () => {
  it('adds a tag on Enter, trimmed and lowercased', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByLabelText('Tags'), '  Machine Learning {Enter}')

    expect(value()).toBe('machine learning')
    expect(screen.getByLabelText('Tags')).toHaveValue('')
  })

  it('adds a tag for each comma and keeps the unfinished text in the box', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByLabelText('Tags')

    await user.type(input, 'a, b,c')

    expect(value()).toBe('a|b')
    expect(input).toHaveValue('c')
  })

  it('splits a pasted list, and keeps the last item until the box loses focus', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByLabelText('Tags')

    await user.click(input)
    await user.paste('x, y, z')

    expect(value()).toBe('x|y')
    expect(input).toHaveValue(' z')

    await user.tab()

    expect(value()).toBe('x|y|z')
  })

  it('ignores duplicates, whatever their case', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByLabelText('Tags'), 'nlp{Enter}NLP{Enter} nlp {Enter}')

    expect(value()).toBe('nlp')
  })

  it('removes a tag with its remove button', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByLabelText('Tags'), 'a{Enter}b{Enter}')
    await user.click(screen.getByRole('button', { name: 'Remove tag a' }))

    expect(value()).toBe('b')
  })

  it('removes the last tag on Backspace only when the box is empty', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByLabelText('Tags')

    await user.type(input, 'a{Enter}b{Enter}')
    await user.keyboard('{Backspace}')
    expect(value()).toBe('a')

    await user.type(input, 'x{Backspace}')
    expect(value()).toBe('a')
    expect(input).toHaveValue('')
  })

  it('does not submit the surrounding form when Enter adds a tag', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Harness onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Tags'), 'a{Enter}')

    expect(value()).toBe('a')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps a typed tag when the box loses focus', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByLabelText('Tags'), 'pending')
    await user.tab()

    expect(value()).toBe('pending')
  })

  it('stops at the limit and says so', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByLabelText('Tags')

    for (let i = 0; i < MAX_TAGS; i++) {
      await user.type(input, `tag${i}{Enter}`)
    }

    expect(value().split('|')).toHaveLength(MAX_TAGS)
    expect(input).toBeDisabled()
    expect(screen.getByText(`You have reached the limit of ${MAX_TAGS} tags.`)).toBeInTheDocument()
  })
})