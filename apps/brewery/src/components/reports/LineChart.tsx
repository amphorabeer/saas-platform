'use client'

import { useState } from 'react'

interface DataPoint {
  label: string
  value: number
}

interface LineChartProps {
  data: DataPoint[]
  color?: string
  fillArea?: boolean
  height?: number
  formatValue?: (value: number) => string
  showDots?: boolean
}

export function LineChart({ 
  data, 
  color = '#B87333', 
  fillArea = true, 
  height = 200,
  formatValue = (v) => `${v.toLocaleString('ka-GE')}₾`,
  showDots = true,
}: LineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-text-muted" style={{ height }}>
        მონაცემები არ არის
      </div>
    )
  }

  const values = data.map(d => d.value)
  const max = Math.max(...values) * 1.1
  const min = Math.min(...values) * 0.9
  const range = max - min || 1
  
  const padding = { top: 20, right: 20, bottom: 30, left: 60 }
  const chartWidth = 100
  const chartHeight = height - padding.top - padding.bottom

  // Calculate points as percentages
  const points = data.map((item, index) => {
    const x = padding.left + (index / (data.length - 1)) * (chartWidth - padding.left - padding.right)
    const y = padding.top + chartHeight - ((item.value - min) / range) * chartHeight
    return { x, y, ...item }
  })

  // Create SVG path
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  
  // Area path
  const areaPath = fillArea
    ? `${pathData} L ${points[points.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`
    : ''

  return (
    <div className="w-full relative" style={{ height: `${height + 40}px` }}>
      <svg 
        width="100%" 
        height={height} 
        viewBox={`0 0 100 ${height}`} 
        preserveAspectRatio="none"
        className="absolute"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding.top + chartHeight * (1 - ratio)
          return (
            <line
              key={i}
              x1={padding.left}
              y1={y}
              x2={chartWidth - padding.right}
              y2={y}
              stroke="currentColor"
              strokeWidth="0.5"
              strokeOpacity="0.15"
              className="text-text-muted"
            />
          )
        })}

        {/* Area fill */}
        {fillArea && areaPath && (
          <path d={areaPath} fill={color} fillOpacity="0.15" />
        )}

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Points */}
        {showDots && points.map((point, index) => {
          const isHovered = hoveredIndex === index
          return (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r={isHovered ? 4 : 3}
                fill={color}
                stroke="white"
                strokeWidth={isHovered ? 2 : 1}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          )
        })}
      </svg>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-text-muted w-14 text-right pr-2">
        {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
          <span key={ratio}>{formatValue(Math.round(min + range * ratio))}</span>
        ))}
      </div>

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-14 right-0 flex justify-between text-xs text-text-muted pb-2">
        {data.map((item, index) => (
          <span key={index}>{item.label}</span>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredIndex !== null && points[hoveredIndex] && (
        <div 
          className="absolute px-2 py-1 bg-bg-primary border border-border rounded-lg shadow-lg z-20 pointer-events-none"
          style={{
            left: `${points[hoveredIndex].x}%`,
            top: `${points[hoveredIndex].y - 35}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="text-xs font-medium text-text-primary">{points[hoveredIndex].label}</div>
          <div className="text-xs text-copper">{formatValue(points[hoveredIndex].value)}</div>
        </div>
      )}
    </div>
  )
}
