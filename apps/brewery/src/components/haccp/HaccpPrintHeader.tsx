'use client'

import { useEffect, useState } from 'react'

interface HaccpPrintHeaderProps {
  sectionTitle: string
  /** When true, show "პერიოდი" (CCP date filter). Other HACCP pages omit this line. */
  showPeriodInPrint?: boolean
  /** Pre-formatted start date for print (e.g. ka-GE); omit for "ყველა პერიოდი" when showPeriodInPrint */
  periodFromDisplay?: string
  /** Pre-formatted end date for print */
  periodToDisplay?: string
}

function periodLine(from?: string, to?: string): string {
  if (from && to) return `${from} — ${to}`
  if (from) return `${from} — …`
  if (to) return `… — ${to}`
  return 'ყველა პერიოდი'
}

export function HaccpPrintHeader({
  sectionTitle,
  showPeriodInPrint = false,
  periodFromDisplay,
  periodToDisplay,
}: HaccpPrintHeaderProps) {
  const [companyName, setCompanyName] = useState('')
  const [printDate, setPrintDate] = useState('')

  useEffect(() => {
    setPrintDate(new Date().toLocaleString('ka-GE'))
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/tenant')
        if (!res.ok) return
        const json = (await res.json()) as {
          tenant?: { name?: string | null; legalName?: string | null; code?: string; slug?: string }
        }
        const tenant = json.tenant
        if (!tenant) {
          if (!cancelled) setCompanyName('—')
          return
        }
        // Display company name from tenant.name (never code/slug)
        const fromName =
          typeof tenant.name === 'string' && tenant.name.trim() !== '' ? tenant.name.trim() : ''
        const fromLegal =
          typeof tenant.legalName === 'string' && tenant.legalName.trim() !== ''
            ? tenant.legalName.trim()
            : ''
        const display = fromName || fromLegal || '—'
        if (!cancelled) setCompanyName(display)
      } catch {
        if (!cancelled) setCompanyName('—')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="hidden print:block">
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 'bold' }}>{companyName}</h1>
        <h2 style={{ fontSize: 14 }}>HACCP — {sectionTitle}</h2>
        {showPeriodInPrint ? (
          <p style={{ fontSize: 12 }}>პერიოდი: {periodLine(periodFromDisplay, periodToDisplay)}</p>
        ) : null}
        <p style={{ fontSize: 11, color: '#666' }}>დაბეჭდილია: {printDate}</p>
      </div>
      <hr style={{ marginBottom: 12 }} />
    </div>
  )
}
