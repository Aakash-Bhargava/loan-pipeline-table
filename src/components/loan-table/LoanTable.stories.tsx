import { useEffect, useMemo, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { generateLoans, isFlagged, type Loan } from '@/data/loans'
import { LoanTable } from './LoanTable'

const allLoans = generateLoans()

/** The two rows the generator leaves mid-review. */
const streamingLoans = allLoans.filter((loan) => loan.aiReview.status === 'streaming')
const settledLoans = allLoans.filter((loan) => loan.aiReview.status === 'done')
const flaggedLoans = allLoans.filter(isFlagged)

/** One character every 40ms, per the streaming contract. */
const STREAM_INTERVAL_MS = 40

/**
 * Types the finding of every streaming row out one character at a time, then
 * flips the row to done so the score and bar fade in. The table itself renders
 * whatever text it is handed; the arrival is simulated here, in the story.
 */
function useStreamingLoans(source: Loan[]): Loan[] {
  const targets = useMemo(
    () =>
      new Map(
        source
          .filter((loan) => loan.aiReview.status === 'streaming')
          .map((loan) => [loan.id, loan.aiReview.finding] as const),
      ),
    [source],
  )

  const [rows, setRows] = useState<Loan[]>(() =>
    source.map((loan) =>
      loan.aiReview.status === 'streaming'
        ? { ...loan, aiReview: { ...loan.aiReview, finding: '' } }
        : loan,
    ),
  )

  useEffect(() => {
    const timer = setInterval(() => {
      setRows((current) => {
        let changed = false
        const next = current.map((loan) => {
          if (loan.aiReview.status !== 'streaming') return loan
          const target = targets.get(loan.id) ?? ''
          const shown = loan.aiReview.finding
          changed = true
          if (shown.length >= target.length) {
            return { ...loan, aiReview: { ...loan.aiReview, status: 'done' as const } }
          }
          return {
            ...loan,
            aiReview: { ...loan.aiReview, finding: target.slice(0, shown.length + 1) },
          }
        })
        return changed ? next : current
      })
    }, STREAM_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [targets])

  return rows
}

function StreamingTable(props: Parameters<typeof LoanTable>[0]) {
  const rows = useStreamingLoans(props.loans)
  return <LoanTable {...props} loans={rows} />
}

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
    layout: 'padded',
  },
} satisfies Meta<typeof LoanTable>

export default meta

type Story = StoryObj<typeof meta>

/* Density ----------------------------------------------------------------- */

export const Comfortable: Story = {
  args: { density: 'comfortable' },
}

export const Compact: Story = {
  args: { density: 'compact' },
}

export const BothDensities: Story = {
  name: 'Both densities side by side',
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--space-12)' }}>
      <LoanTable {...args} title="Comfortable pipeline" density="comfortable" />
      <LoanTable {...args} title="Compact pipeline" density="compact" />
    </div>
  ),
  args: { loans: allLoans.slice(0, 6) },
}

/* States ------------------------------------------------------------------ */

export const Ready: Story = {
  args: { state: 'ready' },
}

export const Loading: Story = {
  args: { state: 'loading' },
}

export const Empty: Story = {
  args: { state: 'empty', loans: [] },
}

export const FilteredEmpty: Story = {
  name: 'Empty, filtered to nothing',
  args: { loans: allLoans },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole('searchbox'), 'zzzzz')
    await expect(await canvas.findByText('No loans match the current filters.')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Clear filters' })).toBeVisible()
  },
}

export const Error: Story = {
  args: { state: 'error', loans: [] },
}

/* Rows -------------------------------------------------------------------- */

export const StreamingRow: Story = {
  name: 'Streaming cell mid-stream',
  render: (args) => <StreamingTable {...args} />,
  args: {
    // Streaming rows first, so both are on screen from the start.
    loans: [...streamingLoans, ...settledLoans.slice(0, 6)],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Catch it mid-stream: some finding text has arrived, the row is not done.
    await waitFor(() => {
      const cell = canvasElement.querySelector('.lt-cell--finding[data-streaming]')
      expect(cell).not.toBeNull()
      expect(cell?.textContent ?? '').not.toHaveLength(0)
    })
    await expect(canvas.getAllByRole('row').length).toBeGreaterThan(1)
  },
}

export const FlaggedRow: Story = {
  name: 'Flagged row',
  args: {
    loans: [...flaggedLoans.slice(0, 3), ...allLoans.filter((loan) => !isFlagged(loan)).slice(0, 5)],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByRole('img', { name: 'Flagged' }).length).toBeGreaterThan(0)
  },
}

/* Selection --------------------------------------------------------------- */

export const ThreeRowsSelected: Story = {
  name: '3 rows selected with bulk bar',
  args: { loans: allLoans.slice(0, 8) },
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

export const FocusOnSelectedRow: Story = {
  name: 'Focus visible on selected row',
  args: { loans: allLoans.slice(0, 8) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const row = canvas.getAllByRole('row')[2]

    row.focus()
    await userEvent.keyboard(' ')

    await expect(row).toHaveAttribute('aria-selected', 'true')
    await expect(row).toHaveFocus()
  },
}

/* Detail panel ------------------------------------------------------------ */

export const PanelWithOverride: Story = {
  name: 'Panel open with Override reason expanded',
  args: { loans: allLoans.slice(0, 8) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getAllByRole('row')[1])

    const panel = await canvas.findByRole('dialog')
    await userEvent.click(within(panel).getByRole('button', { name: 'Override' }))

    await expect(within(panel).getByLabelText('Override reason')).toBeVisible()
  },
}
