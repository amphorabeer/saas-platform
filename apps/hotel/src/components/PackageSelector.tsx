'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'
import { PackagePostingService } from '../services/PackagePostingService'
import { ReservationPackage } from '../types/package.types'

interface PackageSelectorProps {
  reservation: any
  onPackageSelected?: (pkg: ReservationPackage) => void
  onClose?: () => void
}

export default function PackageSelector({ 
  reservation,
  onPackageSelected,
  onClose
}: PackageSelectorProps) {
  const [selectedPackage, setSelectedPackage] = useState<string>('')
  const [packageDetails, setPackageDetails] = useState<any>(null)
  const [existingPackage, setExistingPackage] = useState<ReservationPackage | null>(null)
  
  const packages = PackagePostingService.PACKAGES.filter(p => p.active)
  
  useEffect(() => {
    // Load existing package for this reservation
    if (typeof window !== 'undefined') {
      const reservationPackages = JSON.parse(localStorage.getItem('reservationPackages') || '[]')
      const existing = reservationPackages.find((p: any) => p.reservationId === reservation.id)
      
      if (existing) {
        setExistingPackage(existing)
        setSelectedPackage(existing.packageId)
        handlePackageChange(existing.packageId, existing.adults, existing.children)
      } else {
        // Default to reservation's adults/children if available
        handlePackageChange('', reservation.adults || 1, reservation.children || 0)
      }
    }
  }, [reservation.id])
  
  const handlePackageChange = (packageId: string, adults?: number, children?: number) => {
    setSelectedPackage(packageId)
    const pkg = packages.find(p => p.id === packageId)
    
    if (pkg) {
      const nights = moment(reservation.checkOut).diff(moment(reservation.checkIn), 'days')
      const adultCount = adults !== undefined ? adults : (reservation.adults || 1)
      const childCount = children !== undefined ? children : (reservation.children || 0)
      
      const adultCost = pkg.pricePerPerson * adultCount * nights
      const childCost = pkg.pricePerChild * childCount * nights
      
      setPackageDetails({
        package: pkg,
        nights: nights,
        adultCost: adultCost,
        childCost: childCost,
        totalCost: adultCost + childCost,
        adults: adultCount,
        children: childCount
      })
    } else {
      setPackageDetails(null)
    }
  }
  
  const savePackage = () => {
    if (!selectedPackage) {
      // Remove package if "No Package" selected
      if (existingPackage) {
        const packages = typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('reservationPackages') || '[]')
          : []
        const index = packages.findIndex((p: any) => p.reservationId === reservation.id)
        if (index >= 0) {
          packages.splice(index, 1)
          if (typeof window !== 'undefined') {
            localStorage.setItem('reservationPackages', JSON.stringify(packages))
          }
        }
      }
      if (onPackageSelected) {
        onPackageSelected(null as any)
      }
      if (onClose) {
        onClose()
      }
      return
    }
    
    const resPackage: ReservationPackage = {
      reservationId: reservation.id,
      packageId: selectedPackage,
      adults: packageDetails?.adults || reservation.adults || 1,
      children: packageDetails?.children || reservation.children || 0,
      startDate: reservation.checkIn,
      endDate: reservation.checkOut,
      postedDates: existingPackage?.postedDates || [],
      consumptions: existingPackage?.consumptions || []
    }
    
    // Save to localStorage
    const packages = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('reservationPackages') || '[]')
      : []
    const existing = packages.findIndex((p: any) => p.reservationId === reservation.id)
    
    if (existing >= 0) {
      packages[existing] = resPackage
    } else {
      packages.push(resPackage)
    }
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('reservationPackages', JSON.stringify(packages))
    }
    
    if (onPackageSelected) {
      onPackageSelected(resPackage)
    }
    
    if (onClose) {
      onClose()
    }
  }
  
  const adultCount = packageDetails?.adults || reservation.adults || 1
  const childCount = packageDetails?.children || reservation.children || 0
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">📦 Select Package</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 p-3 rounded">
          <label className="text-sm text-gray-600 block">Adults</label>
          <div className="font-bold text-lg">{adultCount}</div>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <label className="text-sm text-gray-600 block">Children</label>
          <div className="font-bold text-lg">{childCount}</div>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Package Type</label>
        <select
          value={selectedPackage}
          onChange={(e) => handlePackageChange(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">No Package (Room Only)</option>
          {packages.map(pkg => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.name} ({pkg.code}) - ₾{pkg.pricePerPerson}/adult
            </option>
          ))}
        </select>
      </div>
      
      {packageDetails && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <h4 className="font-bold mb-3 text-lg">{packageDetails.package.name}</h4>
          
          <div className="mb-4">
            <div className="text-sm font-medium mb-2 text-gray-700">Includes:</div>
            <div className="space-y-1">
              {packageDetails.package.components.map((c: any) => (
                <div key={c.id} className="ml-4 text-sm flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>{c.name}</span>
                  {c.mandatory && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Required</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Adults ({adultCount} × ₾{packageDetails.package.pricePerPerson} × {packageDetails.nights} nights):</span>
              <span className="font-medium">₾{packageDetails.adultCost.toFixed(2)}</span>
            </div>
            {childCount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Children ({childCount} × ₾{packageDetails.package.pricePerChild} × {packageDetails.nights} nights):</span>
                <span className="font-medium">₾{packageDetails.childCost.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-2 border-t text-lg">
              <span>Total Package Cost:</span>
              <span className="text-blue-600">₾{packageDetails.totalCost.toFixed(2)}</span>
            </div>
          </div>
          
          {existingPackage && existingPackage.postedDates && existingPackage.postedDates.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs text-gray-600">
                ⚠️ Package already posted for {existingPackage.postedDates.length} date(s)
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          onClick={savePackage}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          {selectedPackage ? 'Save Package Selection' : 'Remove Package'}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}



