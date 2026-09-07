import { useCallback, useId, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { OFFICERS, STAGES, isFlagged, type Loan } from '@/data/loans'
import { useSelection } from './use-selection'
import {
  bulkActionBarVariants,
  loanRowVariants,
  resolveRowState,
  stageBadgeVariants,
  type Density,
} from './variants'

export type LoanTableState = 'ready' | 'loading' | 'empty' | 'error'

export type BulkAction = 'assign' | 'advance' | 'export'

export interface LoanTableProps {
  loans: Loan[]
  density?: Density
  state?: LoanTableState
  onRetry?: () => void
  onOpen?: (loan: Loan) => void
  onBulkAction?: (action: BulkAction, loanIds: string[]) => void
}

type SortKey = 'borrower' | 'amount' | 'rate' | 'stage' | 'officer' | 'updatedAt' | 'aiReview'
type SortDirection = 'asc' | 'desc'

interface Column {
  key: SortKey
  label: string
}

const COLUMNS: Column[] = [
  { key: 'borrower', label: 'Borrower' },
  { key: 'amount', label: 'Amount' },
  { key: 'rate', label: 'Rate' },
  { key: 'stage', label: 'Stage' },
  { key: 'officer', label: 'Officer' },
  { key: 'updatedAt', label: 'Updated' },
  { key: 'aiReview', label: 'AI review' },
]

/** Header cell count, including the leading checkbox column. */
const COLUMN_COUNT = COLUMNS.length + 1

const SKELETON_ROW_COUNT = 8

const ALL = '__all__'

const BULK_ACTIONS: { action: BulkAction; label: string }[] = [
  { action: 'assign', label: 'Assign officer' },
  { action: 'advance', label: 'Advance stage' },
  { action: 'export', label: 'Export' },
]

function compare(a: Loan, b: Loan, key: SortKey): number {
  switch (key) {
    case 'amount':
      return a.amount - b.amount
    case 'rate':
      return a.rate - b.rate
    case 'updatedAt':
      return Date.parse(a.updatedAt) - Date.parse(b.updatedAt)
    case 'stage':
      return STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage)
    case 'aiReview':
      return a.aiReview.score - b.aiReview.score
    default:
      return a[key].localeCompare(b[key])
  }
}

function getLoanId(loan: Loan): string {
  return loan.id
}

