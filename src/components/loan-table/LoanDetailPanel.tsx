import { useCallback, useId, useState } from 'react'
import { XIcon } from 'lucide-react'
import type { Loan, Stage } from '@/data/loans'
import { confidenceLabel, formatAmount, formatRate, formatUpdatedAt } from './format'
import { ScoreMeter } from './ScoreMeter'
import { nextStage } from './stage'
import { useFocusTrap } from './use-focus-trap'

export interface LoanDetailPanelProps {
  loan: Loan
  /** Current stage, which may already have been advanced from this panel. */
  stage: Stage
  state: 'open' | 'closed'
  onClose: () => void
  onAccept: (loan: Loan) => void
  onOverride?: (loan: Loan, reason: string) => void
}

export function LoanDetailPanel({
  loan,
  stage,
  state,
  onClose,
  onAccept,
  onOverride,
}: LoanDetailPanelProps) {
  const titleId = useId()
  const reasonId = useId()
  const reviewId = useId()

  const [overriding, setOverriding] = useState(false)
  const [reason, setReason] = useState('')

  const panelRef = useFocusTrap<HTMLDivElement>(state === 'open', onClose)

  const handleOverride = useCallback(() => {
    setOverriding((current) => !current)
  }, [])

  const advance = nextStage(stage)

  const metadata: { label: string; value: string }[] = [
    { label: 'Amount', value: formatAmount(loan.amount) },
    { label: 'Rate', value: formatRate(loan.rate) },
    { label: 'Stage', value: stage },
    { label: 'Officer', value: loan.officer },
    { label: 'Updated', value: formatUpdatedAt(loan.updatedAt) },
  ]

  return (
    <>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-state={state}
        tabIndex={-1}
        className="lt-panel"
      >
        <button
          type="button"
          className="lt-panel-close"
          aria-label="Close panel"
          onClick={onClose}
        >
          <XIcon aria-hidden="true" />
        </button>

        <div className="lt-panel-head">
          <h2 id={titleId} className="lt-panel-title">
            {loan.borrower}
          </h2>
          <span className="lt-id">{loan.id}</span>
        </div>

        <dl className="lt-panel-meta">
          {metadata.map((entry) => (
            <div key={entry.label} className="lt-panel-pair">
              <dt className="lt-panel-label">{entry.label}</dt>
              <dd className="lt-panel-value">{entry.value}</dd>
            </div>
          ))}
        </dl>

        <section className="lt-panel-section" aria-labelledby={reviewId}>
          <h3 id={reviewId} className="lt-panel-label">
            AI review
          </h3>
          <p className="lt-panel-score">
            {loan.aiReview.score}
            <span className="lt-panel-confidence">, {confidenceLabel(loan.aiReview.score)}</span>
          </p>
          <ScoreMeter score={loan.aiReview.score} className="lt-panel-meter" />
          <p className="lt-panel-finding">{loan.aiReview.finding}</p>
        </section>

        <div className="lt-panel-section">
          <div className="lt-panel-actions">
            <button
              type="button"
              className="lt-btn lt-btn--primary"
              disabled={advance === null}
              onClick={() => onAccept(loan)}
            >
              Accept
            </button>
            <button
              type="button"
              className="lt-btn lt-btn--secondary"
              aria-expanded={overriding}
              aria-controls={reasonId}
              onClick={handleOverride}
            >
              Override
            </button>
          </div>

          {overriding ? (
            <div className="lt-panel-reason">
              <label className="lt-panel-label" htmlFor={reasonId}>
                Override reason
              </label>
              <textarea
                id={reasonId}
                className="lt-textarea"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                onBlur={() => onOverride?.(loan, reason)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
