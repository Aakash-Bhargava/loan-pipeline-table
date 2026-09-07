/**
 * Seeded fake data for the loan pipeline table.
 *
 * The generator is deterministic: the same seed always produces the same rows,
 * so stories and tests can rely on stable ids, ordering and values.
 */

export const STAGES = [
  'Application',
  'Processing',
  'Underwriting',
  'Closing',
  'Funded',
] as const

export type Stage = (typeof STAGES)[number]

export const OFFICERS = [
  'Dana Whitfield',
  'Marcus Ortiz',
  'Priya Raghavan',
  'Tomas Lindqvist',
  'Eleanor Boyd',
  'Wesley Nakamura',
] as const

export type Officer = (typeof OFFICERS)[number]

export type AiReviewStatus = 'done' | 'streaming'

export interface AiReview {
  /** 0-100. Higher is healthier. */
  score: number
  /** One sentence describing what the review turned up. */
  finding: string
  status: AiReviewStatus
}

export interface Loan {
  id: string
  borrower: string
  amount: number
  rate: number
  stage: Stage
  officer: Officer
  /** ISO 8601 timestamp. */
  updatedAt: string
  aiReview: AiReview
}

const FIRST_NAMES = [
  'Amara', 'Beatriz', 'Callum', 'Devon', 'Elena', 'Farid', 'Greta', 'Hassan',
  'Imani', 'Jonas', 'Keiko', 'Lucia', 'Mateo', 'Nadia', 'Omar', 'Petra',
  'Quinn', 'Rosalind', 'Silas', 'Tovah', 'Ulises', 'Vera', 'Wendell', 'Ximena',
  'Yusuf', 'Zofia', 'Adaeze', 'Bjorn', 'Cyrus', 'Delphine',
]

const LAST_NAMES = [
  'Achebe', 'Bellweather', 'Castellanos', 'Dunmore', 'Eriksen', 'Fontaine',
  'Grimaldi', 'Hollis', 'Ibarra', 'Jarnigan', 'Kowalski', 'Lindgren',
  'Marchetti', 'Novak', 'Oyelaran', 'Pemberton', 'Quintero', 'Rasmussen',
  'Sandoval', 'Thackeray', 'Ueda', 'Vasquez', 'Whitlock', 'Xu',
]

const FINDINGS = [
  'Debt-to-income ratio sits just above the program ceiling for this product.',
  'Two months of bank statements are missing from the income packet.',
  'Appraised value came in eleven percent under the contract price.',
  'Employment verification is stale and needs to be re-pulled before closing.',
  'Credit report shows a new tradeline opened after the initial application.',
  'Title commitment lists an unresolved mechanics lien on the subject property.',
  'Reserves comfortably exceed the guideline minimum for this loan size.',
  'Self-employment income was averaged across an incomplete tax year.',
  'Homeowners insurance binder expires before the scheduled funding date.',
  'Gift funds were deposited without an accompanying donor letter.',
  'All conditions have cleared and the file is ready for final review.',
  'Property taxes on the escrow analysis disagree with the county record.',
]

/** Deterministic 32-bit PRNG (mulberry32). */
function createRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(random: () => number, list: readonly T[]): T {
  return list[Math.floor(random() * list.length)]
}

/** Fixed "now" so generated timestamps never drift between runs. */
const BASE_TIME = Date.parse('2026-09-07T15:00:00.000Z')

export const DEFAULT_SEED = 20260907

/** Row indexes whose AI review is still streaming. */
const STREAMING_INDEXES = [4, 19]

export function generateLoans(count = 40, seed: number = DEFAULT_SEED): Loan[] {
  const random = createRandom(seed)
  const loans: Loan[] = []

  for (let index = 0; index < count; index += 1) {
    const borrower = `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`

    // 120k - 1.45m, rounded to the nearest 500.
    const amount = Math.round((120_000 + random() * 1_330_000) / 500) * 500
    // 5.25% - 8.15%, two decimals.
    const rate = Math.round((5.25 + random() * 2.9) * 100) / 100

    const minutesAgo = Math.floor(random() * 60 * 24 * 21)
    const updatedAt = new Date(BASE_TIME - minutesAgo * 60_000).toISOString()

    const streaming = STREAMING_INDEXES.includes(index)

    loans.push({
      id: `LN-${String(1000 + index)}`,
      borrower,
      amount,
      rate,
      stage: pick(random, STAGES),
      officer: pick(random, OFFICERS),
      updatedAt,
      aiReview: {
        score: Math.floor(random() * 101),
        finding: pick(random, FINDINGS),
        status: streaming ? 'streaming' : 'done',
      },
    })
  }

  return loans
}

/** A loan is flagged when a completed review scored it below this. */
export const FLAG_SCORE_THRESHOLD = 40

export function isFlagged(loan: Loan): boolean {
  return loan.aiReview.status === 'done' && loan.aiReview.score < FLAG_SCORE_THRESHOLD
}

/** The default 40-row fixture used by stories and tests. */
export const loans: Loan[] = generateLoans()
