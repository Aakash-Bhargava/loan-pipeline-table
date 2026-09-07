import { STAGES, type Stage } from '@/data/loans'

/** The next stage in the pipeline, or null once a loan is funded. */
export function nextStage(stage: Stage): Stage | null {
  const index = STAGES.indexOf(stage)
  return index < STAGES.length - 1 ? STAGES[index + 1] : null
}
