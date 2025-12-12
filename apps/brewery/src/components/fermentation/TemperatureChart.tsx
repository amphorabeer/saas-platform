'use client'



interface TemperatureChartProps {

  data: { time: string; value: number }[]

  target: number

}



export function TemperatureChart({ data, target }: TemperatureChartProps) {

  // Placeholder - will integrate Chart.js later

  return (

    <div className="h-64 flex items-center justify-center text-text-muted">

      Chart.js ინტეგრაცია მოგვიანებით

    </div>

  )

}
