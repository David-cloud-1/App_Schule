import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { DifficultQuestions } from '@/components/admin/difficult-questions'

export default function SchwierigsteFragenPage() {
  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6">
      <AdminPageHeader
        title="Schwierigste Fragen"
        description="Welche Themen und Fragen fallen den Azubis insgesamt am schwersten? Ohne Namen, nur Summen."
      />
      <DifficultQuestions />
    </div>
  )
}
