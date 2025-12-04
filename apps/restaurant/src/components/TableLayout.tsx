'use client'

interface Table {
  id: string
  number: number
  seats: number
  status: 'available' | 'occupied' | 'reserved' | 'cleaning'
  zone: string
}

interface TableLayoutProps {
  tables: Table[]
  onTableClick: (table: Table) => void
  onStatusChange: (tableId: string, status: string) => void
}

export default function TableLayout({ tables, onTableClick, onStatusChange }: TableLayoutProps) {
  const tablesByZone = tables.reduce((acc, table) => {
    if (!acc[table.zone]) acc[table.zone] = []
    acc[table.zone].push(table)
    return acc
  }, {} as Record<string, Table[]>)

  return (
    <div className="p-6 space-y-6">
      {Object.entries(tablesByZone).map(([zone, zoneTables]) => (
        <div key={zone} className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">{zone}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {zoneTables.map(table => (
              <TableCard
                key={table.id}
                table={table}
                onClick={() => onTableClick(table)}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TableCard({ table, onClick, onStatusChange }: any) {
  const getStatusColor = () => {
    switch(table.status) {
      case 'available': return 'bg-green-100 border-green-500'
      case 'occupied': return 'bg-red-100 border-red-500'
      case 'reserved': return 'bg-blue-100 border-blue-500'
      case 'cleaning': return 'bg-yellow-100 border-yellow-500'
      default: return 'bg-gray-100 border-gray-500'
    }
  }

  const getStatusIcon = () => {
    switch(table.status) {
      case 'available': return '✅'
      case 'occupied': return '🍽️'
      case 'reserved': return '📅'
      case 'cleaning': return '🧹'
      default: return '❓'
    }
  }

  return (
    <div
      onClick={onClick}
      className={`border-2 rounded-lg p-4 cursor-pointer transition hover:scale-105 ${getStatusColor()}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xl font-bold">#{table.number}</span>
        <span className="text-2xl">{getStatusIcon()}</span>
      </div>
      <div className="text-sm text-gray-600">
        <div>{table.seats} ადგილი</div>
        <div className="capitalize">{table.status}</div>
      </div>
    </div>
  )
}




