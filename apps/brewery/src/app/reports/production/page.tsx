'use client'

import { DashboardLayout } from '@/components/layout'
import { ProductionReport } from '@/components/production'

export default function ProductionReportsPage() {
  return (
    <DashboardLayout title="🏭 წარმოების ანგარიში" breadcrumb="მთავარი / ანგარიშები / წარმოება">
      <ProductionReport showBackLink />
    </DashboardLayout>
  )
}
