import { cva, type VariantProps } from 'class-variance-authority'

/**
 * Structural variants only. Every className here is intentionally minimal —
 * the visual pass happens separately.
 */

export const loanRowVariants = cva('', {
  variants: {
    density: {
      compact: 'h-8',
      comfortable: 'h-12',
    },
    state: {
      default: '',
      selected: '',
      flagged: '',
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

export const stageBadgeVariants = cva('', {
  variants: {
    stage: {
      Application: '',
      Processing: '',
      Underwriting: '',
      Closing: '',
      Funded: '',
    },
  },
  defaultVariants: {
    stage: 'Application',
  },
})

export type StageBadgeVariants = VariantProps<typeof stageBadgeVariants>

export const bulkActionBarVariants = cva('flex items-center gap-2', {
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

/** Resolve the mutually exclusive row state. Selection wins over flagged. */
export function resolveRowState(options: {
  selected: boolean
  flagged: boolean
}): RowState {
  if (options.selected) return 'selected'
  if (options.flagged) return 'flagged'
  return 'default'
}
