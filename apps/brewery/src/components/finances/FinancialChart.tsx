'use client'

import { MonthlyFinancials } from '@/data/financeData'
import { formatCurrency } from '@/lib/utils'
import { useState } from 'react'

interface FinancialChartProps {
  data: MonthlyFinancials[]
  showIncome?: boolean
  showExpenses?: boolean
  showProfit?: boolean
  height?: number
}

export function FinancialChart({
  data,
  showIncome = true,
  showExpenses = true,
  showProfit = true,
  height = 300
}: FinancialChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const maxValue = Math.max(
    ...data.map(d => Math.max(d.income, d.expenses, d.profit))
  )

  const getBarHeight = (value: number) => {
    return (value / maxValue) * (height - 60)
  }

  const getBarX = (index: number, barIndex: number) => {
    const barWidth = 20
    const spacing = 40
    const startX = 60 + index * spacing
    return startX + barIndex * (barWidth + 2)
  }

  const getLineY = (value: number) => {
    return height - 40 - getBarHeight(value)
  }

  return (
    <div className="relative" style={{ height: `${height}px` }}>
      <svg width="100%" height={height} className="overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = height - 40 - ratio * (height - 60)
          const value = Math.round(maxValue * ratio)
          return (
            <g key={ratio}>
              <line
                x1="60"
                y1={y}
                x2="100%"
                y2={y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-border opacity-30"
              />
              <text
                x="55"
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-text-muted"
              >
                {formatCurrency(value)}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((monthData, index) => {
          const x = getBarX(index, 0)
          return (
            <g key={index}>
              {showIncome && (
                <rect
                  x={x}
                  y={getLineY(monthData.income)}
                  width={20}
                  height={getBarHeight(monthData.income)}
                  fill="#10b981"
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              )}
              {showExpenses && (
                <rect
                  x={x + (showIncome ? 22 : 0)}
                  y={getLineY(monthData.expenses)}
                  width={20}
                  height={getBarHeight(monthData.expenses)}
                  fill="#ef4444"
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              )}
            </g>
          )
        })}

        {/* Profit line */}
        {showProfit && (
          <polyline
            points={data.map((monthData, index) => {
              const x = getBarX(index, 0) + 10
              const y = getLineY(monthData.profit)
              return `${x},${y}`
            }).join(' ')}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="5,5"
            className="opacity-70"
          />
        )}

        {/* Profit points */}
        {showProfit && data.map((monthData, index) => {
          const x = getBarX(index, 0) + 10
          const y = getLineY(monthData.profit)
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="4"
              fill="#10b981"
              className="hover:r-6 transition-all cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          )
        })}

        {/* X-axis labels */}
        {data.map((monthData, index) => {
          const x = getBarX(index, 0) + 10
          return (
            <text
              key={index}
              x={x}
              y={height - 10}
              textAnchor="middle"
              className="text-xs fill-text-muted"
            >
              {monthData.month}
            </text>
          )
        })}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div
          className="absolute bg-bg-card border border-border rounded-lg p-3 shadow-lg z-10 pointer-events-none"
          style={{
            left: `${getBarX(hoveredIndex, 0) + 10}px`,
            top: '10px',
            transform: 'translateX(-50%)'
          }}
        >
          <div className="text-sm font-semibold text-text-primary mb-2">
            {data[hoveredIndex].month} {data[hoveredIndex].year}
          </div>
          {showIncome && (
            <div className="text-xs text-green-400 mb-1">
              შემოსავალი: {formatCurrency(data[hoveredIndex].income)}
            </div>
          )}
          {showExpenses && (
            <div className="text-xs text-red-400 mb-1">
              ხარჯები: {formatCurrency(data[hoveredIndex].expenses)}
            </div>
          )}
          {showProfit && (
            <div className="text-xs text-emerald-400">
              მოგება: {formatCurrency(data[hoveredIndex].profit)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

