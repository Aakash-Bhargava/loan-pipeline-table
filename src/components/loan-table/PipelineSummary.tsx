import { useMemo } from 'react'
import type { Loan } from '@/data/loans'
import { isFlagged } from '@/data/loans'
import { formatCompactAmount, formatRate, formatUpdatedAt } from './format'

export interface PipelineSummaryProps {
  /** The rows currently in view, so the figures answer to the filters. */
  loans: Loan[]
  /** Everything the table was handed, for the "of N" in the meta line. */
  totalCount: number
  /** Scopes the group's name, so two tables on one page stay distinguishable. */
  title: string
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * A KPI row, not a chart: four headline numbers do not need axes. The average
 * score carries a meter because it is the one figure that is a ratio against a
 * fixed limit; the others are magnitudes and read fine as figures alone.
 */
export function PipelineSummary({ loans, totalCount, title }: PipelineSummaryProps) {
  const stats = useMemo(() => {
    const settled = loans.filter((loan) => loan.aiReview.status === 'done')
    const latest = loans.reduce<string | null>(
      (newest, loan) => (newest === null || loan.updatedAt > newest ? loan.updatedAt : newest),
      null,
    )
    return {
      volume: loans.reduce((sum, loan) => sum + loan.amount, 0),
      rate: mean(loans.map((loan) => loan.rate)),
      score: Math.round(mean(settled.map((loan) => loan.aiReview.score))),
      flagged: loans.filter(isFlagged).length,
      officers: new Set(loans.map((loan) => loan.officer)).size,
      latest,
    }
  }, [loans])

  const filtered = loans.length !== totalCount
  const countLabel = filtered
    ? `${loans.length} of ${totalCount} loans`
    : `${totalCount} ${totalCount === 1 ? 'loan' : 'loans'}`

  const meta = [
    countLabel,
    `${stats.officers} ${stats.officers === 1 ? 'officer' : 'officers'}`,
    stats.latest ? `updated ${formatUpdatedAt(stats.latest)}` : null,
  ].filter((part): part is string => part !== null)

  return (
    <div role="group" aria-label={`${title} summary`} className="lt-summary">
      <dl className="lt-summary-tiles">
        <div className="lt-stat">
          <dt className="lt-stat-label">Pipeline volume</dt>
          <dd className="lt-stat-value">{formatCompactAmount(stats.volume)}</dd>
        </div>

        <div className="lt-stat">
          <dt className="lt-stat-label">Average rate</dt>
          <dd className="lt-stat-value">{formatRate(stats.rate)}</dd>
        </div>

        <div className="lt-stat">
          <dt className="lt-stat-label">Average score</dt>
          <dd className="lt-stat-value">
            {stats.score}
            <span aria-hidden="true" className="lt-stat-meter">
              <span className="lt-stat-meter-fill" style={{ width: `${stats.score}%` }} />
            </span>
          </dd>
        </div>

        <div className="lt-stat">
          <dt className="lt-stat-label">Flagged</dt>
          <dd className="lt-stat-value">
            {stats.flagged > 0 ? <span aria-hidden="true" className="lt-stat-mark" /> : null}
            {stats.flagged}
          </dd>
        </div>
      </dl>

      <p className="lt-summary-meta">{meta.join(' · ')}</p>
    </div>
  )
}
