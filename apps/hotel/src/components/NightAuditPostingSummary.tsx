'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'

interface PostingResult {
  posted: number
  failed: number
  skipped: number
  totalAmount: number
  details: Array<{
    success?: boolean
    skipped?: boolean
    amount?: number
    room?: string
    guest?: string
    breakdown?: {
      netRate: number
      totalTax: number
      total: number
    }
    error?: string
  }>
}

interface NightAuditPostingSummaryProps {
  date: string
  postingResults: PostingResult
}

export default function NightAuditPostingSummary({ 
  date, 
  postingResults 
}: NightAuditPostingSummaryProps) {
  
  // Load rooms for room number lookup
  const [rooms, setRooms] = useState<any[]>([])
  
  useEffect(() => {
    // Try multiple localStorage keys for rooms
    const savedRooms = localStorage.getItem('rooms') || 
                       localStorage.getItem('simpleRooms') || 
                       localStorage.getItem('hotelRooms')
    if (savedRooms) {
      try {
        setRooms(JSON.parse(savedRooms))
      } catch (e) {
        console.error('Error loading rooms:', e)
      }
    }
  }, [])
  
  // Helper function to get room number from roomId
  const getRoomNumber = (roomIdOrNumber: string | undefined): string => {
    if (!roomIdOrNumber) return '-'
    
    // If it's already a short room number (like "101", "202"), return it
    if (roomIdOrNumber.length <= 4 && /^\d+$/.test(roomIdOrNumber)) {
      return roomIdOrNumber
    }
    
    // Try to find room in rooms state first
    let roomsToSearch = rooms
    
    // If rooms state is empty, try loading directly from localStorage
    if (!roomsToSearch || roomsToSearch.length === 0) {
      try {
        const savedRooms = localStorage.getItem('rooms') || 
                           localStorage.getItem('simpleRooms') || 
                           localStorage.getItem('hotelRooms')
        if (savedRooms) {
          roomsToSearch = JSON.parse(savedRooms)
        }
      } catch (e) {
        console.error('Error loading rooms in getRoomNumber:', e)
      }
    }
    
    // Try to find room by ID
    if (roomsToSearch && roomsToSearch.length > 0) {
      const room = roomsToSearch.find((r: any) => r.id === roomIdOrNumber)
      if (room) {
        return room.roomNumber || room.number || roomIdOrNumber
      }
    }
    
    // Return truncated CUID as fallback
    return roomIdOrNumber.length > 10 ? roomIdOrNumber.slice(0, 6) + '...' : roomIdOrNumber
  }
  
  // Calculate tax breakdown from all successful postings
  const calculateTaxSummary = () => {
    const successfulPostings = postingResults.details.filter(d => d.success && d.breakdown)
    
    const taxSummary = {
      totalNet: 0,
      totalVAT: 0,
      totalCityTax: 0,
      totalTourismTax: 0,
      totalTax: 0,
      totalGross: 0
    }
    
    successfulPostings.forEach(detail => {
      if (detail.breakdown) {
        taxSummary.totalNet += detail.breakdown.netRate
        taxSummary.totalTax += detail.breakdown.totalTax
        taxSummary.totalGross += detail.breakdown.total
      }
    })
    
    // Estimate tax breakdown (assuming standard rates)
    taxSummary.totalVAT = taxSummary.totalNet * 0.18
    taxSummary.totalCityTax = taxSummary.totalNet * 0.03
    taxSummary.totalTourismTax = taxSummary.totalNet * 0.01
    
    return taxSummary
  }
  
  const taxSummary = calculateTaxSummary()
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <h2 className="text-xl font-bold mb-4">💰 Room Charge Posting Summary</h2>
      <p className="text-sm text-gray-600 mb-4">
        Night Audit Date: <span className="font-medium">{moment(date).format('DD/MM/YYYY')}</span>
      </p>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded border border-green-200">
          <div className="text-2xl font-bold text-green-600">
            {postingResults.posted}
          </div>
          <div className="text-sm text-gray-600">Rooms Posted</div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">
            ₾{postingResults.totalAmount.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Total Posted</div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">
            {postingResults.skipped}
          </div>
          <div className="text-sm text-gray-600">Already Posted</div>
        </div>
        
        <div className="bg-red-50 p-4 rounded border border-red-200">
          <div className="text-2xl font-bold text-red-600">
            {postingResults.failed}
          </div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
      </div>
      
      {/* Detailed Posting List */}
      {postingResults.details.length > 0 && (
        <div className="border rounded-lg overflow-hidden mb-6">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">Room</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Guest</th>
                <th className="px-4 py-2 text-right text-sm font-medium">Base Rate</th>
                <th className="px-4 py-2 text-right text-sm font-medium">Taxes</th>
                <th className="px-4 py-2 text-right text-sm font-medium">Total</th>
                <th className="px-4 py-2 text-center text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {postingResults.details.map((detail: any, i: number) => (
                <tr key={i} className={`border-t hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-4 py-2">{getRoomNumber(detail.room)}</td>
                  <td className="px-4 py-2">{detail.guest || '-'}</td>
                  <td className="px-4 py-2 text-right">
                    {detail.breakdown?.netRate ? `₾${detail.breakdown.netRate.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {detail.breakdown?.totalTax ? `₾${detail.breakdown.totalTax.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {detail.amount ? `₾${detail.amount.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {detail.success ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        ✓ Posted
                      </span>
                    ) : detail.skipped ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                        ⊘ Skipped
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium" title={detail.error}>
                        ✗ Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Tax Breakdown */}
      {taxSummary.totalGross > 0 && (
        <div className="mt-6 bg-gray-50 p-4 rounded border">
          <h3 className="font-bold mb-3">Tax Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 block">Net Amount:</span>
              <span className="font-bold text-lg">₾{taxSummary.totalNet.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600 block">VAT (18%):</span>
              <span className="font-bold text-lg">₾{taxSummary.totalVAT.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600 block">City Tax (3%):</span>
              <span className="font-bold text-lg">₾{taxSummary.totalCityTax.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600 block">Tourism Tax (1%):</span>
              <span className="font-bold text-lg">₾{taxSummary.totalTourismTax.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Total Gross Amount:</span>
              <span className="font-bold text-2xl text-blue-600">₾{taxSummary.totalGross.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
      
      {postingResults.details.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No room charges to post for this date.</p>
        </div>
      )}
    </div>
  )
}