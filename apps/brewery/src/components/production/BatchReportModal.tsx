'use client'

import { Button } from '@/components/ui'
import { formatDate, formatTime } from '@/lib/utils'
import { formatGravity } from '@/utils'

interface BatchReportModalProps {
  isOpen: boolean
  onClose: () => void
  batch: {
    id: string
    batchNumber: string
    recipe: {
      name: string
      style: string
      ingredients?: Array<{
        name: string
        category?: string
        amount: number | string
        unit: string
      }>
    }
    status: string
    tank: {
      name: string
    }
    volume: number
    brewDate: Date
    targetOG: number
    targetFG: number
    targetABV: number
    actualOG?: number
    currentGravity?: number
    currentABV?: number
    progress: number
    notes?: string
    brewer?: string
    timeline?: Array<{
      id: string
      type: string
      title: string
      description?: string
      date: Date | string
      user?: string
    }>
  }
  gravityReadings?: Array<{
    id: string
    date: Date
    gravity: number
    temperature: number
    notes?: string
    recordedBy: string
  }>
  ingredients?: Array<{
    id?: string
    name: string
    type: string
    amount: number
    unit: string
  }>
  packagingRecords?: Array<{
    id: string
    /** Modal display date */
    date?: Date
    /** API batch detail uses performedAt instead of date */
    performedAt?: Date
    packageType: string
    quantity: number
    volumeL?: number
    /** API packaging runs use volumeTotal */
    volumeTotal?: number
    performedBy: string
    notes?: string
  }>
  qcTests?: Array<{
    id: string
    testType: string
    status: string
    scheduledDate: Date | string
    completedDate?: Date | string
    minValue?: number
    maxValue?: number
    result?: number
    unit?: string
    performedBy?: string
    notes?: string
  }>
}

function packagingVolumeLiters(record: {
  volumeL?: number
  volumeTotal?: number
}): number {
  const v = record.volumeL ?? record.volumeTotal
  const n = v != null ? Number(v) : 0
  return Number.isFinite(n) ? n : 0
}

function packagingRecordDate(record: { date?: Date; performedAt?: Date }): Date | undefined {
  return record.date ?? record.performedAt
}

const getPackageTypeName = (type: string): string => {
  const names: Record<string, string> = {
    keg_50: 'კასრი 50L',
    keg_30: 'კასრი 30L',
    keg_20: 'კასრი 20L',
    bottle_500: 'ბოთლი 500ml',
    bottle_330: 'ბოთლი 330ml',
    can_500: 'ქილა 500ml',
    can_330: 'ქილა 330ml',
  }
  return names[type] || type
}

