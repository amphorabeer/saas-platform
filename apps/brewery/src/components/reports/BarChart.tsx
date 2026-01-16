'use client'

import { useState } from 'react'

interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  maxValue?: number
  color?: string
  height?: number
  showLabels?: boolean
  showGrid?: boolean
  formatValue?: (value: number) => string
}

export function BarChart({ 
  data, 
  maxValue, 
  color = 'copper', 
  height = 200, 
  showLabels = true,
  showGrid = true,
  formatValue = (v) => v.toLocaleString('ka-GE'),
}: BarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  const max = maxValue || Math.max(...data.map(d => d.value)) * 1.1
  const colorClass = color === 'copper' 
    ? 'bg-gradient-to-t from-copper to-copper-light' 
    : `bg-${color}-500`

  return (
    <div className="w-full" style={{ height: `${height + 50}px` }}>
      {/* Chart Container */}
      <div className="relative w-full flex" style={{ height: `${height}px` }}>
        {/* Y-axis labels */}
        {showLabels && (
          <div className="flex flex-col justify-between text-xs text-text-muted pr-2 w-12">
            {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
              <span key={ratio} className="text-right">
                {formatValue(Math.round(max * ratio))}
              </span>
            ))}
          </div>
        )}

        {/* Bars Container */}
        <div className="flex-1 relative">
          {/* Grid Lines */}
          {showGrid && (
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-t border-border/30" />
              ))}
            </div>
          )}

          {/* Bars */}
          <div className="flex items-end h-full gap-1 relative z-10">
            {data.map((item, index) => {
              const barHeight = max > 0 ? (item.value / max) * 100 : 0
              const isHovered = hoveredIndex === index
              
              return (
                <div
                  key={index}
                  className="flex-1 relative group cursor-pointer"
                  style={{ height: '100%' }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Bar */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                    <div
                      className={`w-4/5 rounded-t transition-all duration-200 ${
                        item.color ? '' : colorClass
                      } ${isHovered ? 'opacity-100 scale-105' : 'opacity-80'}`}
                      style={{ 
                        height: `${barHeight}%`, 
                        minHeight: item.value > 0 ? '4px' : '0',
                        backgroundColor: item.color || undefined,
                      }}
                    />
                  </div>

                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-bg-primary border border-border rounded-lg shadow-lg z-20 whitespace-nowrap">
                      <div className="text-xs font-medium text-text-primary">{item.label}</div>
                      <div className="text-xs text-copper">{formatValue(item.value)}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      {showLabels && (
        <div className="flex mt-2" style={{ marginLeft: '48px' }}>
          {data.map((item, index) => (
            <div key={index} className="flex-1 text-center">
              <span className="text-xs text-text-muted">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
