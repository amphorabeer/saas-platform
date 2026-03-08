'use client'

import { useMemo } from 'react'
import { ResourceSection } from './ResourceSection'
import { ResourceRow } from './ResourceRow'

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface CalendarEvent {
  id: string
  batchId?: string
  batchNumber: string
  recipeName: string
  status: 'PLANNED' | 'BREWING' | 'FERMENTING' | 'CONDITIONING' | 'READY' | 'PACKAGING' | 'COMPLETED'
  resourceId: string
  resourceType: 'brewhouse' | 'fermenter' | 'conditioning'
  startDate: Date
  endDate: Date
  volume?: number
  notes?: string
  isPackaging?: boolean  // 📦 badge-ისთვის
  isCip?: boolean  // ⚠️ CIP event flag
  equipmentId?: string  // Equipment ID for CIP events
}

export interface Resource {
  id: string
  name: string
  type: 'brewhouse' | 'fermenter' | 'conditioning'
  capacity?: number
  needsCIP?: boolean  // ⚠️ warning-ისთვის
}

interface ResourceTimelineProps {
  weekStart: Date
  resources: Resource[]
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onCellClick?: (date: Date, resourceId: string) => void
  onCellDoubleClick?: (date: Date, resourceId: string) => void
  onAddBatch?: () => void
  onResourceClick?: (resource: Resource, clickSource?: 'cip-badge' | 'tank') => void  // ✅ NEW
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const WEEKDAYS = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი']

const getWeekDays = (weekStart: Date): Date[] => {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    days.push(date)
  }
  return days
}

const isToday = (date: Date): boolean => {
  const today = new Date()
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate()
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export function ResourceTimeline({
  weekStart,
  resources,
  events,
  onEventClick,
  onCellClick,
  onCellDoubleClick,
  onAddBatch,
  onResourceClick,  // ✅ NEW
}: ResourceTimelineProps) {
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])

  // Group resources by type
  const groupedResources = useMemo(() => {
    const groups: Record<string, Resource[]> = {
      brewhouse: [],
      fermenter: [],
      conditioning: [],
    }

    resources.forEach(r => {
      if (groups[r.type]) {
        groups[r.type].push(r)
      }
    })

    return groups
  }, [resources])

  // Get events for a specific resource
  const getEventsForResource = (resourceId: string): CalendarEvent[] => {
    return events.filter(e => e.resourceId === resourceId)
  }

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      {/* Header - Week days */}
      <div className="flex border-b border-border bg-bg-tertiary">
        <div className="w-[180px] shrink-0 p-3 border-r border-border">
          <span className="text-xs font-medium text-text-muted">რესურსი</span>
        </div>
        
        <div className="flex-1 grid grid-cols-7">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`p-3 text-center border-r border-border/50 last:border-r-0 ${
                isToday(day) ? 'bg-copper/10' : ''
              } ${index >= 5 ? 'bg-bg-tertiary/50' : ''}`}
            >
              <div className="text-xs text-text-muted">{WEEKDAYS[(day.getDay() + 6) % 7]}</div>
              <div className={`text-sm font-medium ${isToday(day) ? 'text-copper' : 'text-text-primary'}`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Brewhouse Section */}
      {groupedResources.brewhouse.length > 0 && (
        <ResourceSection 
          title="🏭 ხარშვის ქვაბი" 
          color="amber"
          onAdd={onAddBatch}
          addLabel="+ ახალი პარტია"
        >
          {groupedResources.brewhouse.map(resource => (
            <ResourceRow
              key={resource.id}
              resource={resource}
              events={getEventsForResource(resource.id)}
              weekDays={weekDays}
              onEventClick={onEventClick}
              onCellClick={onCellClick}
              onCellDoubleClick={onCellDoubleClick}
              onResourceClick={onResourceClick}
            />
          ))}
        </ResourceSection>
      )}

      {/* Fermentation Section */}
      {groupedResources.fermenter.length > 0 && (
        <ResourceSection title="🧪 ფერმენტაცია" color="orange">
          {groupedResources.fermenter.map(resource => (
            <ResourceRow
              key={resource.id}
              resource={resource}
              events={getEventsForResource(resource.id)}
              weekDays={weekDays}
              onEventClick={onEventClick}
              onCellClick={onCellClick}
              onCellDoubleClick={onCellDoubleClick}
              onResourceClick={onResourceClick}
            />
          ))}
        </ResourceSection>
      )}

      {/* Conditioning Section */}
      {groupedResources.conditioning.length > 0 && (
        <ResourceSection title="🔵 კონდიცირება" color="blue">
          {groupedResources.conditioning.map(resource => (
            <ResourceRow
              key={resource.id}
              resource={resource}
              events={getEventsForResource(resource.id)}
              weekDays={weekDays}
              onEventClick={onEventClick}
              onCellClick={onCellClick}
              onCellDoubleClick={onCellDoubleClick}
              onResourceClick={onResourceClick}
            />
          ))}
        </ResourceSection>
      )}

      {/* Empty state */}
      {resources.length === 0 && (
        <div className="p-12 text-center text-text-muted">
          <p className="text-4xl mb-4">🏭</p>
          <p>რესურსები არ მოიძებნა</p>
          <p className="text-sm mt-2">დაამატეთ აღჭურვილობა Equipment მოდულში</p>
        </div>
      )}
    </div>
  )
}


