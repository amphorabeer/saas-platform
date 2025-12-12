'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button, ProgressBar } from '@/components/ui'
import { NewTestModal, TestResultModal } from '@/components/quality'
import { mockQCTests, testTypeConfig, getTestStatus, type QCTest } from '@/data/qualityData'
import { batches as centralBatches } from '@/data/centralData'
import { formatDate, formatTime, formatDateTime } from '@/lib/utils'

// Use central batches
const mockBatches = centralBatches



const getStatusBadge = (status: QCTest['status']) => {

  const configs = {

    pending: { label: '⏳ მოლოდინში', class: 'bg-gray-400/20 text-gray-400' },

    in_progress: { label: '🔄 მიმდინარე', class: 'bg-blue-400/20 text-blue-400' },

    passed: { label: '✅ წარმატებული', class: 'bg-green-400/20 text-green-400' },

    warning: { label: '⚠️ გაფრთხილება', class: 'bg-amber-400/20 text-amber-400' },

    failed: { label: '❌ ჩაჭრილი', class: 'bg-red-400/20 text-red-400' },

  }

  const config = configs[status]

  return <span className={`px-2 py-1 rounded text-xs font-medium ${config.class}`}>{config.label}</span>

}



const getPriorityBadge = (priority: QCTest['priority']) => {

  const configs = {

    high: { icon: '🔴', label: 'მაღალი', class: 'text-red-400' },

    medium: { icon: '🟡', label: 'საშუალო', class: 'text-amber-400' },

    low: { icon: '🟢', label: 'დაბალი', class: 'text-green-400' },

  }

  const config = configs[priority]

  return <span className={`text-xs ${config.class}`}>{config.icon} {config.label}</span>

}



