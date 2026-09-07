import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Stage } from '@/data/loans'
import { STAGE_CROSSFADE_MS } from './motion'
import { stageBadgeVariants } from './variants'

export interface StageBadgeProps {
  stage: Stage
}

/**
 * A stage badge that crossfades when the stage changes underneath it.
 *
 * The incoming badge is rendered normally; the outgoing one is stacked over it
 * in the same grid cell and dissolves away. Both sit in one grid area, so the
 * swap cannot shift the row. The dissolve itself is a CSS transition off
 * @starting-style; the timer here only decides when the spent badge leaves the
 * DOM.
 */
export function StageBadge({ stage }: StageBadgeProps) {
  const [outgoing, setOutgoing] = useState<Stage | null>(null)
  const previous = useRef(stage)

  useEffect(() => {
    if (previous.current === stage) return
    const from = previous.current
    previous.current = stage
    setOutgoing(from)

    const timer = setTimeout(() => setOutgoing(null), STAGE_CROSSFADE_MS)
    return () => clearTimeout(timer)
  }, [stage])

  return (
    <span className="lt-badge-slot" data-stage={stage}>
      <span className={stageBadgeVariants({ stage })}>{stage}</span>
      {outgoing === null ? null : (
        <span
          key={outgoing}
          aria-hidden="true"
          className={cn(stageBadgeVariants({ stage: outgoing }), 'lt-badge--outgoing')}
        >
          {outgoing}
        </span>
      )}
    </span>
  )
}
