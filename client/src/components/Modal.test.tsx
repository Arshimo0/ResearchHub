import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders its content only while open', () => {
    const { rerender } = render(
      <Modal open={false} onClose={() => {}} title="Hello">
        <p>Body</p>
      </Modal>,
    )
    expect(screen.queryByText('Body')).not.toBeInTheDocument()

    rerender(
      <Modal open onClose={() => {}} title="Hello">
        <p>Body</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Hello' })).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
  })

  it('closes when the backdrop is pressed and released', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Hello">
        <p>Body</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Hello' })

    fireEvent.mouseDown(dialog)
    fireEvent.click(dialog)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when the content is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Hello">
        <p>Body</p>
      </Modal>,
    )
    const body = screen.getByText('Body')

    fireEvent.mouseDown(body)
    fireEvent.click(body)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not close when a press starts inside and is released on the backdrop', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Hello">
        <p>Body</p>
      </Modal>,
    )

    // Selecting text and letting go outside the panel produces a click on the dialog itself.
    fireEvent.mouseDown(screen.getByText('Body'))
    fireEvent.click(screen.getByRole('dialog', { name: 'Hello' }))

    expect(onClose).not.toHaveBeenCalled()
  })
})