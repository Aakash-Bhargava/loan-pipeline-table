import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { generateLoans, isFlagged } from '@/data/loans'
import { LoanTable } from './LoanTable'

const allLoans = generateLoans()

/** The two rows the generator leaves mid-review. */
const streamingLoans = allLoans.filter((loan) => loan.aiReview.status === 'streaming')
const flaggedLoans = allLoans.filter(isFlagged)

const meta = {
  title: 'Loan table/LoanTable',
  component: LoanTable,
  args: {
    loans: allLoans,
    density: 'comfortable',
    state: 'ready',
    onRetry: fn(),
    onOpen: fn(),
    onBulkAction: fn(),
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof LoanTable>

export default meta

type Story = StoryObj<typeof meta>

/* Density permutations ---------------------------------------------------- */

export const Comfortable: Story = {
  args: { density: 'comfortable' },
}

export const Compact: Story = {
  args: { density: 'compact' },
}

/* State permutations ------------------------------------------------------ */

export const Ready: Story = {
  args: { state: 'ready' },
}

export const Loading: Story = {
  args: { state: 'loading' },
}

export const Empty: Story = {
  args: { state: 'empty', loans: [] },
}

export const Error: Story = {
  args: { state: 'error', loans: [] },
}

/* Row permutations -------------------------------------------------------- */

export const StreamingRow: Story = {
  name: 'Streaming row visible',
  args: {
    // Streaming rows first, so at least one is on screen without scrolling.
    loans: [...streamingLoans, ...allLoans.filter((loan) => loan.aiReview.status === 'done')],
  },
}

export const FlaggedRow: Story = {
  args: {
    loans: [...flaggedLoans, ...allLoans.filter((loan) => !isFlagged(loan))],
  },
}

/* Selection --------------------------------------------------------------- */

export const ThreeRowsSelected: Story = {
  name: '3 rows selected with bulk bar',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const rows = canvas.getAllByRole('row').slice(1, 4)

    for (const row of rows) {
      await userEvent.click(within(row).getByRole('checkbox'))
    }

    await expect(canvas.getByRole('toolbar', { name: 'Bulk actions' })).toBeInTheDocument()
    await expect(canvas.getByText('3 selected')).toBeInTheDocument()
  },
}
