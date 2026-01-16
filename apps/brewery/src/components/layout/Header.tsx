'use client'

import { useState } from 'react'

interface HeaderProps {
  title: string
  breadcrumb: string
  onNewBatch?: () => void
}

export function Header({ title, breadcrumb, onNewBatch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <header className="px-8 py-5 flex justify-between items-center border-b border-border bg-bg-secondary sticky top-0 z-50">
      <div>
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <p className="text-xs text-text-muted mt-1">{breadcrumb}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-bg-tertiary border border-border rounded-lg px-4 py-2 gap-2">
          <span className="text-text-muted">🔍</span>
          <input
            type="text"
            placeholder="ძიება..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-48 text-text-primary placeholder:text-text-muted"
          />
        </div>
        <button className="relative w-10 h-10 rounded-lg bg-bg-tertiary border border-border flex items-center justify-center text-lg hover:border-copper transition-colors">
          🔔
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger rounded-full text-[10px] flex items-center justify-center font-semibold">
            3
          </span>
        </button>
        {onNewBatch && (
          <button 
            onClick={onNewBatch}
            className="px-5 py-2.5 rounded-lg bg-gradient-copper text-white text-sm font-medium hover:shadow-lg hover:shadow-copper/40 hover:-translate-y-0.5 transition-all"
          >
            + ახალი პარტია
          </button>
        )}
      </div>
    </header>
  )
}











