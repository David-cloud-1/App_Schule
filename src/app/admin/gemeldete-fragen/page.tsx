import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { QuestionReportsInbox } from '@/components/admin/question-reports-inbox'

export default function GemeldeteFragenPage() {
  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6">
      <AdminPageHeader
        title="Gemeldete Fragen"
        description="Azubis melden Fragen, die ihnen fehlerhaft vorkommen. Prüfe sie, korrigiere die Frage und schließe die Meldung ab."
      />
      <QuestionReportsInbox />
    </div>
  )
}
