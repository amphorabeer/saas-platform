'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui'

interface UserSignatureCellProps {
  userId: string
  signatureUrl?: string | null
  onUpdated: () => void | Promise<void>
}

export function UserSignatureCell({ userId, signatureUrl, onUpdated }: UserSignatureCellProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const pickFile = () => inputRef.current?.click()

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('signature', file)
      const res = await fetch(`/api/users/${userId}/signature`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error || 'ატვირთვა ვერ მოხერხდა')
        return
      }
      await onUpdated()
    } finally {
      setLoading(false)
    }
  }

  const remove = async () => {
    if (!confirm('ხელმოწერა წაიშალოს?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${userId}/signature`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error || 'წაშლა ვერ მოხერხდა')
        return
      }
      await onUpdated()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 py-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={onFile}
      />
      {signatureUrl ? (
        <div className="flex flex-wrap items-center gap-2">
          <img
            src={signatureUrl}
            alt="ხელმოწერა"
            className="max-w-[120px] max-h-[60px] w-auto h-auto object-contain rounded border border-border bg-white"
          />
          <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={remove}>
            წაშლა
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={pickFile}>
          {loading ? '...' : '+ ხელმოწერა ატვირთვა'}
        </Button>
      )}
    </div>
  )
}
