import { LoanTable } from '@/components/loan-table/LoanTable'
import { loans } from '@/data/loans'

export default function App() {
  return (
    <main>
      <LoanTable loans={loans} />
    </main>
  )
}
