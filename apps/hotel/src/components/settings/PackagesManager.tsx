'use client'

import React from 'react'
import { PackagePostingService } from '../../services/PackagePostingService'

export default function PackagesManager() {
  const packages = PackagePostingService.PACKAGES

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-2">📦 Packages</h2>
          <p className="text-gray-600">Manage meal packages and pricing</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
          + Add Package
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {packages.map(pkg => (
          <div key={pkg.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-lg">{pkg.name}</h4>
                <p className="text-sm text-gray-600">{pkg.code}</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                Active
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Per Person:</span>
                <span className="font-bold">₾{pkg.pricePerPerson}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Per Child:</span>
                <span>₾{pkg.pricePerChild}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2 font-medium">Includes:</p>
              <div className="space-y-1">
                {pkg.components.slice(0, 3).map(comp => (
                  <div key={comp.id} className="text-xs flex items-center gap-2">
                    <span>•</span>
                    <span>{comp.name}</span>
                    {comp.quantity > 1 && (
                      <span className="text-gray-500">(x{comp.quantity})</span>
                    )}
                  </div>
                ))}
                {pkg.components.length > 3 && (
                  <div className="text-xs text-blue-600 font-medium">
                    +{pkg.components.length - 3} more components
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="flex-1 px-3 py-2 text-sm border rounded hover:bg-gray-50">
                Edit
              </button>
              <button className="flex-1 px-3 py-2 text-sm border rounded hover:bg-gray-50">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}



