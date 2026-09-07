import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { OFFICERS, STAGES, isFlagged, type Loan, type Stage } from '@/data/loans'
import { formatAmount, formatRate, formatUpdatedAt } from './format'
import { LoanDetailPanel } from './LoanDetailPanel'
import { PipelineSummary } from './PipelineSummary'
import { BULK_EXIT_MS, PANEL_EXIT_MS } from './motion'
import { ScoreMeter } from './ScoreMeter'
import { nextStage } from './stage'
import { StageBadge } from './StageBadge'
import { usePresence } from './use-presence'
import { useSelection } from './use-selection'
import {
  bulkActionBarVariants,
  cellVariants,
  headVariants,
  loanRowVariants,
  resolveRowState,
  type ColumnKey,
  type Density,
} from './variants'

export type LoanTableState = 'ready' | 'loading' | 'empty' | 'error'

export type BulkAction = 'assign' | 'advance' | 'export'

export interface LoanTableProps {
  loans: Loan[]
  /** Accessible name for the grid. Distinguishes two tables on one page. */
  title?: string
  density?: Density
  state?: LoanTableState
  onRetry?: () => void
  onOpen?: (loan: Loan) => void
  onBulkAction?: (action: BulkAction, loanIds: string[]) => void
}

type SortKey = ColumnKey
type SortDirection = 'asc' | 'desc'

interface Column {
  key: SortKey
  label: string
  /** Mono and tabular: numerals, ids, dates, rates. */
  numeric: boolean
  /** Skeleton width, as a share of the column, matching typical content. */
  skeleton: string
}

const COLUMNS: Column[] = [
  { key: 'borrower', label: 'Borrower', numeric: false, skeleton: '70%' },
  { key: 'amount', label: 'Amount', numeric: true, skeleton: '60%' },
  { key: 'rate', label: 'Rate', numeric: true, skeleton: '50%' },
  { key: 'stage', label: 'Stage', numeric: false, skeleton: '65%' },
  { key: 'officer', label: 'Officer', numeric: false, skeleton: '80%' },
  { key: 'updatedAt', label: 'Updated', numeric: true, skeleton: '45%' },
  { key: 'score', label: 'Score', numeric: true, skeleton: '70%' },
  { key: 'finding', label: 'Finding', numeric: false, skeleton: '90%' },
]

/** Header cell count, including the leading checkbox column. */
const COLUMN_COUNT = COLUMNS.length + 1

const SKELETON_ROW_COUNT = 8

const ALL = '__all__'

/* One primary action, then supporting ones. Advancing the stage is what the
   pipeline is for; Assign and Export support it rather than compete with it. */
const BULK_ACTIONS: { action: BulkAction; label: string; primary?: boolean }[] = [
  { action: 'advance', label: 'Advance stage', primary: true },
  { action: 'assign', label: 'Assign' },
  { action: 'export', label: 'Export' },
]

const SORT_GLYPH: Record<SortDirection, string> = { asc: '↑', desc: '↓' }

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
    case 'score':
      return a.aiReview.score - b.aiReview.score
    case 'finding':
      return a.aiReview.finding.localeCompare(b.aiReview.finding)
    default:
      return a[key].localeCompare(b[key])
  }
}

function getLoanId(loan: Loan): string {
  return loan.id
}