export function LoanTable({
  loans,
  density = 'comfortable',
  state = 'ready',
  onRetry,
  onOpen,
  onBulkAction,
}: LoanTableProps) {
  const headingId = useId()
  const searchId = useId()

  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<string>(ALL)
  const [officerFilter, setOfficerFilter] = useState<string>(ALL)
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const hasFilters = query.trim() !== '' || stageFilter !== ALL || officerFilter !== ALL

  const visibleLoans = useMemo(() => {
    const needle = query.trim().toLowerCase()

    const filtered = loans.filter((loan) => {
      if (needle && !loan.borrower.toLowerCase().includes(needle)) return false
      if (stageFilter !== ALL && loan.stage !== stageFilter) return false
      if (officerFilter !== ALL && loan.officer !== officerFilter) return false
      return true
    })

    const direction = sortDirection === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => compare(a, b, sortKey) * direction)
  }, [loans, query, stageFilter, officerFilter, sortKey, sortDirection])

  const selection = useSelection<Loan>({
    items: visibleLoans,
    getId: getLoanId,
    onOpen,
  })

  const { selectedIds, selectedCount, clearSelection, selectAll, toggle, getRowProps } = selection

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortDirection('asc')
      }
    },
    [sortKey],
  )

  const clearFilters = useCallback(() => {
    setQuery('')
    setStageFilter(ALL)
    setOfficerFilter(ALL)
  }, [])

  const allVisibleSelected =
    visibleLoans.length > 0 && visibleLoans.every((loan) => selectedIds.has(loan.id))
  const someVisibleSelected = visibleLoans.some((loan) => selectedIds.has(loan.id))

  const showEmpty = state === 'empty' || (state === 'ready' && visibleLoans.length === 0)
  const bodyState: LoanTableState = state === 'ready' && showEmpty ? 'empty' : state

  const emptyReason =
    state === 'ready' && hasFilters
      ? 'No loans match the current filters.'
      : 'No loans are in the pipeline yet.'

  const rowCount = bodyState === 'ready' ? visibleLoans.length + 1 : 1

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="sr-only">
        Loan pipeline
      </h2>

      <div role="search" className="flex flex-wrap items-center gap-2">
        <label htmlFor={searchId} className="sr-only">
          Search borrowers
        </label>
        <Input
          id={searchId}
          type="search"
          value={query}
          placeholder="Search borrower"
          onChange={(event) => setQuery(event.target.value)}
        />

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger aria-label="Filter by stage">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All stages</SelectItem>
            {STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={officerFilter} onValueChange={setOfficerFilter}>
          <SelectTrigger aria-label="Filter by officer">
            <SelectValue placeholder="All officers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All officers</SelectItem>
            {OFFICERS.map((officer) => (
              <SelectItem key={officer} value={officer}>
                {officer}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCount > 0 ? (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          data-testid="bulk-action-bar"
          className={bulkActionBarVariants({ density })}
        >
          <span aria-live="polite">{selectedCount} selected</span>
          {BULK_ACTIONS.map(({ action, label }) => (
            <Button
              key={action}
              type="button"
              onClick={() => onBulkAction?.(action, [...selectedIds])}
            >
              {label}
            </Button>
          ))}
          <Button type="button" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      ) : null}

      <Table
        role="grid"
        aria-labelledby={headingId}
        aria-rowcount={rowCount}
        aria-busy={bodyState === 'loading' || undefined}
      >
        <TableHeader>
          <TableRow aria-rowindex={1}>
            <TableHead role="columnheader">
              <Checkbox
                aria-label="Select all rows"
                checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                disabled={bodyState !== 'ready'}
                onCheckedChange={(checked) => (checked ? selectAll() : clearSelection())}
              />
            </TableHead>
            {COLUMNS.map((column) => (
              <TableHead
                key={column.key}
                role="columnheader"
                aria-sort={
                  sortKey === column.key
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <Button type="button" onClick={() => toggleSort(column.key)}>
                  {column.label}
                </Button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {bodyState === 'loading'
            ? Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                <TableRow
                  key={`skeleton-${index}`}
                  aria-rowindex={index + 2}
                  className={loanRowVariants({ density })}
                >
                  {Array.from({ length: COLUMN_COUNT }, (_, cellIndex) => (
                    <TableCell key={cellIndex} role="gridcell">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}

          {bodyState === 'error' ? (
            <TableRow aria-rowindex={2}>
              <TableCell role="gridcell" colSpan={COLUMN_COUNT}>
                <div role="alert">
                  <p>Something went wrong loading the pipeline.</p>
                  <Button type="button" onClick={onRetry}>
                    Retry
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : null}

          {bodyState === 'empty' ? (
            <TableRow aria-rowindex={2}>
              <TableCell role="gridcell" colSpan={COLUMN_COUNT}>
                <div>
                  <p>{emptyReason}</p>
                  {hasFilters ? (
                    <Button type="button" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button type="button" onClick={onRetry}>
                      Refresh pipeline
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : null}

          {bodyState === 'ready'
            ? visibleLoans.map((loan, index) => {
                const selected = selectedIds.has(loan.id)
                const flagged = isFlagged(loan)
                const streaming = loan.aiReview.status === 'streaming'

                return (
                  <TableRow
                    key={loan.id}
                    {...getRowProps(loan, index)}
                    aria-rowindex={index + 2}
                    data-state={selected ? 'selected' : undefined}
                    data-flagged={flagged ? '' : undefined}
                    className={cn(
                      loanRowVariants({
                        density,
                        state: resolveRowState({ selected, flagged }),
                      }),
                    )}
                    onDoubleClick={() => onOpen?.(loan)}
                  >
                    <TableCell role="gridcell">
                      <Checkbox
                        aria-label={`Select ${loan.borrower}`}
                        checked={selected}
                        onCheckedChange={() => toggle(loan.id)}
                      />
                    </TableCell>
                    <TableCell role="gridcell">{loan.borrower}</TableCell>
                    <TableCell role="gridcell">{formatAmount(loan.amount)}</TableCell>
                    <TableCell role="gridcell">{formatRate(loan.rate)}</TableCell>
                    <TableCell role="gridcell">
                      <Badge className={stageBadgeVariants({ stage: loan.stage })}>
                        {loan.stage}
                      </Badge>
                    </TableCell>
                    <TableCell role="gridcell">{loan.officer}</TableCell>
                    <TableCell role="gridcell">
                      <time dateTime={loan.updatedAt}>{formatUpdatedAt(loan.updatedAt)}</time>
                    </TableCell>
                    <TableCell role="gridcell" data-streaming={streaming ? '' : undefined}>
                      {streaming ? (
                        <span aria-live="polite">Analyzing…</span>
                      ) : (
                        <span>
                          {loan.aiReview.score} — {loan.aiReview.finding}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            : null}
        </TableBody>
      </Table>
    </section>
  )
}

const amountFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

function formatAmount(amount: number): string {
  return amountFormatter.format(amount)
}

function formatRate(rate: number): string {
  return `${rate.toFixed(2)}%`
}

function formatUpdatedAt(iso: string): string {
  return dateFormatter.format(new Date(iso))
}
