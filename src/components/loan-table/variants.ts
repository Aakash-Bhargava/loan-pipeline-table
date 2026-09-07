import { cva, type VariantProps } from 'class-variance-authority'
import type { Stage } from '@/data/loans'

/**
 * Variant definitions for the loan table.
 *
 * These name classes; the values behind them live in src/styles/loan-table.css
 * and resolve to component tokens. No variant here carries a literal length or
 * colour.
 */

export const loanRowVariants = cva('lt-row', {
  variants: {
    density: {
      compact: 'lt-row--compact',
      comfortable: 'lt-row--comfortable',
    },
    state: {
      default: '',
      selected: 'lt-row--selected',
      /* Flagged is carried by a dot on the borrower, never a row wash. */
      flagged: 'lt-row--flagged',
    },
  },
  defaultVariants: {
    density: 'comfortable',
    state: 'default',
  },
})

export type LoanRowVariants = VariantProps<typeof loanRowVariants>
export type Density = NonNullable<LoanRowVariants['density']>
export type RowState = NonNullable<LoanRowVariants['state']>

export const stageBadgeVariants = cva('lt-badge', {
  variants: {
    stage: {
      Application: 'lt-badge--application',
      Processing: 'lt-badge--processing',
      Underwriting: 'lt-badge--underwriting',
      Closing: 'lt-badge--closing',
      Funded: 'lt-badge--funded',
    },
  },
  defaultVariants: {
    stage: 'Application',
  },
})

export type StageBadgeVariants = VariantProps<typeof stageBadgeVariants>

/**
 * The bar is a fixed 44px regardless of table density, so the two densities
 * resolve to the same class. The variant is kept because density is part of
 * the bar's public shape and callers pass it.
 */
export const bulkActionBarVariants = cva('lt-bulkbar', {
  variants: {
    density: {
      compact: '',
      comfortable: '',
    },
  },
  defaultVariants: {
    density: 'comfortable',
  },
})

export type BulkActionBarVariants = VariantProps<typeof bulkActionBarVariants>

/**
 * Column vocabulary and the alignment table. Numbers right, words left: the
 * decision lives here once, so no cell decides its own alignment.
 */
export type ColumnKey =
  | 'borrower'
  | 'amount'
  | 'rate'
  | 'stage'
  | 'officer'
  | 'updatedAt'
  | 'score'
  | 'finding'

const CELL_ALIGN: Record<ColumnKey, string> = {
  borrower: '',
  amount: 'lt-cell--end',
  rate: 'lt-cell--end',
  stage: '',
  officer: '',
  updatedAt: '',
  score: 'lt-cell--end',
  finding: '',
}

const HEAD_ALIGN: Record<ColumnKey, string> = {
  borrower: '',
  amount: 'lt-head--end',
  rate: 'lt-head--end',
  stage: '',
  officer: '',
  updatedAt: '',
  score: 'lt-head--end',
  finding: '',
}

export const cellVariants = cva('lt-cell', {
  variants: {
    column: CELL_ALIGN,
    numeric: {
      true: 'lt-cell--num',
      false: '',
    },
  },
  defaultVariants: {
    numeric: false,
  },
})

export const headVariants = cva('lt-head', {
  variants: {
    column: HEAD_ALIGN,
  },
})

/** Resolve the mutually exclusive row state. Selection wins over flagged. */
export function resolveRowState(options: { selected: boolean; flagged: boolean }): RowState {
  if (options.selected) return 'selected'
  if (options.flagged) return 'flagged'
  return 'default'
}

/** Stage order, used to advance a loan one step from the detail panel. */
export function stageModifier(stage: Stage): string {
  return stageBadgeVariants({ stage })
}
