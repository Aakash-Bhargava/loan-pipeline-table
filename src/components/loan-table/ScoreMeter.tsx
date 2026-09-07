import { cn } from '@/lib/utils'

export interface ScoreMeterProps {
  /** 0-100. */
  score: number
  className?: string
}

/**
 * The score bar. Decorative by design: the number beside it carries the value,
 * so the bar is hidden from assistive tech rather than repeating it.
 */
export function ScoreMeter({ score, className }: ScoreMeterProps) {
  return (
    <span aria-hidden="true" className={cn('lt-meter', className)}>
      <span className="lt-meter-fill" style={{ width: `${score}%` }} />
    </span>
  )
}
