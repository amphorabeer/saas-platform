'use client'

import { useEffect, useRef } from 'react'

interface MonthData {
  month: string
  year: number
  income: number
  expenses: number
  profit: number
}

interface FinancialChartProps {
  data: MonthData[]
  height?: number
}

export function FinancialChart({ data, height = 300 }: FinancialChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Chart dimensions
    const padding = { top: 20, right: 20, bottom: 60, left: 70 }
    const chartWidth = rect.width - padding.left - padding.right
    const chartHeight = rect.height - padding.top - padding.bottom

    // Find max value for scale
    const allValues = data.flatMap(d => [d.income, d.expenses, Math.abs(d.profit)])
    const maxValue = Math.max(...allValues, 1000) * 1.1

    // Draw grid lines
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 0.5
    const gridLines = 5
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(rect.width - padding.right, y)
      ctx.stroke()

      // Y-axis labels
      const value = maxValue - (maxValue / gridLines) * i
      ctx.fillStyle = '#888'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(formatK(value), padding.left - 10, y + 4)
    }

    // Bar width calculation
    const barGroupWidth = chartWidth / data.length
    const barWidth = barGroupWidth * 0.25
    const gap = barWidth * 0.3

    // Draw bars
    data.forEach((item, index) => {
      const x = padding.left + barGroupWidth * index + barGroupWidth / 2

      // Income bar (green)
      const incomeHeight = (item.income / maxValue) * chartHeight
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(x - barWidth - gap/2, padding.top + chartHeight - incomeHeight, barWidth, incomeHeight)

      // Expenses bar (red)
      const expenseHeight = (item.expenses / maxValue) * chartHeight
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(x + gap/2, padding.top + chartHeight - expenseHeight, barWidth, expenseHeight)

      // X-axis labels (month)
      ctx.fillStyle = '#888'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(item.month.slice(0, 3), x, rect.height - padding.bottom + 15)
    })

    // Draw profit line
    ctx.beginPath()
    ctx.strokeStyle = '#B87333'
    ctx.lineWidth = 2.5
    data.forEach((item, index) => {
      const x = padding.left + barGroupWidth * index + barGroupWidth / 2
      const y = padding.top + chartHeight - (item.profit / maxValue) * chartHeight
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Draw profit dots
    data.forEach((item, index) => {
      const x = padding.left + barGroupWidth * index + barGroupWidth / 2
      const y = padding.top + chartHeight - (item.profit / maxValue) * chartHeight
      
      ctx.beginPath()
      ctx.fillStyle = '#B87333'
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    })

    // Legend
    const legendY = rect.height - 20
    const legendItems = [
      { color: '#22c55e', label: 'შემოსავალი' },
      { color: '#ef4444', label: 'ხარჯი' },
      { color: '#B87333', label: 'მოგება' },
    ]
    
    let legendX = padding.left
    legendItems.forEach(item => {
      ctx.fillStyle = item.color
      ctx.fillRect(legendX, legendY - 8, 12, 12)
      ctx.fillStyle = '#888'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(item.label, legendX + 16, legendY + 2)
      legendX += ctx.measureText(item.label).width + 40
    })

  }, [data, height])

  const formatK = (value: number): string => {
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toFixed(0)
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        მონაცემები არ არის
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height }}
      className="w-full"
    />
  )
}
