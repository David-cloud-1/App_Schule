'use client'

import { Suspense } from 'react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminLoadingState } from '@/components/admin/admin-states'
import { AssessmentWizard } from '@/components/admin/assessment-wizard/assessment-wizard'

/** Nachweis anlegen in drei Schritten (PROJ-133): Was? · Prüfen · Wann und für wen? */
export default function NewAssessmentPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <AdminPageHeader
        title="Nachweis anlegen"
        description="Lege in drei Schritten einen Entwurf an: Fragen wählen, prüfen, Klasse und Zeit festlegen."
        breadcrumb="Nachweis anlegen"
      />
      <Suspense fallback={<AdminLoadingState variant="form" />}>
        <AssessmentWizard />
      </Suspense>
    </div>
  )
}