export function LoanTable({
  loans,
  title = 'Loan pipeline',
  density = 'comfortable',
  state = 'ready',
  onRetry,
  onOpen,
  onBulkAction,
}: LoanTableProps) {
  const searchId = useId()

  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<string>(ALL)
  const [officerFilter, setOfficerFilter] = useState<string>(ALL)
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  /** Stages advanced from the detail panel, keyed by loan id. */
  const [stageOverrides, setStageOverrides] = useState<Record<string, Stage>>({})

  const [panelLoanId, setPanelLoanId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const openerRef = useRef<HTMLElement | null>(null)

  const hasFilters = query.trim() !== '' || stageFilter !== ALL || officerFilter !== ALL

  /** The loans as the table sees them, with any accepted advance applied. */
  const effectiveLoans = useMemo(
    () =>
      loans.map((loan) => {
        const override = stageOverrides[loan.id]
        return override === undefined ? loan : { ...loan, stage: override }
      }),
    [loans, stageOverrides],
  )

  const visibleLoans = useMemo(() => {
    const needle = query.trim().toLowerCase()

    const filtered = effectiveLoans.filter((loan) => {
      if (needle && !loan.borrower.toLowerCase().includes(needle)) return false
      if (stageFilter !== ALL && loan.stage !== stageFilter) return false
      if (officerFilter !== ALL && loan.officer !== officerFilter) return false
      return true
    })

    const direction = sortDirection === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => compare(a, b, sortKey) * direction)
  }, [effectiveLoans, query, stageFilter, officerFilter, sortKey, sortDirection])

  const openPanel = useCallback(
    (loan: Loan, opener?: HTMLElement | null) => {
      openerRef.current = opener ?? (document.activeElement as HTMLElement | null)
      setPanelLoanId(loan.id)
      setPanelOpen(true)
      onOpen?.(loan)
    },
    [onOpen],
  )

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    // Hand focus back to the row that opened the panel.
    openerRef.current?.focus()
  }, [])

  const handleAccept = useCallback((loan: Loan) => {
    setStageOverrides((current) => {
      const advance = nextStage(current[loan.id] ?? loan.stage)
      return advance === null ? current : { ...current, [loan.id]: advance }
    })
  }, [])

  const selection = useSelection<Loan>({
    items: visibleLoans,
    getId: getLoanId,
    onOpen: openPanel,
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
      : 'Loans appear here once an application is submitted.'

  const rowCount =
    bodyState === 'ready'
      ? visibleLoans.length + 1
      : bodyState === 'loading'
        ? SKELETON_ROW_COUNT + 1
        : 2

  /* Bulk bar. Kept mounted through its exit transition, holding the count it
     had when the last row was deselected so the text cannot flicker to zero. */
  const bulk = usePresence(selectedCount > 0, BULK_EXIT_MS)
  const lastCountRef = useRef(selectedCount)
  useEffect(() => {
    if (selectedCount > 0) lastCountRef.current = selectedCount
  }, [selectedCount])
  const bulkCount = selectedCount > 0 ? selectedCount : lastCountRef.current

  /* Detail panel, same treatment: the loan stays addressable while it leaves. */
  const panel = usePresence(panelOpen, PANEL_EXIT_MS)
  const panelLoan = panelLoanId === null ? null : visibleLoans.find((l) => l.id === panelLoanId)

  const handleRowClick = useCallback(
    (loan: Loan) => (event: MouseEvent<HTMLTableRowElement>) => {
      // The checkbox cell selects; it does not open.
      if ((event.target as HTMLElement).closest('[data-no-open]')) return
      openPanel(loan, event.currentTarget)
    },
    [openPanel],
  )

  return (
    <div className="lt" data-panel-open={panel.present ? 'true' : undefined}>
      <PipelineSummary loans={visibleLoans} totalCount={loans.length} title={title} />

      <div role="group" aria-label={`${title} filters`} className="lt-toolbar">
        <label htmlFor={searchId} className="sr-only">
          Search borrowers
        </label>
        <Input
          id={searchId}
          type="search"
          value={query}
          placeholder="Search borrower"
          className="lt-control lt-search"
          onChange={(event) => setQuery(event.target.value)}
        />

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger aria-label="Filter by stage" className="lt-control">
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
          <SelectTrigger aria-label="Filter by officer" className="lt-control">
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

      <div className="lt-surface">
        <Table
          role="grid"
          aria-label={title}
          aria-rowcount={rowCount}
          aria-busy={bodyState === 'loading' || undefined}
          className="lt-table"
        >
          <TableHeader>
            <TableRow aria-rowindex={1} className={loanRowVariants({ density })}>
              <TableHead
                role="columnheader"
                className={cn(headVariants(), 'lt-head--check', 'lt-col--check')}
              >
                <Checkbox
                  aria-label="Select all rows"
                  checked={
                    allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false
                  }
                  disabled={bodyState !== 'ready'}
                  onCheckedChange={(checked) => (checked ? selectAll() : clearSelection())}
                />
              </TableHead>
              {COLUMNS.map((column) => {
                const sorted = sortKey === column.key
                return (
                  <TableHead
                    key={column.key}
                    role="columnheader"
                    aria-sort={
                      sorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                    className={cn(
                      headVariants({ column: column.key }),
                      `lt-col--${column.key}`,
                      column.key === 'finding' && 'lt-head--finding',
                    )}
                  >
                    <button
                      type="button"
                      className="lt-sort"
                      data-sorted={sorted ? 'true' : 'false'}
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.label}
                      {/* Always rendered: the header cannot re-flow when the
                          sort moves, and hovering an unsorted column reveals
                          that it can be sorted at all. */}
                      <span aria-hidden="true" className="lt-sort-glyph">
                        {sorted ? SORT_GLYPH[sortDirection] : SORT_GLYPH.asc}
                      </span>
                    </button>
                  </TableHead>
                )
              })}
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
                    <TableCell role="gridcell" className={cn(cellVariants(), 'lt-cell--check')}>
                      <span className="lt-skeleton" style={{ width: '100%' }} />
                    </TableCell>
                    {COLUMNS.map((column) => (
                      <TableCell
                        key={column.key}
                        role="gridcell"
                        className={cellVariants({ column: column.key })}
                      >
                        <span className="lt-skeleton" style={{ width: column.skeleton }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}

            {bodyState === 'error' ? (
              <TableRow aria-rowindex={2} className={loanRowVariants({ density })}>
                <TableCell role="gridcell" colSpan={COLUMN_COUNT} className={cellVariants()}>
                  <div role="alert" className="lt-state">
                    <p className="lt-state-title lt-state-title--error">
                      The pipeline could not be loaded.
                    </p>
                    <p className="lt-state-reason">
                      The request did not come back. Nothing has been changed.
                    </p>
                    <button
                      type="button"
                      className="lt-btn lt-btn--primary lt-state-action"
                      onClick={onRetry}
                    >
                      Retry
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}

            {bodyState === 'empty' ? (
              <TableRow aria-rowindex={2} className={loanRowVariants({ density })}>
                <TableCell role="gridcell" colSpan={COLUMN_COUNT} className={cellVariants()}>
                  <div className="lt-state">
                    <p className="lt-state-title">No loans to show</p>
                    <p className="lt-state-reason">{emptyReason}</p>
                    {hasFilters ? (
                      <button
                        type="button"
                        className="lt-btn lt-btn--primary lt-state-action"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="lt-btn lt-btn--primary lt-state-action"
                        onClick={onRetry}
                      >
                        Refresh pipeline
                      </button>
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
                      data-flagged={flagged ? '' : undefined}
                      className={cn(
                        loanRowVariants({
                          density,
                          state: resolveRowState({ selected, flagged }),
                        }),
                        'lt-row--body',
                      )}
                      onClick={handleRowClick(loan)}
                    >
                      <TableCell
                        role="gridcell"
                        data-no-open=""
                        className={cn(cellVariants(), 'lt-cell--check')}
                      >
                        <Checkbox
                          aria-label={`Select ${loan.borrower}`}
                          checked={selected}
                          onCheckedChange={() => toggle(loan.id)}
                        />
                      </TableCell>

                      <TableCell role="gridcell" className={cellVariants()}>
                        <span className="lt-borrower">
                          {flagged ? (
                            <span
                              role="img"
                              aria-label="Flagged"
                              data-flagged="true"
                              className="lt-flag"
                            />
                          ) : (
                            <span aria-hidden="true" data-flagged="false" className="lt-flag" />
                          )}
                          {loan.borrower}
                        </span>
                      </TableCell>

                      <TableCell
                        role="gridcell"
                        className={cellVariants({ column: 'amount', numeric: true })}
                      >
                        {formatAmount(loan.amount)}
                      </TableCell>

                      <TableCell
                        role="gridcell"
                        className={cellVariants({ column: 'rate', numeric: true })}
                      >
                        {formatRate(loan.rate)}
                      </TableCell>

                      <TableCell role="gridcell" className={cellVariants()}>
                        <StageBadge stage={loan.stage} />
                      </TableCell>

                      <TableCell role="gridcell" className={cellVariants()}>
                        {loan.officer}
                      </TableCell>

                      <TableCell
                        role="gridcell"
                        className={cellVariants({ column: 'updatedAt', numeric: true })}
                      >
                        <time dateTime={loan.updatedAt}>{formatUpdatedAt(loan.updatedAt)}</time>
                      </TableCell>

                      <TableCell
                        role="gridcell"
                        className={cellVariants({ column: 'score', numeric: true })}
                        data-streaming={streaming ? '' : undefined}
                      >
                        <span
                          className="lt-review-score"
                          data-status={loan.aiReview.status}
                          aria-hidden={streaming || undefined}
                        >
                          <span className="lt-review-value">{loan.aiReview.score}</span>
                          <ScoreMeter score={loan.aiReview.score} />
                        </span>
                      </TableCell>

                      <TableCell
                        role="gridcell"
                        className={cn(cellVariants({ column: 'finding' }), 'lt-cell--finding')}
                        data-streaming={streaming ? '' : undefined}
                      >
                        <span className="lt-finding-line">
                          <span className="lt-finding" title={loan.aiReview.finding}>
                            {loan.aiReview.finding}
                          </span>
                          {streaming ? (
                            <span aria-hidden="true" className="lt-caret">
                              ▌
                            </span>
                          ) : null}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })
              : null}
          </TableBody>
        </Table>

        {bulk.present ? (
          <div
            role="toolbar"
            aria-label="Bulk actions"
            data-testid="bulk-action-bar"
            data-state={bulk.state}
            inert={bulk.state === 'closed' || undefined}
            className={bulkActionBarVariants({ density })}
          >
            <span aria-live="polite" className="lt-bulkbar-count">
              {bulkCount} selected
            </span>
            {BULK_ACTIONS.map(({ action, label, primary }) => (
              <button
                key={action}
                type="button"
                className={cn('lt-btn', primary && 'lt-btn--primary')}
                onClick={() => onBulkAction?.(action, [...selectedIds])}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className="lt-btn lt-btn--quiet lt-bulkbar-end"
              onClick={clearSelection}
            >
              Clear
            </button>
          </div>
        ) : null}
      </div>

      {panel.present && panelLoan ? (
        <LoanDetailPanel
          loan={panelLoan}
          stage={panelLoan.stage}
          state={panel.state}
          onClose={closePanel}
          onAccept={handleAccept}
        />
      ) : null}
    </div>
  )
}
