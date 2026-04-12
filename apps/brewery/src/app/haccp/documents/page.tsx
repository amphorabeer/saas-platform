'use client'
import { useState, useRef } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader } from '@/components/ui'
import { HaccpSubNav } from '@/components/haccp/HaccpSubNav'

const DOCUMENT_CATEGORIES = [
  {
    key: 'policy',
    label: '📋 პოლიტიკა და პროცედურები',
    docs: [
      { name: 'HACCP გეგმა', code: 'HACCP-01', required: true },
      { name: 'საბაზისო PRP პროგრამები', code: 'PRP-01', required: true },
      { name: 'საფრთხეების ანალიზი', code: 'HA-01', required: true },
      { name: 'სურსათის უვნებლობის პოლიტიკა', code: 'POL-01', required: true },
    ],
  },
  {
    key: 'sop',
    label: '📝 SOP სახელმძღვანელოები',
    docs: [
      { name: 'SOP-01 რეცხვა-დეზინფექცია', code: 'SOP-01', required: true },
      { name: 'SOP-02 თერმომეტრის კალიბრაცია', code: 'SOP-02', required: true },
      { name: 'SOP-03 პერსონალის ჰიგიენა', code: 'SOP-03', required: true },
      { name: 'SOP-04 ხელის დაბანა', code: 'SOP-04', required: true },
      { name: 'SOP-05 ნარჩენების მართვა', code: 'SOP-05', required: true },
      { name: 'SOP-06 მავნებლების კონტროლი', code: 'SOP-06', required: true },
      { name: 'SOP-07 ქიმიური საშუალებები', code: 'SOP-07', required: true },
    ],
  },
  {
    key: 'certificates',
    label: '🏆 სერტიფიკატები და ლიცენზიები',
    docs: [
      { name: 'საქმიანობის ლიცენზია', code: 'LIC-01', required: true },
      { name: 'სურსათის უვნებლობის სერტ.', code: 'CERT-01', required: true },
      { name: 'პერსონალის ჯანმრთ. წიგნაკები', code: 'HLTH-01', required: false },
      { name: 'კალიბრაციის სერტიფიკატი', code: 'CAL-01', required: false },
    ],
  },
  {
    key: 'suppliers',
    label: '🏪 მომწოდებლების დოკუმენტები',
    docs: [
      { name: 'მომწოდებლების ხარისხის გარანტიები', code: 'SUP-01', required: true },
      { name: 'ნედლეულის სპეციფიკაციები', code: 'SPEC-01', required: false },
      { name: 'ლაბორატორიული ანალიზები', code: 'LAB-01', required: false },
    ],
  },
]

export default function HaccpDocumentsPage() {
  const [uploads, setUploads] = useState<Record<string, { name: string; url: string; date: string }[]>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeDoc, setActiveDoc] = useState<string | null>(null)

  const handleUpload = (docCode: string) => {
    setActiveDoc(docCode)
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeDoc) return
    setUploading(activeDoc)
    // Simulate upload — in production connect to real storage
    setTimeout(() => {
      setUploads(prev => ({
        ...prev,
        [activeDoc]: [
          ...(prev[activeDoc] || []),
          {
            name: file.name,
            url: URL.createObjectURL(file),
            date: new Date().toLocaleDateString('ka-GE'),
          },
        ],
      }))
      setUploading(null)
      setActiveDoc(null)
    }, 800)
    e.target.value = ''
  }

  const totalDocs = DOCUMENT_CATEGORIES.flatMap(c => c.docs).length
  const uploadedDocs = Object.keys(uploads).length
  const requiredDocs = DOCUMENT_CATEGORIES.flatMap(c => c.docs).filter(d => d.required).length
  const uploadedRequired = DOCUMENT_CATEGORIES.flatMap(c => c.docs)
    .filter(d => d.required && uploads[d.code]?.length > 0).length

  return (
    <DashboardLayout title="HACCP დოკუმენტები" breadcrumb="მთავარი / HACCP / დოკუმენტები">
      <div className="print:hidden"><HaccpSubNav /></div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'სულ დოკ.', value: totalDocs, color: 'text-text-primary' },
          { label: 'ატვირთული', value: uploadedDocs, color: 'text-emerald-400' },
          { label: 'სავალდ.', value: requiredDocs, color: 'text-amber-400' },
          { label: 'სავალდ. ✓', value: uploadedRequired, color: uploadedRequired === requiredDocs ? 'text-emerald-400' : 'text-red-400' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardBody className="text-center py-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-text-muted mt-1">{stat.label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-6 p-4 bg-bg-card border border-border rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">სავალდებულო დოკუმენტები</span>
          <span className="text-sm text-text-muted">{uploadedRequired}/{requiredDocs}</span>
        </div>
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-copper rounded-full transition-all duration-500"
            style={{ width: `${requiredDocs > 0 ? (uploadedRequired / requiredDocs) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Document categories */}
      <div className="space-y-4">
        {DOCUMENT_CATEGORIES.map(category => (
          <Card key={category.key}>
            <CardHeader>
              <h2 className="font-semibold text-sm">{category.label}</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {category.docs.map(doc => {
                  const docUploads = uploads[doc.code] || []
                  const hasUpload = docUploads.length > 0
                  return (
                    <div key={doc.code}
                      className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl">
                      <span className={`text-lg shrink-0 ${hasUpload ? 'text-emerald-400' : doc.required ? 'text-red-400' : 'text-text-muted'}`}>
                        {hasUpload ? '✅' : doc.required ? '⚠️' : '📄'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{doc.name}</p>
                        <p className="text-xs text-text-muted">{doc.code}{doc.required ? ' · სავალდებულო' : ''}</p>
                        {docUploads.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {docUploads.map((u, i) => (
                              <a key={i} href={u.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-copper hover:text-copper-light underline">
                                {u.name} ({u.date})
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpload(doc.code)}
                        disabled={uploading === doc.code}
                        className="shrink-0 px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                      >
                        {uploading === doc.code ? '⏳' : hasUpload ? '+ დამატება' : '📎 ატვირთვა'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={handleFileChange}
      />
    </DashboardLayout>
  )
}
