'use client'



import { useState } from 'react'



interface BarChartProps {

  data: { label: string; value: number }[]

  maxValue?: number

  color?: string

  height?: number

  showLabels?: boolean

}



export function BarChart({ data, maxValue, color = 'copper', height = 200, showLabels = true }: BarChartProps) {

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  

  const max = maxValue || Math.max(...data.map(d => d.value))

  const barWidth = 100 / data.length

  const colorClass = color === 'copper' ? 'bg-gradient-to-t from-copper to-copper-light' : `bg-${color}-500`



  return (

    <div className="w-full" style={{ height: `${height + 60}px` }}>

      {/* Chart Container */}

      <div className="relative w-full" style={{ height: `${height}px` }}>

        {/* Y-axis labels */}

        {showLabels && (

          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-text-muted pr-2" style={{ width: '40px' }}>

            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (

              <span key={ratio}>{Math.round(max * ratio)}</span>

            ))}

          </div>

        )}



        {/* Bars */}

        <div className="flex items-end h-full gap-1" style={{ marginLeft: showLabels ? '48px' : '0' }}>

          {data.map((item, index) => {

            const barHeight = (item.value / max) * 100

            const isHovered = hoveredIndex === index

            

            return (

              <div

                key={index}

                className="flex-1 relative group"

                style={{ height: '100%' }}

                onMouseEnter={() => setHoveredIndex(index)}

                onMouseLeave={() => setHoveredIndex(null)}

              >

                {/* Bar */}

                <div

                  className={`w-full rounded-t transition-all duration-300 ${colorClass} ${

                    isHovered ? 'opacity-90 scale-105' : 'opacity-80'

                  }`}

                  style={{ height: `${barHeight}%`, minHeight: '4px' }}

                />



                {/* Tooltip */}

                {isHovered && (

                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-bg-primary border border-border rounded-lg shadow-lg z-10 whitespace-nowrap">

                    <div className="text-sm font-medium">{item.label}</div>

                    <div className="text-xs text-copper-light">{item.value.toLocaleString('en-US')}</div>

                  </div>

                )}

              </div>

            )

          })}

        </div>

      </div>



      {/* X-axis labels */}

      {showLabels && (

        <div className="flex mt-4" style={{ marginLeft: showLabels ? '48px' : '0' }}>

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

