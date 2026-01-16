'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui'

interface LotReportModalProps {
  lot: {
    id: string
    lotNumber: string
    lotCode: string
    phase: string
    status: string
    notes: string | null
    plannedVolume: number | null
    actualVolume: number | null
    createdAt: string
    updatedAt: string
    batches: {
      id: string
      batchNumber: string
      recipeName: string | null
      recipeStyle: string | null
      volume: number | null
      volumeContribution: number | null
      batchPercentage: number | null
      status: string
      originalGravity: number | null
      currentGravity: number | null
      brewedAt: string | null
      packagedVolume?: number | null
      gravityReadings?: {
        id: string
        gravity: number
        temperature: number | null
        notes: string | null
        recordedAt: string
      }[]
      packagingRuns?: {
        id: string
        packageType: string
        quantity: number
        volumeTotal: number
        lotNumber: string | null
        performedBy: string | null
        performedAt: string | null
        notes: string | null
      }[]
    }[]
    // ✅ Aggregated packaging runs from all batches
    packagingRuns?: {
      id: string
      batchNumber: string
      packageType: string
      quantity: number
      volumeTotal: number
      lotNumber: string | null
      performedBy: string | null
      performedAt: string | null
      notes: string | null
    }[]
    tank: {
      id: string
      name: string
      type: string
      capacity: number | null
    } | null
    tankAssignment: {
      id: string
      phase: string
      status: string
      startTime: string | null
      endTime: string | null
      plannedVolume: number | null
      actualVolume: number | null
    } | null
  }
  isOpen: boolean
  onClose: () => void
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ka-GE', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getPhaseLabel = (phase: string) => {
  const labels: Record<string, string> = {
    'FERMENTATION': 'ფერმენტაცია',
    'CONDITIONING': 'კონდიცირება',
    'BRIGHT': 'მზადაა',
    'PACKAGING': 'დაფასოება',
  }
  return labels[phase] || phase
}

// ✅ Package type names and icons
const getPackageTypeName = (type: string) => {
  const names: Record<string, string> = {
    'KEG_50': 'კეგი 50L',
    'KEG_30': 'კეგი 30L',
    'KEG_20': 'კეგი 20L',
    'BOTTLE_750': 'ბოთლი 750ml',
    'BOTTLE_500': 'ბოთლი 500ml',
    'BOTTLE_330': 'ბოთლი 330ml',
    'CAN_500': 'ქილა 500ml',
    'CAN_330': 'ქილა 330ml',
  }
  return names[type] || type
}

const getPackageIcon = (type: string) => {
  if (type.startsWith('KEG')) return '🛢️'
  if (type.startsWith('BOTTLE')) return '🍾'
  if (type.startsWith('CAN')) return '🥫'
  return '📦'
}

// ✅ Convert SG to Plato
const sgToPlato = (sg: number): number => {
  if (!sg || sg < 0.9) return 0
  return (-1 * 616.868) + (1111.14 * sg) - (630.272 * sg * sg) + (135.997 * sg * sg * sg)
}

// ✅ Format gravity based on user preference
const formatGravity = (sg: number | null | undefined, usePlato: boolean): string => {
  if (sg == null || sg === 0) return '-'
  if (usePlato) {
    const plato = sgToPlato(sg)
    return `${plato.toFixed(1)}°P`
  }
  return sg.toFixed(3)
}

// ✅ Get gravity unit from localStorage
const getGravityUnit = (): 'SG' | 'PLATO' => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('gravityUnit') as 'SG' | 'PLATO') || 'PLATO'
  }
  return 'PLATO'
}

