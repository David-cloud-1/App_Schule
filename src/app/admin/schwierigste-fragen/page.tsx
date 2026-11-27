import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { DifficultQuestions } from '@/components/admin/difficult-questions'

export default function SchwierigsteFragenPage() {
  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6">
      <AdminPageHeader
        title="Schwierigste Fragen"
        description="Hier siehst du ohne Namen, welche Themen und Fragen den Azubis insgesamt am schwersten fallen."
      />
      <DifficultQuestions />
    </div>
  )
}