export default function QualityPage() {

  const [showNewTestModal, setShowNewTestModal] = useState(false)

  const [selectedTest, setSelectedTest] = useState<QCTest | null>(null)

  const [showResultModal, setShowResultModal] = useState(false)

  const [tests, setTests] = useState<QCTest[]>(mockQCTests)



  const totalTests = tests.length

  const passedTests = tests.filter(t => t.status === 'passed').length

  const warningTests = tests.filter(t => t.status === 'warning').length

  const failedTests = tests.filter(t => t.status === 'failed').length

  const pendingTests = tests.filter(t => t.status === 'pending' || t.status === 'in_progress')

  const recentResults = tests

    .filter(t => t.status !== 'pending' && t.status !== 'in_progress')

    .sort((a, b) => (b.completedDate?.getTime() || 0) - (a.completedDate?.getTime() || 0))

    .slice(0, 5)



  const handleAddTest = (testData: any) => {

    const newTest: QCTest = {

      id: `test-${Date.now()}`,

      batchId: testData.batchId,

      batchNumber: mockBatches.find(b => b.id === testData.batchId)?.batchNumber || '',

      recipeName: mockBatches.find(b => b.id === testData.batchId)?.recipeName || '',

      testType: testData.testType,

      testName: testTypeConfig[testData.testType].name,

      scheduledDate: testData.scheduledDate,

      unit: testTypeConfig[testData.testType].unit,

      minValue: testData.minValue,

      maxValue: testData.maxValue,

      status: 'pending',

      priority: testData.priority,

      notes: testData.notes,

    }

    setTests([...tests, newTest])

  }



  const handleSaveResult = (testId: string, result: number, performedBy: string, notes?: string) => {

    const test = tests.find(t => t.id === testId)

    if (!test) return



    const status = getTestStatus(result, test.minValue, test.maxValue)

    const completedDate = new Date()



    setTests(tests.map(t =>

      t.id === testId

        ? { ...t, result, status, performedBy, completedDate, notes }

        : t

    ))

  }



  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0

  const warningRate = totalTests > 0 ? Math.round((warningTests / totalTests) * 100) : 0

  const failedRate = totalTests > 0 ? Math.round((failedTests / totalTests) * 100) : 0



  return (

    <DashboardLayout title="✅ ხარისხის კონტროლი" breadcrumb="მთავარი / ხარისხი">

      {/* Header */}

      <div className="flex justify-between items-center mb-6">

        <div />

        <Button onClick={() => setShowNewTestModal(true)} variant="primary" size="sm">

          + ახალი ტესტი

        </Button>

      </div>



      {/* Stats Cards */}

      <div className="grid grid-cols-4 gap-4 mb-6">

        <Card>

          <CardBody className="p-6">

            <div className="flex items-center justify-between mb-2">

              <span className="text-2xl">📊</span>

            </div>

            <p className="text-3xl font-bold font-display text-blue-400 mb-1">{totalTests}</p>

            <p className="text-sm text-text-muted">სულ ტესტები</p>

          </CardBody>

        </Card>



        <Card>

          <CardBody className="p-6">

            <div className="flex items-center justify-between mb-2">

              <span className="text-2xl">✅</span>

              <span className="text-sm font-medium text-green-400">{successRate}%</span>

            </div>

            <p className="text-3xl font-bold font-display text-green-400 mb-1">{passedTests}</p>

            <p className="text-sm text-text-muted">წარმატებული</p>

          </CardBody>

        </Card>



        <Card>

          <CardBody className="p-6">

            <div className="flex items-center justify-between mb-2">

              <span className="text-2xl">⚠️</span>

              <span className="text-sm font-medium text-amber-400">{warningRate}%</span>

            </div>

            <p className="text-3xl font-bold font-display text-amber-400 mb-1">{warningTests}</p>

            <p className="text-sm text-text-muted">გაფრთხილება</p>

          </CardBody>

        </Card>



        <Card>

          <CardBody className="p-6">

            <div className="flex items-center justify-between mb-2">

              <span className="text-2xl">❌</span>

              <span className="text-sm font-medium text-red-400">{failedRate}%</span>

            </div>

            <p className="text-3xl font-bold font-display text-red-400 mb-1">{failedTests}</p>

            <p className="text-sm text-text-muted">ჩაჭრილი</p>

          </CardBody>

        </Card>

      </div>



      {/* 2 Column Layout */}

      <div className="grid grid-cols-3 gap-6">

        {/* Pending Tests - 2 columns */}

        <div className="col-span-2">

          <Card>

            <CardHeader>

              <span className="text-lg font-semibold">🔬 მოლოდინში მყოფი ტესტები</span>

            </CardHeader>

            <CardBody>

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead>

                    <tr className="border-b border-border">

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">პარტია</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">რეცეპტი</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">ტესტი</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">დაგეგმილი</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">პრიორიტეტი</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">მოქმედება</th>

                    </tr>

                  </thead>

                  <tbody>

                    {pendingTests.map(test => (

                      <tr key={test.id} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                        <td className="py-3 px-4 text-sm font-medium text-copper-light">{test.batchNumber}</td>

                        <td className="py-3 px-4 text-sm text-text-primary">{test.recipeName}</td>

                        <td className="py-3 px-4 text-sm text-text-primary">{test.testName}</td>

                        <td className="py-3 px-4 text-sm text-text-muted">{formatDateTime(test.scheduledDate)}</td>

                        <td className="py-3 px-4 text-sm">{getPriorityBadge(test.priority)}</td>

                        <td className="py-3 px-4 text-sm">

                          <Button

                            variant="secondary"

                            size="sm"

                            onClick={() => {

                              setSelectedTest(test)

                              setShowResultModal(true)

                            }}

                          >

                            შედეგი

                          </Button>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </CardBody>

          </Card>

        </div>



        {/* Right Column - 1 column */}

        <div className="col-span-1 space-y-6">

          {/* Recent Results */}

          <Card>

            <CardHeader>

              <span className="text-lg font-semibold">📋 ბოლო შედეგები</span>

            </CardHeader>

            <CardBody>

              <div className="space-y-3">

                {recentResults.map(test => (

                  <div key={test.id} className="pb-3 border-b border-border/50 last:border-0">

                    <div className="text-sm font-medium text-text-primary mb-1">

                      {test.batchNumber} | {test.testName}: {test.result} {test.unit}

                    </div>

                    <div className="flex items-center justify-between text-xs">

                      {getStatusBadge(test.status)}

                      <span className="text-text-muted">{formatDateTime(test.completedDate!)}</span>

                    </div>

                  </div>

                ))}

              </div>

            </CardBody>

          </Card>



          {/* Quality Trend */}

          <Card>

            <CardHeader>

              <span className="text-lg font-semibold">📈 ხარისხის ტრენდი (30 დღე)</span>

            </CardHeader>

            <CardBody className="space-y-3">

              <div>

                <div className="flex items-center justify-between text-sm mb-2">

                  <span>წარმატებული:</span>

                  <span className="font-medium">{successRate}%</span>

                </div>

                <ProgressBar value={successRate} color="green" />

              </div>

              <div>

                <div className="flex items-center justify-between text-sm mb-2">

                  <span>გაფრთხილება:</span>

                  <span className="font-medium">{warningRate}%</span>

                </div>

                <ProgressBar value={warningRate} color="amber" />

              </div>

              <div>

                <div className="flex items-center justify-between text-sm mb-2">

                  <span>ჩაჭრილი:</span>

                  <span className="font-medium">{failedRate}%</span>

                </div>

                <ProgressBar value={failedRate} color="red" />

              </div>

            </CardBody>

          </Card>



          {/* Quick Links */}

          <Card>

            <CardHeader>

              <span className="text-lg font-semibold">🔗 სწრაფი ლინკები</span>

            </CardHeader>

            <CardBody className="space-y-2">

              <Link href="/quality/tests" className="block text-sm text-copper-light hover:text-copper transition-colors">

                → ტესტების ისტორია

              </Link>

              <Link href="/quality/batches" className="block text-sm text-copper-light hover:text-copper transition-colors">

                → პარტიების QC

              </Link>

              <Link href="/quality/templates" className="block text-sm text-copper-light hover:text-copper transition-colors">

                → ტესტების შაბლონები

              </Link>

            </CardBody>

          </Card>

        </div>

      </div>



      {/* Modals */}

      <NewTestModal

        isOpen={showNewTestModal}

        onClose={() => setShowNewTestModal(false)}

        onAdd={handleAddTest}

      />



      <TestResultModal

        test={selectedTest}

        isOpen={showResultModal}

        onClose={() => {

          setShowResultModal(false)

          setSelectedTest(null)

        }}

        onSave={handleSaveResult}

      />

    </DashboardLayout>

  )

}

