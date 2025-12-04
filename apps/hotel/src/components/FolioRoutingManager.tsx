'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'
import { FolioRoutingService } from '../services/FolioRoutingService'
import { FolioRoutingRule, CompanyFolio } from '../types/folioRouting.types'

interface FolioRoutingManagerProps {
  folioId: string
  reservationId: string
  onRuleUpdated?: () => void
}

export default function FolioRoutingManager({ 
  folioId,
  reservationId,
  onRuleUpdated
}: FolioRoutingManagerProps) {
  const [showCreateRule, setShowCreateRule] = useState(false)
  const [rules, setRules] = useState<FolioRoutingRule[]>([])
  const [companyFolios, setCompanyFolios] = useState<CompanyFolio[]>([])
  const [folioWindows, setFolioWindows] = useState<any[]>([])
  
  useEffect(() => {
    loadRules()
    loadCompanyFolios()
    loadFolioWindows()
  }, [folioId, reservationId])
  
  const loadRules = () => {
    const folioRules = FolioRoutingService.getRoutingRules(folioId)
    setRules(folioRules)
  }
  
  const loadCompanyFolios = () => {
    const companies = FolioRoutingService.getCompanyFolios()
    setCompanyFolios(companies)
  }
  
  const loadFolioWindows = () => {
    const windows = FolioRoutingService.getFolioWindows(reservationId)
    setFolioWindows(windows)
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🔀 Routing Rules</h2>
        <button
          onClick={() => setShowCreateRule(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          + Add Rule
        </button>
      </div>
      
      {/* Active Rules */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No routing rules configured</p>
        ) : (
          rules.map(rule => (
            <RoutingRuleCard 
              key={rule.id} 
              rule={rule} 
              onUpdate={() => {
                loadRules()
                if (onRuleUpdated) onRuleUpdated()
              }} 
            />
          ))
        )}
      </div>
      
      {/* Create Rule Modal */}
      {showCreateRule && (
        <CreateRoutingRuleModal
          sourceFolioId={folioId}
          companyFolios={companyFolios}
          folioWindows={folioWindows}
          onClose={() => setShowCreateRule(false)}
          onCreated={() => {
            loadRules()
            setShowCreateRule(false)
            if (onRuleUpdated) onRuleUpdated()
          }}
        />
      )}
    </div>
  )
}

// Routing Rule Card
const RoutingRuleCard = ({ 
  rule, 
  onUpdate 
}: { 
  rule: FolioRoutingRule
  onUpdate: () => void 
}) => {
  const toggleRule = () => {
    if (typeof window === 'undefined') return
    
    const rules = JSON.parse(localStorage.getItem('folioRoutingRules') || '[]')
    const index = rules.findIndex((r: any) => r.id === rule.id)
    if (index >= 0) {
      rules[index].active = !rules[index].active
      localStorage.setItem('folioRoutingRules', JSON.stringify(rules))
      onUpdate()
    }
  }
  
  const deleteRule = () => {
    if (!confirm('Are you sure you want to delete this routing rule?')) return
    
    if (typeof window === 'undefined') return
    
    const rules = JSON.parse(localStorage.getItem('folioRoutingRules') || '[]')
    const filtered = rules.filter((r: any) => r.id !== rule.id)
    localStorage.setItem('folioRoutingRules', JSON.stringify(filtered))
    onUpdate()
  }
  
  return (
    <div className={`border rounded-lg p-4 ${rule.active ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-bold text-lg">{rule.name}</h4>
          <p className="text-sm text-gray-600 mt-1">
            Route to: <span className="font-medium">{rule.targetFolioId}</span>
          </p>
          {rule.specificCategories && rule.specificCategories.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Categories: <span className="font-medium">{rule.specificCategories.join(', ')}</span>
            </p>
          )}
          {rule.percentage !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              Split: <span className="font-medium">{rule.percentage}%</span>
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Valid: {moment(rule.startDate).format('DD/MM/YYYY')} - {moment(rule.endDate).format('DD/MM/YYYY')}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Priority: {rule.priority} | Created by: {rule.createdBy}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            rule.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
          }`}>
            {rule.active ? 'Active' : 'Inactive'}
          </span>
          <button
            onClick={toggleRule}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm transition"
          >
            {rule.active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={deleteRule}
            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// Create Routing Rule Modal
const CreateRoutingRuleModal = ({ 
  sourceFolioId,
  companyFolios,
  folioWindows,
  onClose,
  onCreated 
}: {
  sourceFolioId: string
  companyFolios: CompanyFolio[]
  folioWindows: any[]
  onClose: () => void
  onCreated: () => void
}) => {
  const [routingType, setRoutingType] = useState('room')
  const [targetType, setTargetType] = useState('window')
  const [targetFolioId, setTargetFolioId] = useState('')
  const [specificCategories, setSpecificCategories] = useState<string[]>([])
  const [percentage, setPercentage] = useState(50)
  
  const categories = [
    'room', 'tax', 'food', 'beverage', 'minibar', 
    'spa', 'laundry', 'transport', 'phone', 'misc'
  ]
  
  const handleCreate = () => {
    if (!targetFolioId) {
      alert('გთხოვთ აირჩიოთ target folio')
      return
    }
    
    if (routingType === 'specific' && specificCategories.length === 0) {
      alert('გთხოვთ აირჩიოთ მინიმუმ ერთი კატეგორია')
      return
    }
    
    FolioRoutingService.createRoutingRule({
      sourceFolioId,
      targetFolioId,
      routingType,
      specificCategories: routingType === 'specific' ? specificCategories : undefined,
      percentage: routingType === 'percentage' ? percentage : undefined
    })
    
    onCreated()
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[500px] max-w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Create Routing Rule</h3>
        
        {/* Routing Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">What to Route</label>
          <select
            value={routingType}
            onChange={(e) => setRoutingType(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="all">All Charges</option>
            <option value="room">Room & Tax Only</option>
            <option value="extras">Extra Charges Only</option>
            <option value="packages">Package Charges Only</option>
            <option value="specific">Specific Categories</option>
            <option value="percentage">Percentage Split</option>
          </select>
        </div>
        
        {/* Specific Categories */}
        {routingType === 'specific' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Categories</label>
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded p-2">
              {categories.map(cat => (
                <label key={cat} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={specificCategories.includes(cat)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSpecificCategories([...specificCategories, cat])
                      } else {
                        setSpecificCategories(specificCategories.filter(c => c !== cat))
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm capitalize">{cat}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        
        {/* Percentage */}
        {routingType === 'percentage' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Percentage to Route: {percentage}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        )}
        
        {/* Target Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Route To</label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => {
                setTargetType('window')
                setTargetFolioId('')
              }}
              className={`px-3 py-1 rounded transition ${
                targetType === 'window' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Folio Window
            </button>
            <button
              onClick={() => {
                setTargetType('company')
                setTargetFolioId('')
              }}
              className={`px-3 py-1 rounded transition ${
                targetType === 'company' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Company Folio
            </button>
          </div>
          
          {targetType === 'company' ? (
            <select
              value={targetFolioId}
              onChange={(e) => setTargetFolioId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select Company</option>
              {companyFolios.map((cf: CompanyFolio) => (
                <option key={cf.id} value={cf.id}>
                  {cf.companyName} (#{cf.folioNumber})
                </option>
              ))}
            </select>
          ) : (
            <select
              value={targetFolioId}
              onChange={(e) => setTargetFolioId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select Window</option>
              {folioWindows.map((w: any) => (
                <option key={w.id} value={w.id}>
                  Window {w.windowNumber} - {w.windowName}
                </option>
              ))}
              {folioWindows.length === 0 && (
                <option value="window-2">Window 2 - Extras (Create)</option>
              )}
            </select>
          )}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Create Rule
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}



