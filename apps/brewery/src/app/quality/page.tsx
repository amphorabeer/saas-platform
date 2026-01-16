'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button, ProgressBar } from '@/components/ui'
import { NewTestModal, TestResultModal } from '@/components/quality'
import { testTypeConfig, getTestStatus, type QCTest } from '@/data/qualityData'
import { formatDate, formatTime, formatDateTime } from '@/lib/utils'

// API response types
interface QCTestAPI {
  id: string
  batchId: string
  lotId: string | null
  batchNumber: string
  recipeName: string
  lotCode: string | null
  testType: string
  testName: string
  status: string
  priority: string
  scheduledDate: string
  completedDate: string | null
  minValue: number | null
  maxValue: number | null
  targetValue: number | null
  result: number | null
  unit: string
  notes: string | null
  performedBy: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface BatchAPI {
  id: string
  batchNumber: string
  recipe: {
    id: string
    name: string
  } | null
  status: string
}

// Map API status to component status
const mapStatus = (status: string): QCTest['status'] => {
  const statusMap: Record<string, QCTest['status']> = {
    SCHEDULED: 'pending',
    IN_PROGRESS: 'in_progress',
    PASSED: 'passed',
    WARNING: 'warning',
    FAILED: 'failed',
    // CANCELLED: 'cancelled', // Removed - 'cancelled' not in TestStatus type
  }
  return statusMap[status] || 'pending'
}

// Map API priority to component priority
const mapPriority = (priority: string): QCTest['priority'] => {
  const priorityMap: Record<string, QCTest['priority']> = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  }
  return priorityMap[priority] || 'medium'
}

// Map API test types to component test types
const mapTestType = (apiType: string): QCTest['testType'] => {
  const typeMap: Record<string, QCTest['testType']> = {
    GRAVITY: 'gravity',
    TEMPERATURE: 'gravity', // Map to gravity for compatibility
    PH: 'ph',
    DISSOLVED_O2: 'gravity',
    TURBIDITY: 'gravity',
    COLOR: 'color',
    BITTERNESS: 'ibu',
    ALCOHOL: 'abv',
    CARBONATION: 'gravity',
    APPEARANCE: 'sensory',
    AROMA: 'sensory',
    TASTE: 'sensory',
    MICROBIOLOGICAL: 'microbiology',
  }
  return typeMap[apiType] || 'gravity'
}

// Transform API test to component test
const transformTest = (apiTest: QCTestAPI): QCTest => {
  return {
    id: apiTest.id,
    batchId: apiTest.batchId,
    batchNumber: apiTest.batchNumber,
    recipeName: apiTest.recipeName,
    testType: mapTestType(apiTest.testType),
    testName: apiTest.testName,
    scheduledDate: new Date(apiTest.scheduledDate),
    unit: apiTest.unit,
    minValue: apiTest.minValue || 0,
    maxValue: apiTest.maxValue || 0,
    status: mapStatus(apiTest.status),
    priority: mapPriority(apiTest.priority),
    notes: apiTest.notes || undefined,
    result: apiTest.result || undefined,
    performedBy: apiTest.performedBy || undefined,
    completedDate: apiTest.completedDate ? new Date(apiTest.completedDate) : undefined,
  }
}

