import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { generateLoans } from '@/data/loans'
import { LoanTable } from './LoanTable'

/** Tab forward until the roving focus lands on a table row. */
async function tabIntoGrid(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < 40; i += 1) {
    if (document.activeElement?.tagName === 'TR') return
    await user.tab()
  }
}

describe('LoanTable', () => {
  it('selects a row with the keyboard and reveals the bulk bar', async () => {
    const user = userEvent.setup()
    render(<LoanTable loans={generateLoans(10)} />)

    await tabIntoGrid(user)
    expect(document.activeElement?.tagName).toBe('TR')

    await user.keyboard('{ArrowDown}{ArrowDown}')
    await user.keyboard(' ')

    const selectedRows = screen
      .getAllByRole('row')
      .filter((row) => row.getAttribute('aria-selected') === 'true')

    expect(selectedRows).toHaveLength(1)
    // Two arrows down from the first data row lands on the third (rowindex 4:
    // header is 1, first data row is 2).
    expect(selectedRows[0]).toHaveAttribute('aria-rowindex', '4')

    expect(screen.getByTestId('bulk-action-bar')).toBeInTheDocument()
    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })
})
