'use client'

export default function CheckInRules() {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
      <h3 className="font-bold mb-2 text-gray-800">📋 Check-in/Check-out წესები</h3>
      <div className="text-sm space-y-2 text-gray-700">
        <div>
          <strong className="text-gray-800">Check-in:</strong>
          <ul className="ml-4 mt-1 space-y-1">
            <li>• სტანდარტული დრო: 14:00</li>
            <li>• ადრე Check-in: დამატებითი საფასური</li>
            <li>• საჭირო დოკუმენტები: ID/პასპორტი</li>
            <li>• წინასწარი გადახდა ან ავტორიზაცია</li>
          </ul>
        </div>
        <div>
          <strong className="text-gray-800">Check-out:</strong>
          <ul className="ml-4 mt-1 space-y-1">
            <li>• სტანდარტული დრო: 12:00</li>
            <li>• გვიანი Check-out: დამატებითი საფასური</li>
            <li>• ოთახის შემოწმება</li>
            <li>• ყველა გადახდის დასრულება</li>
          </ul>
        </div>
      </div>
    </div>
  )
}




