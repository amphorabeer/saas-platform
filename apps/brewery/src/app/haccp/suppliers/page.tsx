'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader, Button } from '@/components/ui'
import { HaccpSubNav } from '@/components/haccp/HaccpSubNav'
interface Supplier {
  id: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  products: string[]
  notes: string | null
  updatedAt?: string
}

const inputClass =
  'w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary'

export default function HaccpSuppliersPage() {
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [productsStr, setProductsStr] = useState('')
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/haccp/suppliers?limit=500')
      if (res.ok) {
        const data = await res.json()
        setSuppliers(data.suppliers || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openAdd = () => {
    setEditing(null)
    setName('')
    setContactPerson('')
    setPhone('')
    setEmail('')
    setProductsStr('')
    setNotes('')
    setModalOpen(true)
  }

  const openEdit = (s: Supplier) => {
    setEditing(s)
    setName(s.name)
    setContactPerson(s.contactPerson || '')
    setPhone(s.phone || '')
    setEmail(s.email || '')
    setProductsStr((s.products || []).join(', '))
    setNotes(s.notes || '')
    setModalOpen(true)
  }

  const parseProducts = () =>
    productsStr
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      alert('სახელი სავალდებულოა')
      return
    }
    setSubmitting(true)
    try {
      const body = {
        name: trimmed,
        contactPerson: contactPerson.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        products: parseProducts(),
        notes: notes.trim() || null,
      }
      const res = editing
        ? await fetch(`/api/haccp/suppliers/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/haccp/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error?.message || 'შენახვა ვერ მოხერხდა')
        return
      }
      setModalOpen(false)
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (s: Supplier) => {
    if (!confirm(`წავშალოთ „${s.name}“?`)) return
    const res = await fetch(`/api/haccp/suppliers/${s.id}`, { method: 'DELETE' })
    if (!res.ok) {
      alert('წაშლა ვერ მოხერხდა')
      return
    }
    await load()
  }

  if (loading) {
    return (
      <DashboardLayout title="HACCP მომწოდებლები" breadcrumb="მთავარი / HACCP / მომწოდებლები">
        <HaccpSubNav />
        <p className="text-text-muted text-center py-12">იტვირთება...</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="HACCP მომწოდებლები" breadcrumb="მთავარი / HACCP / მომწოდებლები">
      <HaccpSubNav />

      <Card>
        <CardHeader
          action={
            <Button type="button" size="sm" onClick={openAdd}>
              + მომწოდებელი
            </Button>
          }
        >
          <h2 className="font-semibold">მომწოდებლების სია</h2>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                  <th className="p-3">სახელი</th>
                  <th className="p-3">კონტაქტი</th>
                  <th className="p-3">ტელეფონი</th>
                  <th className="p-3">ელფოსტა</th>
                  <th className="p-3">პროდუქტები</th>
                  <th className="p-3">შენიშვნა</th>
                  <th className="p-3 w-40">მოქმედება</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="p-3 font-medium">{s.name}</td>
                    <td className="p-3">{s.contactPerson || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{s.phone || '—'}</td>
                    <td className="p-3">{s.email || '—'}</td>
                    <td className="p-3 max-w-xs truncate" title={(s.products || []).join(', ')}>
                      {(s.products || []).join(', ') || '—'}
                    </td>
                    <td className="p-3 max-w-xs truncate" title={s.notes || ''}>
                      {s.notes || '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(s)}>
                          რედაქტირება
                        </Button>
                        <Button type="button" size="sm" variant="danger" onClick={() => remove(s)}>
                          წაშლა
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {suppliers.length === 0 && (
              <p className="p-4 text-text-muted text-sm">მომწოდებლები არ არის</p>
            )}
          </div>
        </CardBody>
      </Card>

      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className="bg-bg-card border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-4">{editing ? 'რედაქტირება' : 'ახალი მომწოდებელი'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">სახელი *</label>
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">კონტაქტის პირი</label>
                <input className={inputClass} value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">ტელეფონი</label>
                <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">ელფოსტა</label>
                <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">პროდუქტები (მძიმით გამოყოფილი)</label>
                <input
                  className={inputClass}
                  value={productsStr}
                  onChange={(e) => setProductsStr(e.target.value)}
                  placeholder="მაგ: სვია, მარცვალი"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">შენიშვნა</label>
                <textarea
                  className={`${inputClass} min-h-[80px]`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" onClick={save} disabled={submitting}>
                  {submitting ? 'ინახება...' : 'შენახვა'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
                  გაუქმება
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
