'use client'



import { useState } from 'react'

import Link from 'next/link'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, ProgressBar } from '@/components/ui'

import { mockQCTests } from '@/data/qualityData'

import { mockBatches } from '@/data/mockData'

import { formatDate } from '@/lib/utils'



interface BatchQCStatus {

  batchId: string

  batchNumber: string

  recipeName: string

  batchStatus: string

  tankName: string

  totalTests: number

  completedTests: number

  passedTests: number

  warningTests: number

  failedTests: number

  tests: typeof mockQCTests

}



const getQCStatusIcon = (status: BatchQCStatus): string => {

  if (status.failedTests > 0) return '🔴'

  if (status.warningTests > 0 || status.completedTests < status.totalTests) return '🟡'

  return '🟢'

}



export default function BatchesQCPage() {

  const [filterStatus, setFilterStatus] = useState<string>('all')



  // Group tests by batch

  const batchQCStatuses: BatchQCStatus[] = mockBatches.map(batch => {

    const batchTests = mockQCTests.filter(t => t.batchId === batch.id)

    const completedTests = batchTests.filter(t => t.status !== 'pending' && t.status !== 'in_progress').length

    const passedTests = batchTests.filter(t => t.status === 'passed').length

    const warningTests = batchTests.filter(t => t.status === 'warning').length

    const failedTests = batchTests.filter(t => t.status === 'failed').length



    return {

      batchId: batch.id,

      batchNumber: batch.batchNumber,

      recipeName: batch.recipeName,

      batchStatus: batch.status,

      tankName: batch.tankName,

      totalTests: batchTests.length || 6, // Default 6 tests per batch

      completedTests,

      passedTests,

      warningTests,

      failedTests,

      tests: batchTests,

    }

  })



  const filteredBatches = batchQCStatuses.filter(batch => {

    if (filterStatus === 'all') return true

    if (filterStatus === 'active' && (batch.batchStatus === 'fermenting' || batch.batchStatus === 'conditioning')) return true

    if (filterStatus === 'completed' && batch.batchStatus === 'packaged') return true

    return false

  })



  return (

    <DashboardLayout title="📋 პარტიების QC" breadcrumb="მთავარი / ხარისხი / პარტიები">

      {/* Header */}

      <div className="flex justify-between items-center mb-6">

        <Link href="/quality" className="text-sm text-copper-light hover:text-copper transition-colors">

          ← უკან

        </Link>

        <select

          value={filterStatus}

          onChange={(e) => setFilterStatus(e.target.value)}

          className="px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

        >

          <option value="all">ყველა სტატუსი</option>

          <option value="active">მიმდინარე</option>

          <option value="completed">დასრულებული</option>

        </select>

      </div>



      {/* Batches Grid */}

      <div className="grid grid-cols-3 gap-6">

        {filteredBatches.map(batch => {

          const progress = batch.totalTests > 0 ? Math.round((batch.completedTests / batch.totalTests) * 100) : 0

          const statusIcon = getQCStatusIcon(batch)



          return (

            <Card key={batch.batchId} className="cursor-pointer hover:border-copper/50 transition-colors">

              <CardHeader>

                <div className="flex items-center justify-between">

                  <div>

                    <div className="flex items-center gap-2">

                      <span className="text-xl">🍺</span>

                      <span className="font-semibold text-copper-light">{batch.batchNumber}</span>

                    </div>

                    <p className="text-sm text-text-muted mt-1">{batch.recipeName}</p>

                  </div>

                  <span className="text-2xl">{statusIcon}</span>

                </div>

              </CardHeader>

              <CardBody className="space-y-4">

                <div className="text-sm space-y-1">

                  <div>

                    <span className="text-text-muted">სტატუსი:</span>

                    <span className="ml-2 font-medium text-text-primary">

                      {batch.batchStatus === 'fermenting' ? '🧪 ფერმენტაცია' :

                       batch.batchStatus === 'conditioning' ? '🔵 კონდიციონირება' :

                       batch.batchStatus === 'packaged' ? '✅ დაფასოებული' :

                       batch.batchStatus}

                    </span>

                  </div>

                  <div>

                    <span className="text-text-muted">ტანკი:</span>

                    <span className="ml-2 font-medium text-text-primary">{batch.tankName}</span>

                  </div>

                </div>



                <div>

                  <div className="flex items-center justify-between text-sm mb-2">

                    <span className="text-text-muted">QC პროგრესი:</span>

                    <span className="font-medium">{batch.completedTests}/{batch.totalTests} ტესტი</span>

                  </div>

                  <ProgressBar value={progress} color="copper" />

                </div>



                <div className="space-y-2 text-sm">

                  {batch.tests.slice(0, 3).map(test => {

                    const statusIcon = test.status === 'passed' ? '✅' :

                                     test.status === 'warning' ? '⚠️' :

                                     test.status === 'failed' ? '❌' : '⏳'

                    const statusText = test.status === 'pending' || test.status === 'in_progress' ? 'მოლოდინში' :

                                     test.status === 'passed' ? `${test.testName}: ${test.result} ${test.unit}` :

                                     test.status === 'warning' ? `${test.testName}: ${test.result} ${test.unit}` :

                                     `${test.testName}: ${test.result} ${test.unit}`



                    return (

                      <div key={test.id} className="flex items-center gap-2">

                        <span>{statusIcon}</span>

                        <span className="text-text-primary">{statusText}</span>

                      </div>

                    )

                  })}

                  {batch.tests.length > 3 && (

                    <div className="text-xs text-text-muted pt-1">

                      +{batch.tests.length - 3} სხვა ტესტი

                    </div>

                  )}

                </div>



                <div className="pt-2 border-t border-border">

                  <Link href={`/quality/batches/${batch.batchId}`} className="text-sm text-copper-light hover:text-copper transition-colors">

                    დეტალები →

                  </Link>

                </div>

              </CardBody>

            </Card>

          )

        })}

      </div>

    </DashboardLayout>

  )

}

