'use client'

import { useState } from 'react'

interface DonutChartProps {
  data: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  centerText?: string
  centerSubtext?: string
  showLegend?: boolean
}

export function DonutChart({ 
  data, 
  size = 180, 
  thickness = 24, 
  centerText,
  centerSubtext,
  showLegend = true,
}: DonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let currentOffset = 0
  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0
    const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`
    const strokeDashoffset = -currentOffset
    currentOffset += (item.value / total) * circumference
    
    return {
      ...item,
      percentage,
      strokeDasharray,
      strokeDashoffset,
      index,
    }
  })

  return (
    <div className={`flex ${showLegend ? 'items-center gap-6' : 'justify-center'}`}>
      {/* Chart */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
            className="text-bg-tertiary"
          />
          
          {/* Segments */}
          {segments.map((segment) => {
            const isHovered = hoveredIndex === segment.index
            return (
              <circle
                key={segment.index}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={isHovered ? thickness + 4 : thickness}
                strokeDasharray={segment.strokeDasharray}
                strokeDashoffset={segment.strokeDashoffset}
                strokeLinecap="round"
                className={`transition-all duration-200 cursor-pointer ${
                  hoveredIndex !== null && hoveredIndex !== segment.index ? 'opacity-50' : 'opacity-100'
                }`}
                onMouseEnter={() => setHoveredIndex(segment.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            )
          })}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {hoveredIndex !== null ? (
              <>
                <div className="text-lg font-bold text-text-primary">
                  {segments[hoveredIndex].percentage.toFixed(1)}%
                </div>
                <div className="text-xs text-text-muted">
                  {segments[hoveredIndex].label}
                </div>
              </>
            ) : (
              <>
                {centerText && (
                  <div className="text-xl font-bold text-copper">{centerText}</div>
                )}
                {centerSubtext && (
                  <div className="text-xs text-text-muted">{centerSubtext}</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex-1 space-y-2">
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0
            const isHovered = hoveredIndex === index
            return (
              <div
                key={index}
                className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                  hoveredIndex !== null && hoveredIndex !== index ? 'opacity-50' : ''
                }`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <span className="text-sm text-text-primary truncate">{item.label}</span>
                  <span className={`text-sm font-medium ${isHovered ? 'text-copper' : 'text-text-muted'}`}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
