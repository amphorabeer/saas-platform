'use client'



import { useState } from 'react'



interface LineChartProps {

  data: { label: string; value: number }[]

  color?: string

  fillArea?: boolean

  height?: number

}



export function LineChart({ data, color = '#B87333', fillArea = true, height = 200 }: LineChartProps) {

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  

  const max = Math.max(...data.map(d => d.value))

  const min = Math.min(...data.map(d => d.value))

  const range = max - min || 1

  const padding = 20

  const chartWidth = 100 - (padding * 2 / data.length)

  const chartHeight = height - padding * 2

  const pointRadius = 4

  const strokeWidth = 2



  // Calculate points

  const points = data.map((item, index) => {

    const x = padding + (index / (data.length - 1)) * chartWidth

    const y = padding + chartHeight - ((item.value - min) / range) * chartHeight

    return { x, y, ...item }

  })



  // Create path for line

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  

  // Create path for area fill

  const areaPath = fillArea

    ? `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`

    : ''



  return (

    <div className="w-full relative" style={{ height: `${height + 60}px` }}>

      <svg width="100%" height={height} className="overflow-visible">

        {/* Grid lines */}

        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {

          const y = padding + chartHeight * (1 - ratio)

          return (

            <line

              key={i}

              x1={padding}

              y1={y}

              x2={100 - padding}

              y2={y}

              stroke="currentColor"

              strokeWidth="1"

              strokeOpacity="0.1"

              className="text-text-muted"

            />

          )

        })}



        {/* Y-axis labels */}

        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {

          const y = padding + chartHeight * (1 - ratio)

          const value = Math.round(min + range * ratio)

          return (

            <text

              key={i}

              x={padding - 8}

              y={y + 4}

              textAnchor="end"

              className="text-xs fill-text-muted"

            >

              {value.toLocaleString('en-US')}

            </text>

          )

        })}



        {/* Area fill */}

        {fillArea && areaPath && (

          <path

            d={areaPath}

            fill={color}

            fillOpacity="0.1"

          />

        )}



        {/* Line */}

        <path

          d={pathData}

          fill="none"

          stroke={color}

          strokeWidth={strokeWidth}

          strokeLinecap="round"

          strokeLinejoin="round"

        />



        {/* Points */}

        {points.map((point, index) => {

          const isHovered = hoveredIndex === index

          return (

            <g key={index}>

              <circle

                cx={point.x}

                cy={point.y}

                r={isHovered ? pointRadius + 2 : pointRadius}

                fill={color}

                stroke="currentColor"

                strokeWidth={isHovered ? 2 : 0}

                className="cursor-pointer transition-all"

                onMouseEnter={() => setHoveredIndex(index)}

                onMouseLeave={() => setHoveredIndex(null)}

              />

              {/* Tooltip */}

              {isHovered && (

                <g>

                  <rect

                    x={point.x - 30}

                    y={point.y - 35}

                    width="60"

                    height="25"

                    rx="4"

                    fill="currentColor"

                    className="fill-bg-primary"

                    stroke="currentColor"

                    strokeWidth="1"

                    className="stroke-border"

                  />

                  <text

                    x={point.x}

                    y={point.y - 18}

                    textAnchor="middle"

                    className="text-xs fill-text-primary font-medium"

                  >

                    {point.label}: {point.value.toLocaleString('en-US')}₾

                  </text>

                </g>

              )}

            </g>

          )

        })}

      </svg>



      {/* X-axis labels */}

      <div className="flex mt-4" style={{ paddingLeft: `${padding}%`, paddingRight: `${padding}%` }}>

        {data.map((item, index) => (

          <div key={index} className="flex-1 text-center">

            <span className="text-xs text-text-muted">{item.label}</span>

          </div>

        ))}

      </div>

    </div>

  )

}

