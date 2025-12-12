'use client'



interface BrewDayBadgeProps {

  batchNumber: string

  recipe: string

  onClick: () => void

}



export function BrewDayBadge({ batchNumber, recipe, onClick }: BrewDayBadgeProps) {

  const shortBatchNumber = batchNumber.replace('BRW-2024-', '').replace('BRW-', '')

  

  return (

    <button

      onClick={onClick}

      className="px-2 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 border border-amber-400/50 rounded-lg text-xs font-semibold text-white hover:from-amber-600 hover:to-yellow-600 transition-all shadow-sm hover:shadow-md flex items-center gap-1"

      title={`${batchNumber} - ${recipe}`}

    >

      <span>🍺</span>

      <span>{shortBatchNumber}</span>

    </button>

  )

}