export function LotReportModal({ lot, isOpen, onClose }: LotReportModalProps) {
  const printRef = useRef<HTMLDivElement>(null)
  
  // ✅ Check gravity unit preference
  const usePlato = getGravityUnit() === 'PLATO'
  
  // Calculate totals
  const totalVolume = lot.batches.reduce((sum, b) => sum + (b.volumeContribution || b.volume || 0), 0)
  const packagedVolume = lot.batches.reduce((sum, b) => sum + (b.packagedVolume || 0), 0)
  const remainingVolume = Math.max(0, totalVolume - packagedVolume)
  
  // Collect all gravity readings
  const allReadings = lot.batches.flatMap(batch => 
    (batch.gravityReadings || []).map(r => ({
      ...r,
      batchNumber: batch.batchNumber
    }))
  ).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
  
  // Calculate OG/FG from readings
  const ogReadings = allReadings.filter(r => 
    r.notes?.includes('OG') || r.notes?.includes('ფერმენტაცია') || r.notes?.includes('საწყისი')
  )
  const fgReadings = allReadings.filter(r => 
    r.notes?.includes('FG') || r.notes?.includes('კონდიცირება') || r.notes?.includes('საბოლოო')
  )
  
  const avgOG = ogReadings.length > 0 
    ? ogReadings.reduce((sum, r) => sum + r.gravity, 0) / ogReadings.length 
    : null
  const avgFG = fgReadings.length > 0 
    ? fgReadings.reduce((sum, r) => sum + r.gravity, 0) / fgReadings.length 
    : null
  
  // Calculate ABV
  const abv = avgOG && avgFG ? ((avgOG - avgFG) * 131.25).toFixed(1) : null
  
  // Build timeline events
  const timelineEvents: Array<{
    date: Date
    icon: string
    title: string
    subtitle: string
  }> = []
  
  // Lot created
  timelineEvents.push({
    date: new Date(lot.createdAt),
    icon: '🔄',
    title: 'ლოტი შეიქმნა',
    subtitle: `${lot.batches.length} პარტია`
  })
  
  // Batches
  lot.batches.forEach(batch => {
    if (batch.brewedAt) {
      timelineEvents.push({
        date: new Date(batch.brewedAt),
        icon: '🍺',
        title: `${batch.batchNumber}`,
        subtitle: `${batch.volume || 0}L • ${batch.recipeName || ''}`
      })
    }
  })
  
  // Phase changes from readings
  allReadings.forEach(r => {
    let icon = '📊'
    let title = 'გაზომვა'
    const notes = r.notes || ''
    
    // Check for phase change markers - ORDER MATTERS!
    // PACKAGING must be checked BEFORE BRIGHT because PACKAGING notes contain "BRIGHT → PACKAGING"
    if (notes.includes('დაფასოება დაიწყო') || notes.includes('→ PACKAGING')) {
      icon = '📦'
      title = 'დაფასოება დაიწყო'
    } else if (notes.includes('დასრულდა') || notes.includes('COMPLETED')) {
      icon = '✅'
      title = 'ლოტი დასრულდა'
    } else if (notes.includes('მზადაა') || notes.includes('→ BRIGHT')) {
      icon = '✨'
      title = 'მზადაა (Bright)'
    } else if (notes.includes('ფერმენტაცია') || notes.includes('OG')) {
      icon = '🧪'
      title = 'ფერმენტაცია'
    } else if (notes.includes('კონდიცირება') || notes.includes('FG')) {
      icon = '❄️'
      title = 'კონდიცირება'
    } else if (notes.includes('შერევა')) {
      icon = '🔀'
      title = 'შერევა'
    }
    
    // Build subtitle based on whether it's a phase marker or actual measurement
    const isPhaseMarker = r.gravity === 0
    const subtitle = isPhaseMarker 
      ? notes.replace(/[✨📦✅🧪❄️🔀]/g, '').trim()
      : `${usePlato ? '°P' : 'SG'}: ${formatGravity(r.gravity, usePlato)} @ ${r.temperature || '-'}°C`
    
    timelineEvents.push({
      date: new Date(r.recordedAt),
      icon,
      title,
      subtitle
    })
  });
  
  // ✅ Add packaging events to timeline
  const packagingRuns = lot.packagingRuns || [];
  packagingRuns.forEach(run => {
    if (run.performedAt) {
      timelineEvents.push({
        date: new Date(run.performedAt),
        icon: getPackageIcon(run.packageType),
        title: `ჩამოსხმა: ${getPackageTypeName(run.packageType)}`,
        subtitle: `${run.quantity} ცალი (${run.volumeTotal.toFixed(1)}L)`
      })
    }
  });
  
  timelineEvents.sort((a, b) => a.date.getTime() - b.date.getTime())
  
  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    printWindow.document.write(`
      <html>
        <head>
          <title>ლოტის ანგარიში - ${lot.lotCode}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            h2 { font-size: 18px; margin: 20px 0 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .subtitle { color: #666; font-size: 14px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .stat { background: #f5f5f5; padding: 10px; border-radius: 5px; }
            .stat-label { font-size: 12px; color: #666; }
            .stat-value { font-size: 18px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .timeline { list-style: none; padding: 0; }
            .timeline li { padding: 10px 0; border-left: 2px solid #ddd; padding-left: 20px; margin-left: 10px; }
            .timeline li:before { content: '●'; position: absolute; margin-left: -26px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-dark-800 rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold">📋 ლოტის ანგარიში</h2>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-2xl"
          >
            ×
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          <div ref={printRef} className="space-y-6">
            {/* Header */}
            <div className="text-center pb-4 border-b border-border">
              <h1 className="text-2xl font-bold">{lot.lotCode}</h1>
              <p className="text-text-muted">
                🔄 შერეული ({lot.batches.length} პარტია) • {getPhaseLabel(lot.phase)}
              </p>
            </div>
        
        {/* Summary Stats */}
        <div>
          <h2 className="text-lg font-semibold mb-3">📊 შეჯამება</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-dark-700 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-copper-400">{totalVolume}L</div>
              <div className="text-xs text-text-muted">მოცულობა</div>
            </div>
            <div className="bg-dark-700 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">{packagedVolume.toFixed(1)}L</div>
              <div className="text-xs text-text-muted">დაფასოებული</div>
            </div>
            <div className="bg-dark-700 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">{formatGravity(avgOG, usePlato)}</div>
              <div className="text-xs text-text-muted">OG (საშ.)</div>
            </div>
            <div className="bg-dark-700 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-cyan-400">{formatGravity(avgFG, usePlato)}</div>
              <div className="text-xs text-text-muted">FG (საშ.)</div>
            </div>
            {abv && (
              <div className="bg-dark-700 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-amber-400">{abv}%</div>
                <div className="text-xs text-text-muted">ABV</div>
              </div>
            )}
            <div className="bg-dark-700 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-400">{lot.tank?.name || '-'}</div>
              <div className="text-xs text-text-muted">ავზი</div>
            </div>
          </div>
        </div>
        
        {/* Batches */}
        <div>
          <h2 className="text-lg font-semibold mb-3">🍺 პარტიები</h2>
          <div className="space-y-2">
            {lot.batches.map((batch, idx) => (
              <div key={batch.id} className="bg-dark-700 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold">{batch.batchNumber}</span>
                    <span className="text-text-muted ml-2">{batch.recipeName}</span>
                  </div>
                  <span className="text-copper-400 font-bold">{batch.volumeContribution || batch.volume}L</span>
                </div>
                <div className="text-sm text-text-muted mt-1">
                  OG: {formatGravity(batch.originalGravity, usePlato)} • 
                  FG: {formatGravity(batch.currentGravity, usePlato)} • 
                  ხარშვა: {batch.brewedAt ? formatDate(batch.brewedAt) : '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* ✅ Packaging History */}
        {(lot.packagingRuns && lot.packagingRuns.length > 0) && (
          <div>
            <h2 className="text-lg font-semibold mb-3">📦 ჩამოსხმის ისტორია</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dark-700">
                    <th className="p-2 text-left">თარიღი</th>
                    <th className="p-2 text-left">ტიპი</th>
                    <th className="p-2 text-right">რაოდენობა</th>
                    <th className="p-2 text-right">მოცულობა</th>
                    <th className="p-2 text-left">შემსრულებელი</th>
                  </tr>
                </thead>
                <tbody>
                  {lot.packagingRuns.map((run, idx) => (
                    <tr key={run.id || idx} className="border-t border-border">
                      <td className="p-2">{run.performedAt ? formatDateTime(run.performedAt) : '-'}</td>
                      <td className="p-2">
                        <span className="mr-1">{getPackageIcon(run.packageType)}</span>
                        {getPackageTypeName(run.packageType)}
                      </td>
                      <td className="p-2 text-right font-mono">{run.quantity} ცალი</td>
                      <td className="p-2 text-right font-mono text-copper-400">{run.volumeTotal.toFixed(1)}L</td>
                      <td className="p-2 text-text-muted">{run.performedBy || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-dark-600">
                    <td colSpan={3} className="p-2 font-semibold text-right">სულ:</td>
                    <td className="p-2 text-right font-mono font-bold text-green-400">
                      {lot.packagingRuns.reduce((sum, r) => sum + r.volumeTotal, 0).toFixed(1)}L
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
        
        {/* Timeline */}
        <div>
          <h2 className="text-lg font-semibold mb-3">📅 ისტორია</h2>
          <div className="space-y-2">
            {timelineEvents.map((event, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2 bg-dark-700 rounded">
                <span className="text-xl">{event.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-text-muted">{event.subtitle}</div>
                </div>
                <div className="text-xs text-text-muted">{formatDateTime(event.date.toISOString())}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* All Readings Table */}
        <div>
          <h2 className="text-lg font-semibold mb-3">📈 ყველა გაზომვა და მოვლენები</h2>
          {allReadings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dark-700">
                    <th className="p-2 text-left">თარიღი</th>
                    <th className="p-2 text-left">პარტია</th>
                    <th className="p-2 text-right">{usePlato ? '°P' : 'SG'}</th>
                    <th className="p-2 text-right">°C</th>
                    <th className="p-2 text-left">შენიშვნა</th>
                  </tr>
                </thead>
                <tbody>
                  {allReadings.map((r, idx) => {
                    const isPhaseMarker = r.gravity === 0
                    return (
                      <tr 
                        key={r.id || idx} 
                        className={`border-t border-border ${isPhaseMarker ? 'bg-purple-500/10' : ''}`}
                      >
                        <td className="p-2">{formatDateTime(r.recordedAt)}</td>
                        <td className="p-2">{r.batchNumber}</td>
                        <td className="p-2 text-right font-mono">
                          {isPhaseMarker ? '-' : formatGravity(r.gravity, usePlato)}
                        </td>
                        <td className="p-2 text-right">{r.temperature || '-'}</td>
                        <td className="p-2 text-text-muted text-xs">{r.notes || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-text-muted text-center py-4">გაზომვები არ არის</p>
          )}
        </div>
      </div>
      </div>
      
      {/* Actions */}
      <div className="flex justify-end gap-3 p-4 border-t border-border">
        <Button variant="secondary" onClick={onClose}>დახურვა</Button>
        <Button variant="primary" onClick={handlePrint}>🖨️ ბეჭდვა</Button>
      </div>
      </div>
    </div>
  )
}