const getStatusBadge = (status: QCTest['status']) => {
  const configs = {
    pending: { label: '⏳ მოლოდინში', class: 'bg-gray-400/20 text-gray-400' },
    in_progress: { label: '🔄 მიმდინარე', class: 'bg-blue-400/20 text-blue-400' },
    passed: { label: '✅ წარმატებული', class: 'bg-green-400/20 text-green-400' },
    warning: { label: '⚠️ გაფრთხილება', class: 'bg-amber-400/20 text-amber-400' },
    failed: { label: '❌ ჩაჭრილი', class: 'bg-red-400/20 text-red-400' },
    cancelled: { label: '🚫 გაუქმებული', class: 'bg-gray-400/20 text-gray-400' },
  }

  const config = configs[status] || configs.pending
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
  const [tests, setTests] = useState<QCTest[]>([])
  const [batches, setBatches] = useState<BatchAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    passed: 0,
    warning: 0,
    failed: 0,
    pending: 0,
  })

  // Fetch batches for modal
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await fetch('/api/batches?limit=100')
        if (res.ok) {
          const data = await res.json()
          setBatches(data.batches || [])
        }
      } catch (error) {
        console.error('Failed to fetch batches:', error)
      }
    }
    fetchBatches()
  }, [])

  // Fetch QC tests
  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/quality')
        if (res.ok) {
          const data = await res.json()
          const transformedTests = (data.tests || []).map(transformTest)
          setTests(transformedTests)
          setStats(data.stats || {
            total: 0,
            passed: 0,
            warning: 0,
            failed: 0,
            pending: 0,
          })
        }
      } catch (error) {
        console.error('Failed to fetch QC tests:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTests()
  }, [])

  const handleAddTest = async (testData: any) => {
    try {
      const res = await fetch('/api/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: testData.batchId,
          testType: testData.testType.toUpperCase(),
          priority: testData.priority.toUpperCase(),
          scheduledDate: testData.scheduledDate.toISOString(),
          minValue: testData.minValue,
          maxValue: testData.maxValue,
          notes: testData.notes,
        }),
      })

      if (res.ok) {
        const newTest = await res.json()
        const transformedTest = transformTest(newTest)
        setTests([transformedTest, ...tests])
        // Refresh stats
        const statsRes = await fetch('/api/quality')
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData.stats || stats)
        }
      } else {
        const error = await res.json()
        alert(`შეცდომა: ${error.error || 'ტესტის დამატება ვერ მოხერხდა'}`)
      }
    } catch (error) {
      console.error('Failed to add test:', error)
      alert('ტესტის დამატება ვერ მოხერხდა')
    }
  }

  const handleSaveResult = async (testId: string, result: number, performedBy: string, notes?: string) => {
    try {
      const res = await fetch('/api/quality', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testId,
          result,
          performedBy,
          notes,
        }),
      })

      if (res.ok) {
        const updatedTest = await res.json()
        const transformedTest = transformTest(updatedTest)
        setTests(tests.map(t => t.id === testId ? transformedTest : t))
        // Refresh stats
        const statsRes = await fetch('/api/quality')
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData.stats || stats)
        }
      } else {
        const error = await res.json()
        alert(`შეცდომა: ${error.error || 'შედეგის შენახვა ვერ მოხერხდა'}`)
      }
    } catch (error) {
      console.error('Failed to save result:', error)
      alert('შედეგის შენახვა ვერ მოხერხდა')
    }
  }

  const totalTests = stats.total || tests.length
  const passedTests = stats.passed || tests.filter(t => t.status === 'passed').length
  const warningTests = stats.warning || tests.filter(t => t.status === 'warning').length
  const failedTests = stats.failed || tests.filter(t => t.status === 'failed').length
  const pendingTests = tests.filter(t => t.status === 'pending' || t.status === 'in_progress')

  const recentResults = tests
    .filter(t => t.status !== 'pending' && t.status !== 'in_progress' && t.completedDate)
    .sort((a, b) => (b.completedDate?.getTime() || 0) - (a.completedDate?.getTime() || 0))
    .slice(0, 5)

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
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
                </div>
              ) : pendingTests.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  მოლოდინში მყოფი ტესტები არ არის
                </div>
              ) : (
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
              )}
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
              {recentResults.length === 0 ? (
                <div className="text-center py-4 text-text-muted text-sm">
                  შედეგები არ არის
                </div>
              ) : (
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
              )}
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
                <ProgressBar value={successRate} color="success" />
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
                <ProgressBar value={failedRate} color="danger" />
              </div>
            </CardBody>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <span className="text-lg font-semibold">🔗 სწრაფი ლინკები</span>
            </CardHeader>
            <CardBody className="space-y-2">
              <Link href="/production" className="block text-sm text-copper-light hover:text-copper transition-colors">
                → წარმოება
              </Link>
              <Link href="/calendar" className="block text-sm text-copper-light hover:text-copper transition-colors">
                → კალენდარი
              </Link>
              <Link href="/inventory" className="block text-sm text-copper-light hover:text-copper transition-colors">
                → ინვენტარი
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
        batches={batches}
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
