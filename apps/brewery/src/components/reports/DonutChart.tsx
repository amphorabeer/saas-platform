'use client'



import { useState } from 'react'



interface DonutChartProps {

  data: { label: string; value: number; color: string }[]

  size?: number

  thickness?: number

  centerText?: string

}



export function DonutChart({ data, size = 200, thickness = 30, centerText }: DonutChartProps) {

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  

  const total = data.reduce((sum, item) => sum + item.value, 0)

  const radius = (size - thickness) / 2

  const circumference = 2 * Math.PI * radius

  const center = size / 2



  let currentOffset = 0

  const segments = data.map((item, index) => {

    const percentage = (item.value / total) * 100

    const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`

    const strokeDashoffset = -currentOffset

    currentOffset += (item.value / total) * circumference

    const rotation = (currentOffset - (item.value / total) * circumference) / circumference * 360 - 90

    

    return {

      ...item,

      percentage,

      strokeDasharray,

      strokeDashoffset,

      rotation,

      index,

    }

  })



  return (

    <div className="flex items-center gap-8">

      {/* Chart */}

      <div className="relative" style={{ width: size, height: size }}>

        <svg width={size} height={size} className="transform -rotate-90">

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

                strokeWidth={thickness}

                strokeDasharray={segment.strokeDasharray}

                strokeDashoffset={segment.strokeDashoffset}

                strokeLinecap="round"

                className={`transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-80'}`}

                style={isHovered ? { transform: 'scale(1.05)', transformOrigin: 'center' } : {}}

                onMouseEnter={() => setHoveredIndex(segment.index)}

                onMouseLeave={() => setHoveredIndex(null)}

              />

            )

          })}

        </svg>



        {/* Center text */}

        {centerText && (

          <div className="absolute inset-0 flex items-center justify-center">

            <div className="text-center">

              <div className="text-2xl font-bold text-copper-light">{centerText}</div>

            </div>

          </div>

        )}

      </div>



      {/* Legend */}

      <div className="flex-1 space-y-3">

        {data.map((item, index) => {

          const percentage = (item.value / total) * 100

          const isHovered = hoveredIndex === index

          return (

            <div

              key={index}

              className="flex items-center gap-3 cursor-pointer transition-opacity"

              style={{ opacity: hoveredIndex !== null && hoveredIndex !== index ? 0.5 : 1 }}

              onMouseEnter={() => setHoveredIndex(index)}

              onMouseLeave={() => setHoveredIndex(null)}

            >

              <div

                className="w-4 h-4 rounded-full flex-shrink-0"

                style={{ backgroundColor: item.color }}

              />

              <div className="flex-1 min-w-0">

                <div className="flex items-center justify-between gap-2">

                  <span className="text-sm font-medium text-text-primary">{item.label}</span>

                  <span className={`text-sm font-medium ${isHovered ? 'text-copper-light' : 'text-text-muted'}`}>

                    {percentage.toFixed(1)}%

                  </span>

                </div>

                <div className="h-1 bg-bg-tertiary rounded-full mt-1 overflow-hidden">

                  <div

                    className="h-full transition-all duration-300"

                    style={{ 

                      width: `${percentage}%`, 

                      backgroundColor: item.color,

                      transform: isHovered ? 'scaleY(1.2)' : 'scaleY(1)',

                    }}

                  />

                </div>

              </div>

            </div>

          )

        })}

      </div>

    </div>

  )

}

