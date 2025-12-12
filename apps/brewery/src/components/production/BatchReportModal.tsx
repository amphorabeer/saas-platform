'use client'

import { Button } from '@/components/ui'
import { formatDate, formatTime } from '@/lib/utils'

interface BatchReportModalProps {
  isOpen: boolean
  onClose: () => void
  batch: {
    id: string
    batchNumber: string
    recipe: {
      name: string
      style: string
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
}

export function BatchReportModal({ isOpen, onClose, batch, gravityReadings = [], ingredients = [] }: BatchReportModalProps) {
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

  const actualABV = batch.currentGravity && batch.actualOG
    ? ((batch.actualOG - batch.currentGravity) * 131.25).toFixed(1)
    : batch.currentABV || batch.targetABV

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
                <p className="text-xs text-text-muted mb-1">ტანკი</p>
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
                  <p className="text-lg font-mono font-bold text-copper-light">{batch.targetOG.toFixed(3)}</p>
                </div>
                <div className="bg-bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-text-muted mb-1">სამიზნე FG</p>
                  <p className="text-lg font-mono font-bold text-blue-400">{batch.targetFG.toFixed(3)}</p>
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
                    <p className="text-lg font-mono font-bold text-copper-light">{batch.actualOG.toFixed(3)}</p>
                  </div>
                )}
                {batch.currentGravity && (
                  <div className="bg-bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">მიმდინარე SG</p>
                    <p className="text-lg font-mono font-bold text-blue-400">{batch.currentGravity.toFixed(3)}</p>
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
            {gravityReadings.length > 0 && (
              <div>
                <h3 className="text-lg font-display font-semibold mb-4">სიმკვრივის გაზომვები</h3>
                <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-text-muted">
                        <th className="px-4 py-3">თარიღი</th>
                        <th className="px-4 py-3">დრო</th>
                        <th className="px-4 py-3">SG</th>
                        <th className="px-4 py-3">ტემპერატურა</th>
                        <th className="px-4 py-3">ჩაიწერა</th>
                        <th className="px-4 py-3">შენიშვნა</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gravityReadings.map((reading) => (
                        <tr key={reading.id} className="border-b border-border/50">
                          <td className="px-4 py-3 text-sm">{formatDate(reading.date)}</td>
                          <td className="px-4 py-3 text-sm font-mono">{formatTime(reading.date)}</td>
                          <td className="px-4 py-3 text-sm font-mono">{reading.gravity.toFixed(3)}</td>
                          <td className="px-4 py-3 text-sm font-mono">{reading.temperature.toFixed(1)}°C</td>
                          <td className="px-4 py-3 text-sm text-text-muted">{reading.recordedBy}</td>
                          <td className="px-4 py-3 text-sm text-text-muted">{reading.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Ingredients */}
            {ingredients.length > 0 && (
              <div>
                <h3 className="text-lg font-display font-semibold mb-4">ინგრედიენტები</h3>
                <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-text-muted">
                        <th className="px-4 py-3">ინგრედიენტი</th>
                        <th className="px-4 py-3">ტიპი</th>
                        <th className="px-4 py-3">რაოდენობა</th>
                        <th className="px-4 py-3">ერთეული</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredients.map((ingredient, idx) => (
                        <tr key={ingredient.id || `ingredient-${idx}`} className="border-b border-border/50">
                          <td className="px-4 py-3 text-sm font-medium">{ingredient.name}</td>
                          <td className="px-4 py-3 text-sm text-text-muted">{ingredient.type}</td>
                          <td className="px-4 py-3 text-sm font-mono">{ingredient.amount}</td>
                          <td className="px-4 py-3 text-sm text-text-muted">{ingredient.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Notes */}
            {batch.notes && (
              <div>
                <h3 className="text-lg font-display font-semibold mb-4">შენიშვნები</h3>
                <div className="bg-bg-card border border-border rounded-xl p-4">
                  <p className="text-sm whitespace-pre-wrap">{batch.notes}</p>
                </div>
              </div>
            )}

            {/* Brewer */}
            {batch.brewer && (
              <div>
                <p className="text-sm text-text-muted">მწეველი: <span className="font-medium">{batch.brewer}</span></p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-bg-tertiary">
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleExportPDF}>
              📄 PDF
            </Button>
            <Button variant="secondary" onClick={handleExportExcel}>
              📊 Excel
            </Button>
            <Button variant="secondary" onClick={handlePrint}>
              🖨️ ბეჭდვა
            </Button>
          </div>
          <Button variant="primary" onClick={onClose}>
            დახურვა
          </Button>
        </div>
      </div>
    </div>
  )
}
