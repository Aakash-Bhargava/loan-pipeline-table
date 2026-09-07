/** Presentation formatters. Shared by the table and the detail panel. */

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

export function formatAmount(amount: number): string {
  return amountFormatter.format(amount)
}

export function formatRate(rate: number): string {
  return `${rate.toFixed(2)}%`
}

export function formatUpdatedAt(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

const compactAmount = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Auto-compact, per the stat-tile contract: $4.2M rather than $4,238,500. */
export function formatCompactAmount(amount: number): string {
  return compactAmount.format(amount)
}

/** The score in words, so confidence is never carried by a number alone. */
export function confidenceLabel(score: number): string {
  if (score >= 80) return 'high confidence'
  if (score >= 50) return 'moderate confidence'
  return 'low confidence'
}
