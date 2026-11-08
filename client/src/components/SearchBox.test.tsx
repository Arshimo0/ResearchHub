import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../test/renderWithProviders'
import { SearchBox } from './SearchBox'

function CurrentAddress() {
  const { pathname, search } = useLocation()
  return <p data-testid="address">{`${pathname}${search}`}</p>
}

function renderBox(route = '/') {
  return renderWithProviders(
    <>
      <SearchBox />
      <Link to="/">Home</Link>
      <CurrentAddress />
    </>,
    { route },
  )
}

const box = () => screen.getByRole('searchbox', { name: 'Search papers' })
const address = () => screen.getByTestId('address').textContent

describe('SearchBox', () => {
  it('goes to the results page with the cleaned-up text', async () => {
    const user = userEvent.setup()
    renderBox()

    await user.type(box(), '  attention   is  {Enter}')

    expect(address()).toBe('/search?q=attention+is')
  })

  it('opens the plain search page when the box is empty', async () => {
    const user = userEvent.setup()
    renderBox()

    await user.type(box(), '   {Enter}')

    expect(address()).toBe('/search')
  })

  it('shows the current search when opened on the results page', () => {
    renderBox('/search?q=attention+is')

    expect(box()).toHaveValue('attention is')
  })

  it('clears itself when the user leaves the results page', async () => {
    const user = userEvent.setup()
    renderBox('/search?q=attention')
    expect(box()).toHaveValue('attention')

    await user.click(screen.getByRole('link', { name: 'Home' }))

    expect(box()).toHaveValue('')
  })
})