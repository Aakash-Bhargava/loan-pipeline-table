import { LoanTable } from '@/components/loan-table/LoanTable'
import { loans } from '@/data/loans'

export default function App() {
  return (
    <main className="app-shell">
      <LoanTable loans={loans} />
    </main>
  )
}