export function BatchReportModal({ isOpen, onClose, batch, gravityReadings = [], ingredients = [], packagingRecords = [], qcTests = [] }: BatchReportModalProps) {
  if (!isOpen) return null

  const handleExportPDF = () => {
    alert('PDF ექსპორტი მალე დაემატება')
  }

  const handleExportExcel = () => {
    alert('Excel ექსპორტი მალე დაემატება')
  }

  const handlePrint = () => {
    window.print()
  }

  // Calculate batch statistics
  const startDate = batch.brewDate || new Date()
  const endDate = (batch as any).completedAt || new Date()
  const totalDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
  
  const attenuationPercent = batch.actualOG && (batch as any).actualFG 
    ? (((batch.actualOG - (batch as any).actualFG) / (batch.actualOG - 1)) * 100).toFixed(1)
    : '-'

  // ✅ FIX: Get current gravity from latest reading (not batch.currentGravity)
  const latestReading = gravityReadings && gravityReadings.length > 0
    ? [...gravityReadings]
        .filter((r: any) => r.gravity != null && r.gravity !== 0)
        .sort((a: any, b: any) => {
          const dateA = new Date(a.recordedAt || a.date).getTime()
          const dateB = new Date(b.recordedAt || b.date).getTime()
          return dateB - dateA // Descending (latest first)
        })[0]
    : null
  
  const currentGravity = latestReading?.gravity || batch.currentGravity
  // ✅ FIX: Show 0 if temperature is 0, otherwise null if not set
  const currentTemperature = latestReading?.temperature != null ? latestReading.temperature : null

  // ✅ FIX: Always format ABV with toFixed(1), using latest reading
  const actualABV = (() => {
    if (currentGravity && batch.actualOG) {
      return ((batch.actualOG - currentGravity) * 131.25).toFixed(1)
    }
    if (batch.currentGravity && batch.actualOG) {
      return ((batch.actualOG - batch.currentGravity) * 131.25).toFixed(1)
    }
    if (typeof batch.currentABV === 'number') {
      return batch.currentABV.toFixed(1)
    }
    if (typeof batch.targetABV === 'number') {
      return batch.targetABV.toFixed(1)
    }
    return null
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-tertiary">
          <h2 className="text-xl font-display font-semibold">📋 პარტიის ანგარიში | {batch.batchNumber}</h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-danger hover:text-danger transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Batch Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-text-muted mb-1">რეცეპტი</p>
                <p className="font-medium">{batch.recipe.name}</p>
                <p className="text-sm text-text-muted">{batch.recipe.style}</p>
              </div>
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-text-muted mb-1">ავზი</p>
                <p className="font-medium font-mono">{batch.tank.name}</p>
              </div>
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-text-muted mb-1">მოცულობა</p>
                <p className="font-medium font-mono">{batch.volume}L</p>
              </div>
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-text-muted mb-1">ხარშვის თარიღი</p>
                <p className="font-medium">{formatDate(batch.brewDate)}</p>
              </div>
            </div>

            {/* Metrics */}
            <div>
              <h3 className="text-lg font-display font-semibold mb-4">მეტრიკები</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-text-muted mb-1">სამიზნე OG</p>
                  <p className="text-lg font-mono font-bold text-copper-light">{formatGravity(batch.targetOG)}</p>
                </div>
                <div className="bg-bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-text-muted mb-1">სამიზნე FG</p>
                  <p className="text-lg font-mono font-bold text-blue-400">{formatGravity(batch.targetFG)}</p>
                </div>
                <div className="bg-bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-text-muted mb-1">სამიზნე ABV</p>
                  <p className="text-lg font-mono font-bold text-green-400">{batch.targetABV.toFixed(1)}%</p>
                </div>
                <div className="bg-bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-text-muted mb-1">პროგრესი</p>
                  <p className="text-lg font-mono font-bold text-amber-400">{batch.progress}%</p>
                </div>
                {batch.actualOG && (
                  <div className="bg-bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">რეალური OG</p>
                    <p className="text-lg font-mono font-bold text-copper-light">{formatGravity(batch.actualOG)}</p>
                  </div>
                )}
                {currentGravity && (
                  <div className="bg-bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">მიმდინარე SG</p>
                    <p className="text-lg font-mono font-bold text-blue-400">{formatGravity(currentGravity)}</p>
                  </div>
                )}
                {currentTemperature !== null && (
                  <div className="bg-bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">🌡️ °C</p>
                    <p className="text-lg font-mono font-bold text-white">{currentTemperature}°C</p>
                  </div>
                )}
                {actualABV && (
                  <div className="bg-bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">რეალური ABV</p>
                    <p className="text-lg font-mono font-bold text-green-400">{actualABV}%</p>
                  </div>
                )}
              </div>
            </div>

            {/* Gravity Readings */}
            {gravityReadings && gravityReadings.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-copper-light mb-3">📈 სიმკვრივის გაზომვები</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-text-muted border-b border-dark-700">
                        <th className="text-left p-2">თარიღი</th>
                        <th className="text-left p-2">SG</th>
                        <th className="text-left p-2">🌡️ °C</th>
                        <th className="text-left p-2">შენიშვნა</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // ✅ Filter and sort gravity readings
                        const filteredReadings = [...gravityReadings]
                          .filter((r: any) => r.gravity != null && r.gravity !== 0)
                          .sort((a: any, b: any) => {
                            const dateA = new Date(a.recordedAt || a.date).getTime()
                            const dateB = new Date(b.recordedAt || b.date).getTime()
                            return dateA - dateB
                          })
                        
                        // ✅ Get conditioning event from timeline
                        const condEvent = batch.timeline?.find((e: any) => e.type === 'CONDITIONING_STARTED')
                        
                        // ✅ Check if there's already a gravity reading for conditioning
                        const hasConditioningReading = filteredReadings.some((r: any) => 
                          r.notes?.includes('კონდიცირება') || 
                          r.notes?.includes('კონდიცირება') || 
                          r.notes?.includes('FG') || 
                          r.notes?.includes('საბოლოო')
                        )
                        
                        // ✅ Combine readings with conditioning event if needed
                        const allRows: any[] = filteredReadings.map((reading: any, idx: number) => ({
                          type: 'reading',
                          reading,
                          date: new Date(reading.recordedAt || reading.date).getTime(),
                        }))
                        
                        // ✅ Add conditioning event if it exists and no reading for it
                        if (condEvent && !hasConditioningReading) {
                          const condDate = new Date(condEvent.date || (condEvent as any).createdAt || new Date()).getTime()
                          allRows.push({
                            type: 'conditioning',
                            event: condEvent,
                            date: condDate,
                          })
                        }
                        
                        // ✅ Sort all rows by date
                        allRows.sort((a, b) => a.date - b.date)
                        
                        return allRows.map((row: any, idx: number) => {
                          if (row.type === 'conditioning') {
                            return (
                              <tr key={`conditioning-${idx}`} className="border-b border-dark-800 bg-blue-900/20">
                                <td className="p-2">{formatDate(row.event.date || (row.event as any).createdAt || new Date())}</td>
                                <td className="p-2 font-mono text-text-muted">-</td>
                                <td className="p-2 text-text-muted">-</td>
                                <td className="p-2 text-blue-400">❄️ კონდიცირება დაიწყო</td>
                              </tr>
                            )
                          }
                          
                          return (
                            <tr key={idx} className="border-b border-dark-800">
                              <td className="p-2">{formatDate(row.reading.recordedAt || row.reading.date)}</td>
                              <td className="p-2 font-mono">{row.reading.gravity !== undefined && row.reading.gravity !== null ? formatGravity(row.reading.gravity) : '-'}</td>
                              <td className="p-2">{row.reading.temperature != null ? row.reading.temperature : '-'}</td>
                              <td className="p-2 text-text-muted">{row.reading.notes || '-'}</td>
                            </tr>
                          )
                        })
                      })()}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Ingredients */}
            {batch.recipe?.ingredients && batch.recipe.ingredients.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-copper-light mb-3">🧪 ინგრედიენტები</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* ალაო */}
                  <div className="bg-dark-800 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">🌾 ალაო</h4>
                    <div className="space-y-1 text-sm">
                      {batch.recipe.ingredients
                        .filter((ing: any) => ['MALT', 'GRAIN'].includes(ing.category?.toUpperCase()))
                        .map((ing: any, idx: number) => (
                          <div key={idx} className="flex justify-between">
                            <span>{ing.name}</span>
                            <span className="text-text-muted">{ing.amount} {ing.unit}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* სვია */}
                  <div className="bg-dark-800 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">🌿 სვია</h4>
                    <div className="space-y-1 text-sm">
                      {batch.recipe.ingredients
                        .filter((ing: any) => ['HOP', 'HOPS'].includes(ing.category?.toUpperCase()))
                        .map((ing: any, idx: number) => (
                          <div key={idx} className="flex justify-between">
                            <span>{ing.name}</span>
                            <span className="text-text-muted">{ing.amount} {ing.unit}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* საფუარი */}
                  <div className="bg-dark-800 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">🧫 საფუარი</h4>
                    <div className="space-y-1 text-sm">
                      {batch.recipe.ingredients
                        .filter((ing: any) => ing.category?.toUpperCase() === 'YEAST')
                        .map((ing: any, idx: number) => (
                          <div key={idx} className="flex justify-between">
                            <span>{ing.name}</span>
                            <span className="text-text-muted">{ing.amount} {ing.unit}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Timeline / History */}
            <section>
              <h3 className="text-lg font-semibold text-copper-light mb-3">📅 სრული ისტორია</h3>
              <div className="space-y-3">
                {batch.timeline && batch.timeline.length > 0 ? (
                  [...batch.timeline].reverse().map((event: any, idx: number) => {
                    const eventIcons: Record<string, string> = {
                      'BATCH_CREATED': '📝',
                      'BREWING_STARTED': '🍺',
                      'FERMENTATION_STARTED': '🧪',
                      'CONDITIONING_STARTED': '❄️',
                      'MARKED_READY': '✅',
                      'PACKAGING_STARTED': '📦',
                      'BATCH_COMPLETED': '🎉',
                      'GRAVITY_READING': '📊',
                      'NOTE': '📌',
                    }
                    
                    return (
                      <div key={idx} className="flex gap-3 items-start bg-dark-800 p-3 rounded-lg">
                        <span className="text-xl">{eventIcons[event.type] || '📌'}</span>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-semibold">{event.title}</span>
                            <span className="text-sm text-text-muted">{formatDate(event.createdAt || event.date)}</span>
                          </div>
                          {event.description && (
                            <p className="text-sm text-text-muted">{event.description}</p>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-text-muted text-center py-4">ისტორია არ არის</p>
                )}
              </div>
            </section>

            {/* Packaging Records */}
            {packagingRecords.length > 0 && (
              <div>
                <h3 className="text-lg font-display font-semibold mb-4">📦 დაფასოვება</h3>
                <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-text-muted">
                        <th className="px-4 py-3">თარიღი</th>
                        <th className="px-4 py-3">ტიპი</th>
                        <th className="px-4 py-3 text-right">რაოდენობა</th>
                        <th className="px-4 py-3 text-right">მოცულობა</th>
                        <th className="px-4 py-3">შემსრულებელი</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packagingRecords.map(record => {
                        const vol = packagingVolumeLiters(record)
                        return (
                        <tr key={record.id} className="border-b border-border/50">
                          <td className="px-4 py-3 text-sm">{formatDate(packagingRecordDate(record))}</td>
                          <td className="px-4 py-3 text-sm">{getPackageTypeName(String(record.packageType || '').toLowerCase())}</td>
                          <td className="px-4 py-3 text-sm text-right font-mono">{record.quantity}</td>
                          <td className="px-4 py-3 text-sm text-right font-mono">{vol.toFixed(1)}L</td>
                          <td className="px-4 py-3 text-sm text-text-muted">{record.performedBy}</td>
                        </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold border-t border-border">
                        <td colSpan={3} className="px-4 py-3">სულ დაფასოვებული:</td>
                        <td className="px-4 py-3 text-right text-green-400 font-mono">
                          {packagingRecords.reduce((sum, r) => sum + packagingVolumeLiters(r), 0).toFixed(1)}L
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* QC Tests Section */}
            {qcTests.length > 0 && (
              <div>
                <h3 className="text-lg font-display font-semibold mb-4">🧪 ხარისხის ტესტები</h3>
                <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-text-muted">
                        <th className="px-4 py-3">თარიღი</th>
                        <th className="px-4 py-3">ტესტი</th>
                        <th className="px-4 py-3 text-right">შედეგი</th>
                        <th className="px-4 py-3">დიაპაზონი</th>
                        <th className="px-4 py-3">სტატუსი</th>
                        <th className="px-4 py-3">შემსრულებელი</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qcTests.map(test => {
                        const statusConfig: Record<string, { label: string; class: string }> = {
                          SCHEDULED: { label: '⏳ დაგეგმილი', class: 'text-gray-400' },
                          IN_PROGRESS: { label: '🔄 მიმდინარე', class: 'text-blue-400' },
                          PASSED: { label: '✅ წარმატებული', class: 'text-green-400' },
                          WARNING: { label: '⚠️ გაფრთხილება', class: 'text-amber-400' },
                          FAILED: { label: '❌ ჩაჭრილი', class: 'text-red-400' },
                          CANCELLED: { label: '🚫 გაუქმებული', class: 'text-gray-400' },
                        }
                        const testNames: Record<string, string> = {
                          GRAVITY: 'სიმკვრივე (SG)',
                          TEMPERATURE: 'ტემპერატურა',
                          PH: 'pH დონე',
                          DISSOLVED_O2: 'გახსნილი O₂',
                          TURBIDITY: 'სიმღვრივე',
                          COLOR: 'ფერი (SRM)',
                          BITTERNESS: 'სიმწარე (IBU)',
                          ALCOHOL: 'ალკოჰოლი (ABV)',
                          CARBONATION: 'კარბონიზაცია',
                          APPEARANCE: 'გარეგნობა',
                          AROMA: 'არომატი',
                          TASTE: 'გემო',
                          MICROBIOLOGICAL: 'მიკრობიოლოგიური',
                        }
                        const status = statusConfig[test.status] || statusConfig.SCHEDULED
                        const testName = testNames[test.testType] || test.testType
                        const testDate = test.completedDate || test.scheduledDate
                        return (
                          <tr key={test.id} className="border-b border-border/50">
                            <td className="px-4 py-3 text-sm">
                              {testDate instanceof Date ? formatDate(testDate) : formatDate(new Date(testDate))}
                            </td>
                            <td className="px-4 py-3 text-sm">{testName}</td>
                            <td className="px-4 py-3 text-sm text-right font-mono">
                              {test.result ? `${Number(test.result).toFixed(3)} ${test.unit || ''}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-text-muted">
                              {test.minValue != null || test.maxValue != null
                                ? `${test.minValue ?? '-'} - ${test.maxValue ?? '-'}`
                                : '-'}
                            </td>
                            <td className={`px-4 py-3 text-sm ${status.class}`}>{status.label}</td>
                            <td className="px-4 py-3 text-sm">{test.performedBy || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {/* QC Summary */}
                <div className="mt-3 flex gap-4 text-sm">
                  <span>✅ წარმატებული: <strong className="text-green-400">{qcTests.filter(t => t.status === 'PASSED').length}</strong></span>
                  <span>⚠️ გაფრთხილება: <strong className="text-amber-400">{qcTests.filter(t => t.status === 'WARNING').length}</strong></span>
                  <span>❌ ჩაჭრილი: <strong className="text-red-400">{qcTests.filter(t => t.status === 'FAILED').length}</strong></span>
                </div>
              </div>
            )}

            {/* Summary */}
            <section className="bg-dark-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-copper-light mb-2">📊 შეჯამება</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-text-muted">დაწყება:</span>
                  <span className="ml-2">{formatDate(startDate)}</span>
                </div>
                <div>
                  <span className="text-text-muted">დასრულება:</span>
                  <span className="ml-2">{(batch as any).completedAt ? formatDate((batch as any).completedAt) : 'მიმდინარე'}</span>
                </div>
                <div>
                  <span className="text-text-muted">ხანგრძლივობა:</span>
                  <span className="ml-2">{totalDays} დღე</span>
                </div>
                <div>
                  <span className="text-text-muted">სტატუსი:</span>
                  <span className="ml-2 text-copper-light">{batch.status}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-dark-900 p-4 border-t border-dark-700 flex justify-end gap-2">
          <button 
            onClick={() => window.print()} 
            className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg"
          >
            🖨️ ბეჭდვა
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-copper-600 hover:bg-copper-500 rounded-lg"
          >
            დახურვა
          </button>
        </div>
      </div>
    </div>
  )
}