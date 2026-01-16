'use client'

import { useState } from 'react'

interface SourceBatch {
  batchNumber: string
  volume?: number
  percentage?: number
  brewDate?: string
}

interface BlendBadgeProps {
  /** Number of batches in the blend */
  batchCount: number
  /** Source batches information */
  sourceBatches?: SourceBatch[]
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show tooltip on hover */
  showTooltip?: boolean
  /** Custom className */
  className?: string
}

/**
 * BlendBadge - Visual indicator for blended batches
 * 
 * Shows a purple badge with blend icon when a lot contains multiple batches.
 * Hovering reveals the source batches.
 */
export function BlendBadge({ 
  batchCount, 
  sourceBatches = [],
  size = 'md',
  showTooltip = true,
  className = ''
}: BlendBadgeProps) {
  const [isHovered, setIsHovered] = useState(false)

  if (batchCount <= 1) return null

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2'
  }

  const iconSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm'
  }

  return (
    <div 
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Badge */}
      <span 
        className={`
          inline-flex items-center rounded-full font-medium
          bg-purple-500/20 text-purple-400 border border-purple-500/30
          ${sizeStyles[size]}
        `}
      >
        <span className={iconSizes[size]}>🔄</span>
        <span>{batchCount} შერეული</span>
      </span>

      {/* Tooltip */}
      {showTooltip && isHovered && sourceBatches.length > 0 && (
        <div className="absolute top-full left-0 mt-2 z-50 min-w-[200px]">
          <div className="bg-bg-card border border-border rounded-lg shadow-xl p-3">
            <p className="text-xs text-text-muted mb-2 font-medium">წყარო ბეჩები:</p>
            <div className="space-y-2">
              {sourceBatches.map((batch, index) => (
                <div 
                  key={batch.batchNumber || index} 
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-mono text-copper-light">{batch.batchNumber}</span>
                  {batch.volume && (
                    <span className="text-text-muted text-xs">
                      {batch.volume}L
                      {batch.percentage && ` (${batch.percentage}%)`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * BlendIndicator - Compact inline indicator for table rows
 */
interface BlendIndicatorProps {
  batchCount: number
  sourceBatches?: SourceBatch[]
}

export function BlendIndicator({ batchCount, sourceBatches = [] }: BlendIndicatorProps) {
  const [isHovered, setIsHovered] = useState(false)

  if (batchCount <= 1) return null

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="text-purple-400 text-xs cursor-help">
        🔄 +{batchCount - 1} ბეჩი
      </span>

      {/* Tooltip */}
      {isHovered && sourceBatches.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px]">
          <div className="bg-bg-card border border-border rounded-lg shadow-xl p-2">
            <p className="text-[10px] text-text-muted mb-1">შერეული:</p>
            {sourceBatches.map((batch, index) => (
              <p key={index} className="text-xs font-mono text-copper-light">
                {batch.batchNumber}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * SourceBatchesSection - Full section for batch detail page
 */
interface SourceBatchesSectionProps {
  sourceBatches: SourceBatch[]
  totalVolume?: number
  blendDate?: string
}

export function SourceBatchesSection({ 
  sourceBatches, 
  totalVolume,
  blendDate 
}: SourceBatchesSectionProps) {
  if (sourceBatches.length <= 1) return null

  return (
    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🔄</span>
        <h3 className="font-display font-semibold text-lg text-purple-400">
          შერეული ლოტი
        </h3>
        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
          {sourceBatches.length} ბეჩი
        </span>
      </div>

      {/* Blend Info */}
      {(totalVolume || blendDate) && (
        <div className="flex gap-6 mb-4 text-sm">
          {totalVolume && (
            <div>
              <span className="text-text-muted">სულ მოცულობა: </span>
              <span className="font-mono">{totalVolume}L</span>
            </div>
          )}
          {blendDate && (
            <div>
              <span className="text-text-muted">შერევის თარიღი: </span>
              <span>{blendDate}</span>
            </div>
          )}
        </div>
      )}

      {/* Source Batches List */}
      <div className="space-y-3">
        <p className="text-sm text-text-muted font-medium">წყარო ბეჩები:</p>
        {sourceBatches.map((batch, index) => (
          <div 
            key={batch.batchNumber || index}
            className="bg-bg-tertiary rounded-lg p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs">
                {index + 1}
              </span>
              <div>
                <p className="font-mono text-copper-light">{batch.batchNumber}</p>
                {batch.brewDate && (
                  <p className="text-xs text-text-muted">დამზადდა: {batch.brewDate}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              {batch.volume && (
                <p className="font-mono">{batch.volume}L</p>
              )}
              {batch.percentage && (
                <p className="text-xs text-text-muted">{batch.percentage}%</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BlendBadge