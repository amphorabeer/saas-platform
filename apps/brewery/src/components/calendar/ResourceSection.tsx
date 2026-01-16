'use client'

import { ReactNode } from 'react'

interface ResourceSectionProps {
  title: string
  color?: string
  children: ReactNode
  onAdd?: () => void
  addLabel?: string
}

const SECTION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'amber': { 
    bg: 'bg-amber-500/10', 
    border: 'border-l-4 border-l-amber-500', 
    text: 'text-amber-400' 
  },
  'green': { 
    bg: 'bg-green-500/10', 
    border: 'border-l-4 border-l-green-500', 
    text: 'text-green-400' 
  },
  'blue': { 
    bg: 'bg-blue-500/10', 
    border: 'border-l-4 border-l-blue-500', 
    text: 'text-blue-400' 
  },
  'purple': { 
    bg: 'bg-purple-500/10', 
    border: 'border-l-4 border-l-purple-500', 
    text: 'text-purple-400' 
  },
  'copper': { 
    bg: 'bg-copper/10', 
    border: 'border-l-4 border-l-copper', 
    text: 'text-copper' 
  },
  'orange': { 
    bg: 'bg-orange-600/40', 
    border: 'border-l-4 border-l-orange-600', 
    text: 'text-orange-400' 
  },
}

export function ResourceSection({ title, color, children, onAdd, addLabel }: ResourceSectionProps) {
  const sectionColors = color ? SECTION_COLORS[color] : SECTION_COLORS['copper']
  const sectionIcon = title.match(/^[^\s]+/)?.[0] || ''
  const sectionTitle = title.replace(/^[^\s]+\s/, '')

  return (
    <div className="mb-6">
      {/* Section Header Row */}
      <div className={`flex items-center justify-between gap-2 px-3 py-2 mb-3 ${sectionColors?.bg || 'bg-bg-tertiary'} ${sectionColors?.border || ''}`}>
        <div className="flex items-center gap-2">
          <span className={sectionColors?.text || 'text-text-muted'}>
            {sectionIcon}
          </span>
          <span className="text-sm font-medium">{sectionTitle}</span>
        </div>
        {onAdd && addLabel && (
          <button onClick={onAdd} className="text-sm text-primary hover:underline">
            {addLabel}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
}
