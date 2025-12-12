'use client'



import { useState } from 'react'

import Link from 'next/link'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button } from '@/components/ui'

import { NewTestModal, TestResultModal } from '@/components/quality'

import { mockQCTests, getTestStatus, type QCTest, type TestStatus, type TestType } from '@/data/qualityData'

import { formatDate, formatDateTime } from '@/lib/utils'



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



export default function TestsPage() {

  const [showNewTestModal, setShowNewTestModal] = useState(false)

  const [selectedTest, setSelectedTest] = useState<QCTest | null>(null)

  const [showResultModal, setShowResultModal] = useState(false)

  const [tests, setTests] = useState<QCTest[]>(mockQCTests)

  const [filterStatus, setFilterStatus] = useState<string>('all')

  const [filterType, setFilterType] = useState<string>('all')

  const [filterBatch, setFilterBatch] = useState<string>('all')



  const filteredTests = tests.filter(test => {

    if (filterStatus !== 'all' && test.status !== filterStatus) return false

    if (filterType !== 'all' && test.testType !== filterType) return false

    if (filterBatch !== 'all' && test.batchId !== filterBatch) return false

    return true

  })



  const totalTests = tests.length

  const todayTests = tests.filter(t => {

    const today = new Date()

    return t.completedDate &&

      t.completedDate.getDate() === today.getDate() &&

      t.completedDate.getMonth() === today.getMonth() &&

      t.completedDate.getFullYear() === today.getFullYear()

  }).length

  const pendingTests = tests.filter(t => t.status === 'pending' || t.status === 'in_progress').length

  const avgScore = tests.filter(t => t.status === 'passed').length > 0

    ? Math.round((tests.filter(t => t.status === 'passed').length / totalTests) * 10 * 10) / 10

    : 0



  const handleAddTest = (testData: any) => {

    // Same as in main page

    setTests([...tests, {

      id: `test-${Date.now()}`,

      ...testData,

      status: 'pending' as TestStatus,

    }])

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



  return (

    <DashboardLayout title="🔬 ტესტები" breadcrumb="მთავარი / ხარისხი / ტესტები">

      {/* Header */}

      <div className="flex justify-between items-center mb-6">

        <Link href="/quality" className="text-sm text-copper-light hover:text-copper transition-colors">

          ← უკან

        </Link>

        <Button onClick={() => setShowNewTestModal(true)} variant="primary" size="sm">

          + ახალი ტესტი

        </Button>

      </div>



      {/* Filters */}

      <div className="flex gap-4 mb-6">

        <select

          value={filterStatus}

          onChange={(e) => setFilterStatus(e.target.value)}

          className="px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

        >

          <option value="all">ყველა სტატუსი</option>

          <option value="pending">მოლოდინში</option>

          <option value="in_progress">მიმდინარე</option>

          <option value="passed">წარმატებული</option>

          <option value="warning">გაფრთხილება</option>

          <option value="failed">ჩაჭრილი</option>

        </select>

        <select

          value={filterType}

          onChange={(e) => setFilterType(e.target.value)}

          className="px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

        >

          <option value="all">ყველა ტიპი</option>

          <option value="gravity">გრავიტაცია</option>

          <option value="ph">pH</option>

          <option value="abv">ABV</option>

          <option value="ibu">IBU</option>

          <option value="color">ფერი</option>

          <option value="sensory">სენსორული</option>

          <option value="microbiology">მიკრობიოლოგია</option>

        </select>

        <select

          value={filterBatch}

          onChange={(e) => setFilterBatch(e.target.value)}

          className="px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

        >

          <option value="all">ყველა პარტია</option>

          {Array.from(new Set(tests.map(t => t.batchId))).map(batchId => {

            const test = tests.find(t => t.batchId === batchId)

            return test ? (

              <option key={batchId} value={batchId}>{test.batchNumber}</option>

            ) : null

          })}

        </select>

      </div>



      {/* Stats Cards */}

      <div className="grid grid-cols-4 gap-4 mb-6">

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-blue-400 mb-1">{totalTests}</p>

            <p className="text-sm text-text-muted">სულ ტესტი</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-green-400 mb-1">{todayTests}</p>

            <p className="text-sm text-text-muted">დღეს ჩატარებული</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-amber-400 mb-1">{pendingTests}</p>

            <p className="text-sm text-text-muted">მოლოდინში</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-copper-light mb-1">{avgScore}</p>

            <p className="text-sm text-text-muted">საშუალო ქულა</p>

          </CardBody>

        </Card>

      </div>



      {/* Tests Table */}

      <Card>

        <CardHeader>

          <span className="text-lg font-semibold">ტესტების სია</span>

        </CardHeader>

        <CardBody>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b border-border">

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">#</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">პარტია</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">რეცეპტი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">ტესტის ტიპი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">შედეგი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">ნორმა</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">სტატუსი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">თარიღი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">შემსრულებელი</th>

                </tr>

              </thead>

              <tbody>

                {filteredTests.map((test, index) => (

                  <tr

                    key={test.id}

                    className="border-b border-border/50 hover:bg-bg-tertiary transition-colors cursor-pointer"

                    onClick={() => {

                      setSelectedTest(test)

                      setShowResultModal(true)

                    }}

                  >

                    <td className="py-3 px-4 text-sm text-text-muted">{index + 1}</td>

                    <td className="py-3 px-4 text-sm font-medium text-copper-light">{test.batchNumber}</td>

                    <td className="py-3 px-4 text-sm text-text-primary">{test.recipeName}</td>

                    <td className="py-3 px-4 text-sm text-text-primary">{test.testName}</td>

                    <td className="py-3 px-4 text-sm font-medium text-text-primary">

                      {test.result !== undefined ? `${test.result} ${test.unit}` : '-'}

                    </td>

                    <td className="py-3 px-4 text-sm text-text-muted">

                      {test.minValue} - {test.maxValue} {test.unit}

                    </td>

                    <td className="py-3 px-4 text-sm">{getStatusBadge(test.status)}</td>

                    <td className="py-3 px-4 text-sm text-text-muted">

                      {test.completedDate ? formatDate(test.completedDate) : formatDate(test.scheduledDate)}

                    </td>

                    <td className="py-3 px-4 text-sm text-text-muted">{test.performedBy || '-'}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </CardBody>

      </Card>



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

