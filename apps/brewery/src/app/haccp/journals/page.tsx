'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader, Button } from '@/components/ui'
import { HaccpSubNav } from '@/components/haccp/HaccpSubNav'

const inputClass =
  'w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary'

type JournalType =
  | 'SANITATION'
  | 'INCOMING_CONTROL'
  | 'PEST_CONTROL'
  | 'WASTE_MANAGEMENT'
  | 'TEMPERATURE'
  | 'KEG_WASHING'
  | 'FILLING'
  | 'INCIDENT'
  | 'HEALTH_CHECK'
  | 'THERMOMETER_CALIBRATION'
  | 'TRAINING'
  | 'HYGIENE_VIOLATION'
  | 'CHEMICAL_LOG'
  | 'STORAGE_CONTROL'
  | 'JOURNAL_VERIFICATION'
  | 'SUPPLIER'
  | 'MANAGEMENT_REVIEW'
  | 'AUDIT'
  | 'CORRECTIVE_ACTION'
  | 'RODENT_TRAP'

interface JournalRow {
  id: string
  type: string
  data: Record<string, unknown>
  recordedAt: string
  user: { name: string | null; email: string | null }
}

function fmtJournalValue(v: unknown): string {
  if (v === undefined || v === null || v === '') return ''
  if (typeof v === 'boolean') return v ? 'დიახ' : 'არა'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/** Full field list for print/PDF (current tab). */
function formatJournalDataFull(type: JournalType, data: Record<string, unknown>): string {
  const d = data || {}
  const lines: string[] = []
  const push = (label: string, key: string) => {
    const s = fmtJournalValue(d[key])
    if (s) lines.push(`${label}: ${s}`)
  }
  switch (type) {
    case 'SANITATION':
      push('ზონა', 'area')
      push('მეთოდი', 'method')
      push('ქიმიური საშუალება', 'chemical')
      push('კონცენტრაცია', 'concentration')
      push('შემსრულებელი', 'executedBy')
      push('შენიშვნები', 'notes')
      break
    case 'INCOMING_CONTROL':
      push('პროდუქტი', 'product')
      push('მომწოდებელი', 'supplier')
      push('რაოდენობა', 'quantity')
      push('ერთეული', 'unit')
      if (d.vehicleHygiene !== undefined) {
        lines.push(`ტრანსპორტის ჰიგიენა: ${fmtJournalValue(d.vehicleHygiene)}`)
      }
      push('დოკუმენტები', 'documents')
      push('დაბრუნებული რაოდენობა', 'returnedQty')
      push('შენიშვნები', 'notes')
      break
    case 'PEST_CONTROL':
      push('პროცედურა', 'procedure')
      push('მავნებელი', 'pest')
      push('ქიმიური საშუალება', 'chemical')
      push('დოზა', 'dose')
      push('ექსპოზიციის დრო', 'exposureTime')
      push('ზონა', 'area')
      push('შედეგი', 'result')
      push('შენიშვნები', 'notes')
      break
    case 'WASTE_MANAGEMENT':
      push('ნარჩენის ტიპი', 'wasteType')
      push('მართვის მეთოდი', 'managementMethod')
      push('ხელშეკრულების №', 'contractNo')
      push('შენიშვნები', 'notes')
      break
    case 'TEMPERATURE':
      push('ზონა', 'area')
      if (d.temperature != null && d.temperature !== '') {
        lines.push(`ტემპერატურა: ${fmtJournalValue(d.temperature)}°C`)
      }
      if (d.humidity != null && d.humidity !== '') {
        lines.push(`ტენიანობა: ${fmtJournalValue(d.humidity)}%`)
      }
      push('შენიშვნები', 'notes')
      break
    case 'KEG_WASHING':
      push('კეგი', 'kegNumber')
      push('ზომა', 'size')
      push('მდგომარეობა', 'condition')
      push('პროდუქტი', 'productName')
      push('კლიენტი', 'customerName')
      push('დაბრუნების თარიღი', 'returnedAt')
      push('შენიშვნა', 'notes')
      break
    case 'FILLING':
      push('პარტია', 'batchNumber')
      push('შეფუთვის ტიპი', 'packageType')
      push('რაოდენობა', 'quantity')
      push('მოცულობა', 'volumeTotal')
      push('ლოტი', 'lotNumber')
      push('შემსრულებელი', 'performedBy')
      push('შენიშვნა', 'notes')
      break
    case 'SUPPLIER':
      push('მომწოდებელი', 'supplier')
      push('პროდუქტი', 'product')
      push('შენიშვნა', 'notes')
      break
    case 'INCIDENT':
      push('აღწერა', 'description')
      push('ქმედება', 'action')
      push('შემსრულებელი', 'executedBy')
      break
    case 'HEALTH_CHECK':
      push('პერსონალი', 'name')
      push('სტატუსი', 'status')
      push('სიმპტომი', 'symptom')
      push('ქმედება', 'action')
      push('დაბრუნების თარიღი', 'returnDate')
      break
    case 'THERMOMETER_CALIBRATION':
      push('თერმომეტრი', 'thermometer')
      push('ეტალონი', 'reference')
      push('გაზომვა', 'measured')
      push('ეტალონი °C', 'actual')
      push('სხვაობა', 'difference')
      push('შედეგი', 'result')
      push('ქმედება', 'action')
      push('შემსრულებელი', 'executedBy')
      break
    case 'TRAINING':
      push('სტუდენტი', 'trainee')
      push('თემა', 'topic')
      push('ტრენერი', 'trainer')
      break
    case 'HYGIENE_VIOLATION':
      push('პერსონალი', 'name')
      push('დარღვევა', 'violation')
      push('ქმედება', 'action')
      push('შემსრულებელი', 'executedBy')
      break
    case 'CHEMICAL_LOG':
      push('ქიმიკატი', 'chemical')
      push('მოცულობა', 'volume')
      push('გახსნა', 'openedDate')
      push('ვადა', 'expiryDate')
      push('შემსრულებელი', 'executedBy')
      break
    case 'STORAGE_CONTROL':
      push('საწყობი', 'storage')
      push('ტემპერატურა', 'temperature')
      push('ტენიანობა', 'humidity')
      push('შემსრულებელი', 'executedBy')
      break
    case 'JOURNAL_VERIFICATION':
      push('ჯგუფის ლიდერი', 'leader')
      push('შენიშვნა', 'notes')
      push('დამტკიცების დრო', 'verifiedAt')
      break
    case 'MANAGEMENT_REVIEW':
      push('თავმჯდომარე', 'leader')
      push('მონაწილეები', 'participants')
      push('დღის წესრიგი', 'agenda')
      push('გადაწყვეტილებები', 'decisions')
      push('შემდეგი შეხვედრა', 'nextDate')
      break
    case 'AUDIT':
      push('აუდიტორი', 'auditor')
      push('შენიშვნა', 'notes')
      if (d.items && typeof d.items === 'object') {
        lines.push(`პუნქტები: ${JSON.stringify(d.items)}`)
      }
      break
    case 'CORRECTIVE_ACTION':
      push('აღწერა', 'description')
      push('მიზეზი', 'cause')
      push('ქმედება', 'action')
      push('პასუხისმგებელი', 'responsible')
      push('ვადა', 'deadline')
      break
    case 'RODENT_TRAP':
      push('კვირა', 'week')
      push('შემოწმებული', 'checkedCount')
      push('შენიშვნა', 'notes')
      push('შემსრულებელი', 'executedBy')
      break
    default:
      break
  }
  return lines.join('\n') || '—'
}

function summarizeData(type: JournalType, data: Record<string, unknown>): string {
  switch (type) {
    case 'SANITATION':
      return [data.area, data.method, data.chemical].filter(Boolean).join(' · ') || '—'
    case 'INCOMING_CONTROL':
      return [data.product, data.supplier].filter(Boolean).join(' · ') || '—'
    case 'PEST_CONTROL':
      return [data.procedure, data.pest, data.result].filter(Boolean).join(' · ') || '—'
    case 'WASTE_MANAGEMENT':
      return [data.wasteType, data.managementMethod].filter(Boolean).join(' · ') || '—'
    case 'TEMPERATURE':
      return [data.area, data.temperature != null ? `${data.temperature}°C` : null].filter(Boolean).join(' · ') || '—'
    case 'KEG_WASHING':
      return [
        data.kegNumber,
        data.size ? `${data.size}L` : null,
        data.condition,
        data.productName,
      ].filter(Boolean).join(' · ') || '—'
    case 'FILLING':
      return [
        data.batchNumber,
        data.packageType,
        data.quantity ? `× ${data.quantity}` : null,
        data.volumeTotal ? `${data.volumeTotal}L` : null,
      ].filter(Boolean).join(' · ') || '—'
    case 'SUPPLIER':
      return [data.supplier, data.product].filter(Boolean).join(' · ') || '—'
    case 'INCIDENT':
      return String(data.description || '—')
    case 'HEALTH_CHECK':
      return [data.name, data.status].filter(Boolean).join(' · ') || '—'
    case 'THERMOMETER_CALIBRATION':
      return [data.thermometer, data.result].filter(Boolean).join(' · ') || '—'
    case 'TRAINING':
      return [data.trainee, data.topic].filter(Boolean).join(' · ') || '—'
    case 'HYGIENE_VIOLATION':
      return [data.name, data.violation].filter(Boolean).join(' · ') || '—'
    case 'CHEMICAL_LOG':
      return [data.chemical, data.volume != null ? `${data.volume}L` : null].filter(Boolean).join(' · ') || '—'
    case 'STORAGE_CONTROL':
      return [data.storage, data.temperature != null ? `${data.temperature}°C` : null].filter(Boolean).join(' · ') || '—'
    case 'JOURNAL_VERIFICATION':
      return [data.leader, data.notes].filter(Boolean).join(' · ') || '—'
    case 'MANAGEMENT_REVIEW':
      return [data.leader, data.agenda].filter(Boolean).join(' · ') || '—'
    case 'AUDIT':
      return [data.auditor, data.notes].filter(Boolean).join(' · ') || '—'
    case 'CORRECTIVE_ACTION':
      return [data.description, data.action].filter(Boolean).join(' · ') || '—'
    case 'RODENT_TRAP':
      return [data.week != null ? `კვირა ${data.week}` : null, data.checkedCount != null ? `${data.checkedCount}/10` : null]
        .filter(Boolean)
        .join(' · ') || '—'
    default:
      return '—'
  }
}

export default function HaccpJournalsPage() {
  const [tab, setTab] = useState<JournalType | null>(null)
  const [category, setCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<JournalRow[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string | null }[]>([])
  const [mounted, setMounted] = useState(false)
  const [supplierRows, setSupplierRows] = useState<
    Array<{
      id: string
      name: string
      contactPerson: string | null
      phone: string | null
      email: string | null
      address: string | null
      products: string[]
      notes: string | null
    }>
  >([])
  const [suppliersLoading, setSuppliersLoading] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // SANITATION
  const [s_date, setS_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [s_zones, setS_zones] = useState<string[]>([])
  const [s_submitting, setS_submitting] = useState(false)
  const [s_success, setS_success] = useState(false)
  const SANITATION_ZONES = [
    'თაროები',
    'სავენტილაციო არხები',
    'ნათურები',
    'იატაკი',
    'ჭერი',
    'კედლები',
    'ფანჯრები',
    'ნარჩენები',
    'სატვირთო ინვენტარი',
    'დეზინფექცია',
  ]
  const [s_by, setS_by] = useState('')

  // INCOMING CONTROL form states
  const [ic_date, setIc_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [ic_product, setIc_product] = useState('')
  const [ic_qty, setIc_qty] = useState('')
  const [ic_unit, setIc_unit] = useState('კგ')
  const [ic_supplier, setIc_supplier] = useState('')
  const [ic_transport, setIc_transport] = useState(false)
  const [ic_docs, setIc_docs] = useState(false)
  const [ic_temp, setIc_temp] = useState('')
  const [ic_packaging, setIc_packaging] = useState(false)
  const [ic_quality, setIc_quality] = useState(false)
  const [ic_smell, setIc_smell] = useState(false)
  const [ic_returned, setIc_returned] = useState('')
  const [ic_executor, setIc_executor] = useState('')
  const [ic_notes, setIc_notes] = useState('')
  const [ic_submitting, setIc_submitting] = useState(false)
  const [ic_success, setIc_success] = useState(false)
  const [ic_editing, setIc_editing] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])

  // PEST CONTROL
  const [pc_date, setPc_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [pc_procedure, setPc_procedure] = useState('')
  const [pc_pest, setPc_pest] = useState('')
  const [pc_chemical, setPc_chemical] = useState('')
  const [pc_dose, setPc_dose] = useState('')
  const [pc_exposure, setPc_exposure] = useState('')
  const [pc_area, setPc_area] = useState('')
  const [pc_result, setPc_result] = useState('')
  const [pc_executor, setPc_executor] = useState('')
  const [pc_controller, setPc_controller] = useState('')
  const [pc_notes, setPc_notes] = useState('')
  const [pc_editing, setPc_editing] = useState<string | null>(null)
  const [pc_submitting, setPc_submitting] = useState(false)
  const [pc_success, setPc_success] = useState(false)

  // WASTE MANAGEMENT
  const [wm_date, setWm_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [wm_type, setWm_type] = useState('')
  const [wm_method, setWm_method] = useState('')
  const [wm_contract, setWm_contract] = useState('')
  const [wm_executor, setWm_executor] = useState('')
  const [wm_approver, setWm_approver] = useState('')
  const [wm_notes, setWm_notes] = useState('')
  const [wm_editing, setWm_editing] = useState<string | null>(null)
  const [wm_submitting, setWm_submitting] = useState(false)
  const [wm_success, setWm_success] = useState(false)

  // TEMPERATURE
  const [tmp_date, setTmp_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [tmp_time, setTmp_time] = useState(() => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [tmp_zone, setTmp_zone] = useState('')
  const [tmp_temp, setTmp_temp] = useState('')
  const [tmp_humidity, setTmp_humidity] = useState('')
  const [tmp_executor, setTmp_executor] = useState('')
  const [tmp_notes, setTmp_notes] = useState('')
  const [tmp_editing, setTmp_editing] = useState<string | null>(null)
  const [tmp_submitting, setTmp_submitting] = useState(false)
  const [tmp_success, setTmp_success] = useState(false)

  // KEG WASHING manual
  const [kw_date, setKw_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [kw_kegNumber, setKw_kegNumber] = useState('')
  const [kw_size, setKw_size] = useState('')
  const [kw_chemical, setKw_chemical] = useState('')
  const [kw_concentration, setKw_concentration] = useState('')
  const [kw_temp, setKw_temp] = useState('')
  const [kw_duration, setKw_duration] = useState('')
  const [kw_result, setKw_result] = useState('კარგი')
  const [kw_executor, setKw_executor] = useState('')
  const [kw_notes, setKw_notes] = useState('')
  const [kw_editing, setKw_editing] = useState<string | null>(null)
  const [kw_submitting, setKw_submitting] = useState(false)
  const [kw_success, setKw_success] = useState(false)

  // FILLING manual
  const [fl_date, setFl_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [fl_batchNumber, setFl_batchNumber] = useState('')
  const [fl_packageType, setFl_packageType] = useState('')
  const [fl_quantity, setFl_quantity] = useState('')
  const [fl_volume, setFl_volume] = useState('')
  const [fl_executor, setFl_executor] = useState('')
  const [fl_notes, setFl_notes] = useState('')
  const [fl_editing, setFl_editing] = useState<string | null>(null)
  const [fl_submitting, setFl_submitting] = useState(false)
  const [fl_success, setFl_success] = useState(false)

  // INCIDENT
  const [inc_date, setInc_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [inc_description, setInc_description] = useState('')
  const [inc_action, setInc_action] = useState('')
  const [inc_executor, setInc_executor] = useState('')
  const [inc_editing, setInc_editing] = useState<string | null>(null)
  const [inc_submitting, setInc_submitting] = useState(false)
  const [inc_success, setInc_success] = useState(false)

  // HEALTH_CHECK
  const [hc_date, setHc_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [hc_name, setHc_name] = useState('')
  const [hc_status, setHc_status] = useState('ჯანმრთელი')
  const [hc_symptom, setHc_symptom] = useState('')
  const [hc_action, setHc_action] = useState('')
  const [hc_returnDate, setHc_returnDate] = useState('')
  const [hc_editing, setHc_editing] = useState<string | null>(null)
  const [hc_submitting, setHc_submitting] = useState(false)
  const [hc_success, setHc_success] = useState(false)

  // THERMOMETER_CALIBRATION
  const [tc_date, setTc_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [tc_thermometer, setTc_thermometer] = useState('')
  const [tc_reference, setTc_reference] = useState('')
  const [tc_measured, setTc_measured] = useState('')
  const [tc_actual, setTc_actual] = useState('')
  const [tc_difference, setTc_difference] = useState('')
  const [tc_result, setTc_result] = useState('გამართული')
  const [tc_action, setTc_action] = useState('')
  const [tc_executor, setTc_executor] = useState('')
  const [tc_editing, setTc_editing] = useState<string | null>(null)
  const [tc_submitting, setTc_submitting] = useState(false)
  const [tc_success, setTc_success] = useState(false)

  // TRAINING
  const [tr_date, setTr_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [tr_trainee, setTr_trainee] = useState('')
  const [tr_topic, setTr_topic] = useState('')
  const [tr_trainer, setTr_trainer] = useState('')
  const [tr_editing, setTr_editing] = useState<string | null>(null)
  const [tr_submitting, setTr_submitting] = useState(false)
  const [tr_success, setTr_success] = useState(false)

  // HYGIENE_VIOLATION
  const [hv_date, setHv_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [hv_name, setHv_name] = useState('')
  const [hv_violation, setHv_violation] = useState('')
  const [hv_action, setHv_action] = useState('')
  const [hv_executor, setHv_executor] = useState('')
  const [hv_editing, setHv_editing] = useState<string | null>(null)
  const [hv_submitting, setHv_submitting] = useState(false)
  const [hv_success, setHv_success] = useState(false)

  // CHEMICAL_LOG
  const [cl_date, setCl_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [cl_chemical, setCl_chemical] = useState('')
  const [cl_volume, setCl_volume] = useState('')
  const [cl_openedDate, setCl_openedDate] = useState('')
  const [cl_expiryDate, setCl_expiryDate] = useState('')
  const [cl_executor, setCl_executor] = useState('')
  const [cl_editing, setCl_editing] = useState<string | null>(null)
  const [cl_submitting, setCl_submitting] = useState(false)
  const [cl_success, setCl_success] = useState(false)

  // STORAGE_CONTROL
  const [sc_date, setSc_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [sc_time, setSc_time] = useState('09:00')
  const [sc_storage, setSc_storage] = useState('')
  const [sc_temp, setSc_temp] = useState('')
  const [sc_humidity, setSc_humidity] = useState('')
  const [sc_executor, setSc_executor] = useState('')
  const [sc_editing, setSc_editing] = useState<string | null>(null)
  const [sc_submitting, setSc_submitting] = useState(false)
  const [sc_success, setSc_success] = useState(false)

  // JOURNAL_VERIFICATION
  const [jv_date, setJv_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [jv_notes, setJv_notes] = useState('')
  const [jv_leader, setJv_leader] = useState('')
  const [jv_editing, setJv_editing] = useState<string | null>(null)
  const [jv_submitting, setJv_submitting] = useState(false)
  const [jv_success, setJv_success] = useState(false)

  // MANAGEMENT_REVIEW
  const [mr_date, setMr_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [mr_agenda, setMr_agenda] = useState('')
  const [mr_participants, setMr_participants] = useState('')
  const [mr_decisions, setMr_decisions] = useState('')
  const [mr_nextDate, setMr_nextDate] = useState('')
  const [mr_leader, setMr_leader] = useState('')
  const [mr_editing, setMr_editing] = useState<string | null>(null)
  const [mr_submitting, setMr_submitting] = useState(false)
  const [mr_success, setMr_success] = useState(false)

  // AUDIT
  const [au_date, setAu_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [au_items, setAu_items] = useState<Record<string, 'yes' | 'no' | null>>({})
  const [au_notes, setAu_notes] = useState('')
  const [au_auditor, setAu_auditor] = useState('')
  const [au_editing, setAu_editing] = useState<string | null>(null)
  const [au_submitting, setAu_submitting] = useState(false)
  const [au_success, setAu_success] = useState(false)

  // CORRECTIVE_ACTION
  const [ca_date, setCa_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [ca_description, setCa_description] = useState('')
  const [ca_cause, setCa_cause] = useState('')
  const [ca_action, setCa_action] = useState('')
  const [ca_responsible, setCa_responsible] = useState('')
  const [ca_deadline, setCa_deadline] = useState('')
  const [ca_editing, setCa_editing] = useState<string | null>(null)
  const [ca_submitting, setCa_submitting] = useState(false)
  const [ca_success, setCa_success] = useState(false)

  // RODENT_TRAP
  const [rt_date, setRt_date] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [rt_week, setRt_week] = useState('I')
  const [rt_traps, setRt_traps] = useState<Record<number, boolean>>({})
  const [rt_notes, setRt_notes] = useState('')
  const [rt_executor, setRt_executor] = useState('')
  const [rt_editing, setRt_editing] = useState<string | null>(null)
  const [rt_submitting, setRt_submitting] = useState(false)
  const [rt_success, setRt_success] = useState(false)

  const JOURNAL_CARDS = [
    { type: 'SANITATION' as JournalType, icon: '🧹', title: 'სანიტაცია', code: 'F-SOP-001H-01', category: 'sanitation' },
    { type: 'KEG_WASHING' as JournalType, icon: '🛢️', title: 'კეგის რეცხვა', code: 'KEG-CIP', category: 'sanitation' },
    { type: 'CHEMICAL_LOG' as JournalType, icon: '🧪', title: 'ქიმიკატების აღრიცხვა', code: 'RS-03.1', category: 'sanitation' },
    { type: 'TEMPERATURE' as JournalType, icon: '🌡️', title: 'ტემპერატურა', code: 'ტემპ-01', category: 'temperature' },
    { type: 'STORAGE_CONTROL' as JournalType, icon: '🏭', title: 'საწყობის კონტროლი', code: 'RS-15.1', category: 'temperature' },
    {
      type: 'THERMOMETER_CALIBRATION' as JournalType,
      icon: '⚖️',
      title: 'თერმომეტრის კალიბრაცია',
      code: 'RS-04.1',
      category: 'temperature',
    },
    {
      type: 'HEALTH_CHECK' as JournalType,
      icon: '🏥',
      title: 'პერსონალის ჯანმრთელობა',
      code: 'RS-11.1',
      category: 'personnel',
    },
    { type: 'HYGIENE_VIOLATION' as JournalType, icon: '⚠️', title: 'ჰიგიენის დარღვევა', code: 'RS-09.1', category: 'personnel' },
    { type: 'TRAINING' as JournalType, icon: '📚', title: 'ტრენინგი', code: 'RS-06.1', category: 'personnel' },
    {
      type: 'MANAGEMENT_REVIEW' as JournalType,
      icon: '👔',
      title: 'მენეჯმ. განხილვა',
      code: 'F-08',
      category: 'personnel',
    },
    { type: 'INCOMING_CONTROL' as JournalType, icon: '📥', title: 'შემავალი კონტროლი', code: 'RS-10.1', category: 'production' },
    { type: 'FILLING' as JournalType, icon: '🍺', title: 'ჩამოსხმა', code: 'ჩამოსხმა-01', category: 'production' },
    { type: 'WASTE_MANAGEMENT' as JournalType, icon: '♻️', title: 'ნარჩენების მართვა', code: 'ნარჩ-01', category: 'production' },
    { type: 'SUPPLIER' as JournalType, icon: '🏪', title: 'მომწოდებლები', code: 'RS-08.1', category: 'production' },
    { type: 'PEST_CONTROL' as JournalType, icon: '🐀', title: 'მავნებლების კონტ.', code: 'მავნ-01', category: 'safety' },
    { type: 'INCIDENT' as JournalType, icon: '🚨', title: 'ინციდენტი', code: 'RS-07.1', category: 'safety' },
    {
      type: 'JOURNAL_VERIFICATION' as JournalType,
      icon: '✅',
      title: 'ჟურნალების გადამოწმება',
      code: 'RS-18.01',
      category: 'safety',
    },
    {
      type: 'CORRECTIVE_ACTION' as JournalType,
      icon: '🔧',
      title: 'მაკორექტ. ქმედება',
      code: 'F-10.2',
      category: 'safety',
    },
    { type: 'AUDIT' as JournalType, icon: '🔍', title: 'HACCP აუდიტი', code: 'F-09.3', category: 'safety' },
    { type: 'RODENT_TRAP' as JournalType, icon: '🪤', title: 'სათაგურების შემოწ.', code: 'F-24', category: 'safety' },
  ]

  const CATEGORIES = [
    { key: 'all', label: 'ყველა' },
    { key: 'sanitation', label: '🧹 სანიტარია' },
    { key: 'temperature', label: '🌡️ ტემპერატურა' },
    { key: 'personnel', label: '👥 პერსონალი' },
    { key: 'production', label: '📦 წარმოება' },
    { key: 'safety', label: '⚠️ უსაფრთხოება' },
  ]

  const TAB_LABELS: Record<JournalType, string> = {
    SANITATION: 'სანიტაცია',
    KEG_WASHING: 'კეგის რეცხვა',
    CHEMICAL_LOG: 'ქიმიკატები',
    TEMPERATURE: 'ტემპერატურა',
    STORAGE_CONTROL: 'საწყობი',
    THERMOMETER_CALIBRATION: 'თერმომეტრი',
    HEALTH_CHECK: 'ჯანმრთელობა',
    HYGIENE_VIOLATION: 'ჰიგ. დარღვევა',
    TRAINING: 'ტრენინგი',
    INCOMING_CONTROL: 'შემავ. კონტ.',
    FILLING: 'ჩამოსხმა',
    WASTE_MANAGEMENT: 'ნარჩენები',
    PEST_CONTROL: 'მავნებლები',
    INCIDENT: 'ინციდენტი',
    JOURNAL_VERIFICATION: '✅ გადამოწმება',
    SUPPLIER: 'მომწოდებლები',
    MANAGEMENT_REVIEW: 'მენეჯმ. განხილვა',
    AUDIT: 'HACCP აუდიტი',
    CORRECTIVE_ACTION: 'მაკორექტ. ქმედება',
    RODENT_TRAP: 'სათაგურების შემოწ.',
  }

  const load = useCallback(async (t: JournalType) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: t, limit: '200' })
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`/api/haccp/journals?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.journals || [])
      }
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  const deleteJournal = async (id: string) => {
    if (!confirm('წაიშალოს ეს ჩანაწერი?')) return
    try {
      const res = await fetch(`/api/haccp/journals/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        alert('წაშლა ვერ მოხერხდა')
        return
      }
      if (tab) await load(tab)
    } catch {
      alert('წაშლა ვერ მოხერხდა')
    }
  }

  const exportPdf = async () => {
    if (!tab) return
    setPdfLoading(true)
    try {
      if (tab === 'SANITATION') {
        const params = new URLSearchParams()
        if (dateFrom) {
          const d = new Date(dateFrom)
          params.set('year', String(d.getFullYear()))
          params.set('month', String(d.getMonth() + 1))
        } else {
          const now = new Date()
          params.set('year', String(now.getFullYear()))
          params.set('month', String(now.getMonth() + 1))
        }
        window.open(`/api/haccp/journals/sanitation-pdf?${params}`, '_blank')
      } else {
        const params = new URLSearchParams({ type: tab })
        if (dateFrom) params.set('dateFrom', dateFrom)
        if (dateTo) params.set('dateTo', dateTo)
        window.open(`/api/haccp/journals/pdf?${params}`, '_blank')
      }
    } finally {
      setPdfLoading(false)
    }
  }

  useEffect(() => {
    if (tab) load(tab)
  }, [tab, load, dateFrom, dateTo])

  useEffect(() => {
    if (tab === 'SUPPLIER') {
      setSuppliersLoading(true)
      fetch('/api/haccp/suppliers?limit=200')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.suppliers) setSupplierRows(data.suppliers)
        })
        .catch(() => {})
        .finally(() => setSuppliersLoading(false))
    }
  }, [tab])

  useEffect(() => {
    fetch('/api/users')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.users) setUsers(data.users)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/haccp/suppliers?limit=200')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.suppliers) setSuppliers(data.suppliers)
      })
      .catch(() => {})
  }, [])

  const resetForms = () => {
    setS_by('')
  }

  const submitJournal = async () => {
    setSubmitting(true)
    try {
      setModalOpen(false)
      resetForms()
      if (tab) await load(tab)
    } finally {
      setSubmitting(false)
    }
  }

  const tabLabel = tab ? (TAB_LABELS[tab] ?? tab) : '—'

  return (
    <DashboardLayout title="HACCP ჟურნალები" breadcrumb="მთავარი / HACCP / ჟურნალები">
      <div className="print:hidden">
        <HaccpSubNav />
      </div>

      <div className="p-4 md:p-6 max-w-4xl mx-auto print:max-w-none">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary">HACCP ჟურნალები</h1>
            <p className="text-xs text-text-muted mt-0.5">მთავარი / HACCP / ჟურნალები</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={exportPdf}
              className="text-sm text-text-muted hover:text-text-primary"
              title="ბეჭდვა"
            >
              🖨️
            </button>
            <button
              type="button"
              onClick={exportPdf}
              disabled={pdfLoading || !tab}
              className="text-sm font-medium text-copper hover:text-copper-light disabled:opacity-50"
            >
              {pdfLoading ? '⏳...' : '📄 PDF'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="flex items-center gap-2 bg-bg-card border border-border rounded-xl px-3 py-2">
            <input
              type="date"
              className="bg-transparent text-sm text-text-primary outline-none"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-text-muted text-xs">—</span>
            <input
              type="date"
              className="bg-transparent text-sm text-text-primary outline-none"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => tab && load(tab)}
            className="px-3 py-2 bg-copper/20 text-copper-light border border-copper/30 rounded-xl text-sm"
          >
            🔍
          </button>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('')
                setDateTo('')
                if (tab) setTimeout(() => load(tab), 0)
              }}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => {
                setCategory(cat.key)
                if (cat.key !== 'all') {
                  const first = JOURNAL_CARDS.find((c) => c.category === cat.key)
                  if (first) setTab(first.type)
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                category === cat.key
                  ? 'bg-amber-500 text-white'
                  : 'bg-bg-card border border-border text-text-muted hover:text-text-primary'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden mb-6 print:hidden">
          {JOURNAL_CARDS.filter((c) => category === 'all' || c.category === category).map((card, idx, arr) => (
            <button
              key={card.type}
              type="button"
              onClick={() => setTab(card.type === tab ? null : card.type)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 transition-colors text-left ${
                idx < arr.length - 1 ? 'border-b border-border' : ''
              } ${
                tab === card.type
                  ? 'bg-amber-500/10 border-l-2 border-l-amber-500'
                  : 'hover:bg-bg-tertiary'
              }`}
            >
              <span className="text-2xl shrink-0">{card.icon}</span>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    tab === card.type ? 'text-amber-400' : 'text-text-primary'
                  }`}
                >
                  {card.title}
                </p>
                <p className="text-xs text-text-muted">{card.code}</p>
              </div>
              <span
                className={`text-text-muted transition-transform inline-block ${
                  tab === card.type ? 'rotate-90' : ''
                }`}
              >
                ›
              </span>
            </button>
          ))}
        </div>

        {tab && (
          <div className="hidden print:block haccp-print-table mb-4 text-black">
            <h3 className="text-base font-semibold text-center mb-3">{tabLabel}</h3>
            {loading ? (
              <p className="text-sm text-center py-6">იტვირთება...</p>
            ) : (
              <>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="border border-gray-400 p-2 text-left print:bg-transparent print:text-black w-40">
                        დრო
                      </th>
                      <th className="border border-gray-400 p-2 text-left print:bg-transparent print:text-black">
                        ყველა ველი
                      </th>
                      <th className="border border-gray-400 p-2 text-left print:bg-transparent print:text-black w-36">
                        ავტორი
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="border border-gray-400 p-2 align-top whitespace-nowrap">
                          {mounted ? new Date(r.recordedAt).toLocaleString('ka-GE') : ''}
                        </td>
                        <td className="border border-gray-400 p-2 align-top whitespace-pre-wrap">
                          {formatJournalDataFull(tab, (r.data as Record<string, unknown>) || {})}
                        </td>
                        <td className="border border-gray-400 p-2 align-top">
                          {r.user?.name || r.user?.email || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length === 0 && <p className="text-sm text-center py-4">ჩანაწერები არ არის</p>}
              </>
            )}
          </div>
        )}

        {tab && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
      {tab === 'SANITATION' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">RS-02.1-N1</p>
                <h2 className="font-semibold">რეცხვა-დეზინფექციის ჟურნალი</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                <input
                  type="date"
                  className="px-4 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary"
                  value={s_date}
                  onChange={(e) => setS_date(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-2">
                  შესასრულებელი სამუშაოები (მონიშნეთ შესრულებული)
                </label>
                <div className="space-y-2">
                  {SANITATION_ZONES.map((zone) => {
                    const checked = s_zones.includes(zone)
                    return (
                      <label
                        key={zone}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-emerald-900/20 border-emerald-600/40 text-text-primary'
                            : 'bg-bg-tertiary border-border text-text-secondary hover:border-border-hover'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-emerald-500"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setS_zones([...s_zones, zone])
                            } else {
                              setS_zones(s_zones.filter((z) => z !== zone))
                            }
                          }}
                        />
                        <span className="text-sm">{zone}</span>
                        {checked && <span className="ml-auto text-emerald-400 text-sm">✓</span>}
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-copper hover:text-copper-light"
                  onClick={() => setS_zones([...SANITATION_ZONES])}
                >
                  ყველა მონიშვნა
                </button>
                <span className="text-text-muted text-xs">·</span>
                <button
                  type="button"
                  className="text-xs text-text-muted hover:text-text-primary"
                  onClick={() => setS_zones([])}
                >
                  გასუფთავება
                </button>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">
                  შემსრულებელი (არასავალდებულო)
                </label>
                <select
                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary"
                  value={s_by}
                  onChange={(e) => setS_by(e.target.value)}
                >
                  <option value="">— მიმდინარე მომხმარებელი —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.name || u.email || u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </div>

              {s_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}

              <Button
                type="button"
                disabled={s_submitting || s_zones.length === 0 || !s_date}
                onClick={async () => {
                  setS_submitting(true)
                  setS_success(false)
                  try {
                    await Promise.all(
                      s_zones.map((zone) =>
                        fetch('/api/haccp/journals', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            type: 'SANITATION',
                            recordedAt: new Date(s_date + 'T12:00:00').toISOString(),
                            data: {
                              area: zone,
                              executedBy: s_by || undefined,
                            },
                          }),
                        })
                      )
                    )
                    setS_zones([])
                    setS_success(true)
                    await load(tab)
                    setTimeout(() => setS_success(false), 3000)
                  } catch {
                    alert('შენახვა ვერ მოხერხდა')
                  } finally {
                    setS_submitting(false)
                  }
                }}
              >
                {s_submitting ? 'ინახება...' : `შენახვა (${s_zones.length} ზონა)`}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">დრო</th>
                      <th className="p-3">ზონა</th>
                      <th className="p-3">ავტორი</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3 whitespace-nowrap">
                            {mounted ? new Date(r.recordedAt).toLocaleString('ka-GE') : ''}
                          </td>
                          <td className="p-3">{String(d.area || '—')}</td>
                          <td className="p-3">{r.user?.name || r.user?.email || '—'}</td>
                          <td className="p-3 w-24">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const recDate = new Date(r.recordedAt)
                                  setS_date(
                                    `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
                                  )
                                  setS_zones([String(d.area || '')])
                                  setS_by(String(d.executedBy || ''))
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && (
                  <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}{tab === 'INCOMING_CONTROL' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">RS-10.1</p>
                <h2 className="font-semibold">
                  {ic_editing ? '✏️ ჩანაწერის რედაქტირება' : 'ნედლეულის მიღების ფორმა'}
                </h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={ic_date}
                    onChange={(e) => setIc_date(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">პროდუქტის დასახელება *</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={ic_product}
                    onChange={(e) => setIc_product(e.target.value)}
                    placeholder="მაგ: სვია, სხმულა, შაქარი..."
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-text-muted mb-1">რაოდენობა</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={ic_qty}
                      onChange={(e) => setIc_qty(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs text-text-muted mb-1">ერთეული</label>
                    <select
                      className={inputClass}
                      value={ic_unit}
                      onChange={(e) => setIc_unit(e.target.value)}
                    >
                      <option>კგ</option>
                      <option>ლ</option>
                      <option>ცალი</option>
                      <option>ტ</option>
                      <option>მ³</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">მომწოდებელი</label>
                  <select
                    className={inputClass}
                    value={ic_supplier}
                    onChange={(e) => setIc_supplier(e.target.value)}
                  >
                    <option value="">— აირჩიეთ —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col justify-center gap-2 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-copper rounded"
                      checked={ic_transport}
                      onChange={(e) => setIc_transport(e.target.checked)}
                    />
                    <span>ტრანსპ. ჰიგიენა ✓</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-copper rounded"
                      checked={ic_docs}
                      onChange={(e) => setIc_docs(e.target.checked)}
                    />
                    <span>დოკუმენტაცია ✓</span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">მიღების ტემპ. (°C)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={ic_temp}
                    onChange={(e) => setIc_temp(e.target.value)}
                    placeholder="0"
                    step="0.1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-2">ხარისხის კონტროლი</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'შეფუთვის ჰერმეტულობა', val: ic_packaging, set: setIc_packaging },
                    { label: 'ხარისხი', val: ic_quality, set: setIc_quality },
                    { label: 'სუნი / გემო', val: ic_smell, set: setIc_smell },
                  ].map(({ label, val, set }) => (
                    <label
                      key={label}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        val
                          ? 'bg-emerald-900/20 border-emerald-600/40'
                          : 'bg-bg-tertiary border-border hover:border-border-hover'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-emerald-500"
                        checked={val}
                        onChange={(e) => set(e.target.checked)}
                      />
                      <span className="text-sm">{label}</span>
                      {val && <span className="ml-auto text-emerald-400">✓</span>}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">გაბრუნდა უკან (კგ/ლ)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={ic_returned}
                    onChange={(e) => setIc_returned(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">მიმღები (არასავალდ.)</label>
                  <select
                    className={inputClass}
                    value={ic_executor}
                    onChange={(e) => setIc_executor(e.target.value)}
                  >
                    <option value="">— მიმდინარე მომხ. —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">შენიშვნა</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={ic_notes}
                    onChange={(e) => setIc_notes(e.target.value)}
                    placeholder="დამატებითი ინფო..."
                  />
                </div>
              </div>

              {ic_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={ic_submitting || !ic_product || !ic_date}
                  onClick={async () => {
                    setIc_submitting(true)
                    setIc_success(false)
                    try {
                      const body = {
                        type: 'INCOMING_CONTROL',
                        recordedAt: new Date(ic_date + 'T12:00:00').toISOString(),
                        data: {
                          product: ic_product,
                          quantity: ic_qty,
                          unit: ic_unit,
                          supplier: ic_supplier,
                          vehicleHygiene: ic_transport,
                          documents: ic_docs,
                          temperature: ic_temp ? Number(ic_temp) : null,
                          packagingIntegrity: ic_packaging,
                          quality: ic_quality,
                          smellTaste: ic_smell,
                          returnedQty: ic_returned ? Number(ic_returned) : null,
                          executedBy: ic_executor || undefined,
                          notes: ic_notes || undefined,
                        },
                      }

                      const res = ic_editing
                        ? await fetch(`/api/haccp/journals/${ic_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })

                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}))
                        alert(err?.error?.message || 'შენახვა ვერ მოხერხდა')
                        return
                      }
                      setIc_product('')
                      setIc_qty('')
                      setIc_unit('კგ')
                      setIc_supplier('')
                      setIc_transport(false)
                      setIc_docs(false)
                      setIc_temp('')
                      setIc_packaging(false)
                      setIc_quality(false)
                      setIc_smell(false)
                      setIc_returned('')
                      setIc_executor('')
                      setIc_notes('')
                      setIc_editing(null)
                      setIc_success(true)
                      await load(tab)
                      setTimeout(() => setIc_success(false), 3000)
                    } finally {
                      setIc_submitting(false)
                    }
                  }}
                >
                  {ic_submitting ? 'ინახება...' : ic_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {ic_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIc_editing(null)
                      setIc_product('')
                      setIc_qty('')
                      setIc_unit('კგ')
                      setIc_supplier('')
                      setIc_transport(false)
                      setIc_docs(false)
                      setIc_temp('')
                      setIc_packaging(false)
                      setIc_quality(false)
                      setIc_smell(false)
                      setIc_returned('')
                      setIc_executor('')
                      setIc_notes('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">პროდუქტი</th>
                      <th className="p-3">მომწოდ.</th>
                      <th className="p-3">რაოდ.</th>
                      <th className="p-3">ტემპ°C</th>
                      <th className="p-3">მიმღები</th>
                      <th className="p-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3 whitespace-nowrap">
                            {mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}
                          </td>
                          <td className="p-3">{String(d.product || '—')}</td>
                          <td className="p-3">{String(d.supplier || '—')}</td>
                          <td className="p-3">{d.quantity ? `${d.quantity} ${d.unit || ''}` : '—'}</td>
                          <td className="p-3">{d.temperature != null ? `${d.temperature}°C` : '—'}</td>
                          <td className="p-3">{r.user?.name || r.user?.email || '—'}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              className="text-xs text-copper hover:text-copper-light"
                              onClick={() => {
                                const recDate = new Date(r.recordedAt)
                                setIc_editing(r.id)
                                setIc_date(
                                  `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
                                )
                                setIc_product(String(d.product || ''))
                                setIc_qty(String(d.quantity || ''))
                                setIc_unit(String(d.unit || 'კგ'))
                                setIc_supplier(String(d.supplier || ''))
                                setIc_transport(Boolean(d.vehicleHygiene))
                                setIc_docs(Boolean(d.documents))
                                setIc_temp(String(d.temperature ?? ''))
                                setIc_packaging(Boolean(d.packagingIntegrity))
                                setIc_quality(Boolean(d.quality))
                                setIc_smell(Boolean(d.smellTaste))
                                setIc_returned(String(d.returnedQty ?? ''))
                                setIc_executor(String(d.executedBy || ''))
                                setIc_notes(String(d.notes || ''))
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                              }}
                            >
                              ✏️ რედ.
                            </button>
                            <button
                              type="button"
                              className="text-xs text-red-400 hover:text-red-300 ml-1"
                              onClick={() => deleteJournal(r.id)}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && (
                  <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}{tab === 'PEST_CONTROL' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">მავნ.-01</p>
                <h2 className="font-semibold">
                  {pc_editing ? '✏️ ჩანაწერის რედაქტირება' : 'მავნებლების კონტროლის ჟურნალი'}
                </h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={pc_date}
                    onChange={(e) => setPc_date(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">ჩატარებული პროცედურა *</label>
                  <select
                    className={inputClass}
                    value={pc_procedure}
                    onChange={(e) => setPc_procedure(e.target.value)}
                  >
                    <option value="">— აირჩიეთ —</option>
                    <option>სპრეი დამუშავება</option>
                    <option>ბარიერული დამუშავება</option>
                    <option>ხაფანგების განახლება</option>
                    <option>ინსპექცია</option>
                    <option>ფუმიგაცია</option>
                    <option>სხვა</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">მავნებელი</label>
                  <select className={inputClass} value={pc_pest} onChange={(e) => setPc_pest(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    <option>მღრღნელები</option>
                    <option>მწერები</option>
                    <option>ბუზები</option>
                    <option>ტარაკნები</option>
                    <option>მობუდარი ფრინველები</option>
                    <option>სხვა</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">ქიმიკატი (აქტ. ნივთ.)</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={pc_chemical}
                    onChange={(e) => setPc_chemical(e.target.value)}
                    placeholder="მაგ: Cypermethrin 10%"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">დოზირება</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={pc_dose}
                    onChange={(e) => setPc_dose(e.target.value)}
                    placeholder="მაგ: 50 მლ/10ლ"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">ექსპოზიციის დრო</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={pc_exposure}
                    onChange={(e) => setPc_exposure(e.target.value)}
                    placeholder="მაგ: 2 საათი"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">დამუშავებული ტერიტ./სათავსო *</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={pc_area}
                    onChange={(e) => setPc_area(e.target.value)}
                    placeholder="მაგ: საწყობი, სამზარეულო..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">მონიტ. შედეგი</label>
                  <select className={inputClass} value={pc_result} onChange={(e) => setPc_result(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    <option>ეფექტური</option>
                    <option>ნაწილობრივ ეფექტური</option>
                    <option>არაეფექტური</option>
                    <option>გამოვლენა არ მომხდარა</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">შენიშვნა</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={pc_notes}
                    onChange={(e) => setPc_notes(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">შემსრულებელი</label>
                  <select className={inputClass} value={pc_executor} onChange={(e) => setPc_executor(e.target.value)}>
                    <option value="">— მიმდინარე მომხ. —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">კონტროლი (ხელმოწ.)</label>
                  <select
                    className={inputClass}
                    value={pc_controller}
                    onChange={(e) => setPc_controller(e.target.value)}
                  >
                    <option value="">— აირჩიეთ —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {pc_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}

              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={pc_submitting || !pc_procedure || !pc_date || !pc_area}
                  onClick={async () => {
                    setPc_submitting(true)
                    setPc_success(false)
                    try {
                      const body = {
                        type: 'PEST_CONTROL',
                        recordedAt: new Date(pc_date + 'T12:00:00').toISOString(),
                        data: {
                          procedure: pc_procedure,
                          pest: pc_pest,
                          chemical: pc_chemical,
                          dose: pc_dose,
                          exposureTime: pc_exposure,
                          area: pc_area,
                          result: pc_result,
                          executedBy: pc_executor || undefined,
                          controller: pc_controller || undefined,
                          notes: pc_notes || undefined,
                        },
                      }
                      const res = pc_editing
                        ? await fetch(`/api/haccp/journals/${pc_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}))
                        alert(err?.error?.message || 'შენახვა ვერ მოხერხდა')
                        return
                      }
                      setPc_procedure('')
                      setPc_pest('')
                      setPc_chemical('')
                      setPc_dose('')
                      setPc_exposure('')
                      setPc_area('')
                      setPc_result('')
                      setPc_executor('')
                      setPc_controller('')
                      setPc_notes('')
                      setPc_editing(null)
                      setPc_success(true)
                      await load(tab)
                      setTimeout(() => setPc_success(false), 3000)
                    } finally {
                      setPc_submitting(false)
                    }
                  }}
                >
                  {pc_submitting ? 'ინახება...' : pc_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {pc_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setPc_editing(null)
                      setPc_procedure('')
                      setPc_pest('')
                      setPc_chemical('')
                      setPc_dose('')
                      setPc_exposure('')
                      setPc_area('')
                      setPc_result('')
                      setPc_executor('')
                      setPc_controller('')
                      setPc_notes('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">პროცედ.</th>
                      <th className="p-3">მავნებელი</th>
                      <th className="p-3">ტერიტ.</th>
                      <th className="p-3">შედეგი</th>
                      <th className="p-3">შემსრ.</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3 whitespace-nowrap">
                            {mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}
                          </td>
                          <td className="p-3">{String(d.procedure || '—')}</td>
                          <td className="p-3">{String(d.pest || '—')}</td>
                          <td className="p-3">{String(d.area || '—')}</td>
                          <td className="p-3">{String(d.result || '—')}</td>
                          <td className="p-3">{r.user?.name || r.user?.email || '—'}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const recDate = new Date(r.recordedAt)
                                  setPc_editing(r.id)
                                  setPc_date(
                                    `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
                                  )
                                  setPc_procedure(String(d.procedure || ''))
                                  setPc_pest(String(d.pest || ''))
                                  setPc_chemical(String(d.chemical || ''))
                                  setPc_dose(String(d.dose || ''))
                                  setPc_exposure(String(d.exposureTime || ''))
                                  setPc_area(String(d.area || ''))
                                  setPc_result(String(d.result || ''))
                                  setPc_executor(String(d.executedBy || ''))
                                  setPc_controller(String(d.controller || ''))
                                  setPc_notes(String(d.notes || ''))
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && (
                  <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}{tab === 'WASTE_MANAGEMENT' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">ნარჩ.-01</p>
                <h2 className="font-semibold">
                  {wm_editing ? '✏️ ჩანაწერის რედაქტირება' : 'ნარჩენების მართვის ჟურნალი'}
                </h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={wm_date}
                    onChange={(e) => setWm_date(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">ნარჩენის სახე *</label>
                  <select className={inputClass} value={wm_type} onChange={(e) => setWm_type(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    <option>ორგანული ნარჩენი (ლუდის ნარჩ.)</option>
                    <option>სველი მარცვალი (დრაბი)</option>
                    <option>CO₂ ნარჩენი</option>
                    <option>შეფუთვის მასალა (მუყაო, პლასტმასი)</option>
                    <option>მინის ნარჩენი</option>
                    <option>ქიმიური ნარჩენი</option>
                    <option>სახიფათო ნარჩენი</option>
                    <option>სხვა</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">მართვის წესი *</label>
                  <select className={inputClass} value={wm_method} onChange={(e) => setWm_method(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    <option>გატანა სპეც. კომპანიით</option>
                    <option>კომპოსტირება</option>
                    <option>გადამუშავება</option>
                    <option>ადგ. შეგროვება</option>
                    <option>სხვა</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">კონტრაქტი №</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={wm_contract}
                    onChange={(e) => setWm_contract(e.target.value)}
                    placeholder="კონტრაქტის ნომერი"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">
                    შედგენილია (შემსრულებელი)
                  </label>
                  <select className={inputClass} value={wm_executor} onChange={(e) => setWm_executor(e.target.value)}>
                    <option value="">— მიმდინარე მომხ. —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">
                    დამტკიცებულია (მენეჯერი)
                  </label>
                  <select className={inputClass} value={wm_approver} onChange={(e) => setWm_approver(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">შენიშვნა</label>
                <input
                  type="text"
                  className={inputClass}
                  value={wm_notes}
                  onChange={(e) => setWm_notes(e.target.value)}
                />
              </div>

              {wm_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}

              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={wm_submitting || !wm_type || !wm_method || !wm_date}
                  onClick={async () => {
                    setWm_submitting(true)
                    setWm_success(false)
                    try {
                      const body = {
                        type: 'WASTE_MANAGEMENT',
                        recordedAt: new Date(wm_date + 'T12:00:00').toISOString(),
                        data: {
                          wasteType: wm_type,
                          managementMethod: wm_method,
                          contractNo: wm_contract || undefined,
                          executedBy: wm_executor || undefined,
                          approvedBy: wm_approver || undefined,
                          notes: wm_notes || undefined,
                        },
                      }
                      const res = wm_editing
                        ? await fetch(`/api/haccp/journals/${wm_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}))
                        alert(err?.error?.message || 'შენახვა ვერ მოხერხდა')
                        return
                      }
                      setWm_type('')
                      setWm_method('')
                      setWm_contract('')
                      setWm_executor('')
                      setWm_approver('')
                      setWm_notes('')
                      setWm_editing(null)
                      setWm_success(true)
                      await load(tab)
                      setTimeout(() => setWm_success(false), 3000)
                    } finally {
                      setWm_submitting(false)
                    }
                  }}
                >
                  {wm_submitting ? 'ინახება...' : wm_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {wm_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setWm_editing(null)
                      setWm_type('')
                      setWm_method('')
                      setWm_contract('')
                      setWm_executor('')
                      setWm_approver('')
                      setWm_notes('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">ნარჩ. სახე</th>
                      <th className="p-3">მართვის წ.</th>
                      <th className="p-3">კონტრ. №</th>
                      <th className="p-3">შემსრ.</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3 whitespace-nowrap">
                            {mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}
                          </td>
                          <td className="p-3">{String(d.wasteType || '—')}</td>
                          <td className="p-3">{String(d.managementMethod || '—')}</td>
                          <td className="p-3">{String(d.contractNo || '—')}</td>
                          <td className="p-3">{r.user?.name || r.user?.email || '—'}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const recDate = new Date(r.recordedAt)
                                  setWm_editing(r.id)
                                  setWm_date(
                                    `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
                                  )
                                  setWm_type(String(d.wasteType || ''))
                                  setWm_method(String(d.managementMethod || ''))
                                  setWm_contract(String(d.contractNo || ''))
                                  setWm_executor(String(d.executedBy || ''))
                                  setWm_approver(String(d.approvedBy || ''))
                                  setWm_notes(String(d.notes || ''))
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && (
                  <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}{tab === 'TEMPERATURE' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">ტემპ.-01</p>
                <h2 className="font-semibold">
                  {tmp_editing ? '✏️ ჩანაწერის რედაქტირება' : 'ტემპ./ტენ. კონტროლის ჟურნალი'}
                </h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={tmp_date}
                    onChange={(e) => setTmp_date(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">დრო</label>
                  <input
                    type="time"
                    className={inputClass}
                    value={tmp_time}
                    onChange={(e) => setTmp_time(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-text-muted mb-1">ზონა/განყოფილება *</label>
                  <select className={inputClass} value={tmp_zone} onChange={(e) => setTmp_zone(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    <option>ლუდსახარშის </option>
                    <option>საფერმენტაციო ოთახი</option>
                    <option>კონდიციონირების ოთახი</option>
                    <option>სამზარეულო</option>
                    <option>საწყობი (მშრალი)</option>
                    <option>საწყობი (გამაცივებელი)</option>
                    <option>შეფუთვის ზონა</option>
                    <option>ლაბორატორია</option>
                    <option>სხვა</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">
                    ტემპერატურა °C
                    <span className="text-text-muted ml-1">(ნორმა ზონის მიხედვ.)</span>
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    value={tmp_temp}
                    onChange={(e) => setTmp_temp(e.target.value)}
                    placeholder="0.0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">
                    ტენიანობა %
                    <span className="text-text-muted ml-1">(ნორმა: 40–65%)</span>
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    value={tmp_humidity}
                    onChange={(e) => setTmp_humidity(e.target.value)}
                    placeholder="0"
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">შემსრულებელი</label>
                  <select className={inputClass} value={tmp_executor} onChange={(e) => setTmp_executor(e.target.value)}>
                    <option value="">— მიმდინარე მომხ. —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">შენიშვნა</label>
                <input
                  type="text"
                  className={inputClass}
                  value={tmp_notes}
                  onChange={(e) => setTmp_notes(e.target.value)}
                  placeholder="გადახრის მიზეზი ან სხვა ინფო..."
                />
              </div>

              {tmp_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}

              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={tmp_submitting || !tmp_zone || !tmp_date}
                  onClick={async () => {
                    setTmp_submitting(true)
                    setTmp_success(false)
                    try {
                      const recordedAt = new Date(`${tmp_date}T${tmp_time || '12:00'}:00`)
                      const body = {
                        type: 'TEMPERATURE',
                        recordedAt: recordedAt.toISOString(),
                        data: {
                          area: tmp_zone,
                          temperature: tmp_temp ? Number(tmp_temp) : null,
                          humidity: tmp_humidity ? Number(tmp_humidity) : null,
                          executedBy: tmp_executor || undefined,
                          notes: tmp_notes || undefined,
                        },
                      }
                      const res = tmp_editing
                        ? await fetch(`/api/haccp/journals/${tmp_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}))
                        alert(err?.error?.message || 'შენახვა ვერ მოხერხდა')
                        return
                      }
                      setTmp_zone('')
                      setTmp_temp('')
                      setTmp_humidity('')
                      setTmp_executor('')
                      setTmp_notes('')
                      setTmp_editing(null)
                      setTmp_success(true)
                      await load(tab)
                      setTimeout(() => setTmp_success(false), 3000)
                    } finally {
                      setTmp_submitting(false)
                    }
                  }}
                >
                  {tmp_submitting ? 'ინახება...' : tmp_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {tmp_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setTmp_editing(null)
                      setTmp_zone('')
                      setTmp_temp('')
                      setTmp_humidity('')
                      setTmp_executor('')
                      setTmp_notes('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი/დრო</th>
                      <th className="p-3">ზონა</th>
                      <th className="p-3">ტემპ. °C</th>
                      <th className="p-3">ტენ. %</th>
                      <th className="p-3">შემსრ.</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows
                      .filter((r) => (r.data as Record<string, unknown>).source !== 'auto')
                      .map((r) => {
                      const d = r.data as Record<string, unknown>
                      const temp = d.temperature != null ? Number(d.temperature) : null
                      const hum = d.humidity != null ? Number(d.humidity) : null
                      const zone = String(d.area || '')
                      const getTempNorm = (z: string): [number, number] => {
                        if (z.includes('საფერმენტ')) return [18, 24]
                        if (z.includes('კონდიც')) return [0, 4]
                        if (z.includes('საწყობი (გამაც')) return [2, 6]
                        if (z.includes('საწყობი (მშრ')) return [10, 20]
                        if (z.includes('ლაბ')) return [18, 25]
                        return [16, 22] // default
                      }
                      const [tMin, tMax] = getTempNorm(zone)
                      const tempOk = temp === null || (temp >= tMin && temp <= tMax)
                      const humOk = hum === null || (hum >= 40 && hum <= 65)
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3 whitespace-nowrap">
                            {mounted ? new Date(r.recordedAt).toLocaleString('ka-GE') : ''}
                          </td>
                          <td className="p-3">{String(d.area || '—')}</td>
                          <td className={`p-3 font-medium ${!tempOk ? 'text-red-400' : 'text-emerald-400'}`}>
                            {temp != null ? (
                              <span title={`ნორმა: ${tMin}–${tMax}°C`}>
                                {temp}°C {!tempOk ? '⚠️' : '✓'}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className={`p-3 font-medium ${!humOk ? 'text-red-400' : 'text-emerald-400'}`}>
                            {hum != null ? `${hum}%` : '—'}
                          </td>
                          <td className="p-3">{r.user?.name || r.user?.email || '—'}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const recDate = new Date(r.recordedAt)
                                  setTmp_editing(r.id)
                                  setTmp_date(
                                    `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
                                  )
                                  setTmp_time(
                                    `${String(recDate.getHours()).padStart(2, '0')}:${String(recDate.getMinutes()).padStart(2, '0')}`
                                  )
                                  setTmp_zone(String(d.area || ''))
                                  setTmp_temp(d.temperature != null ? String(d.temperature) : '')
                                  setTmp_humidity(d.humidity != null ? String(d.humidity) : '')
                                  setTmp_executor(String(d.executedBy || ''))
                                  setTmp_notes(String(d.notes || ''))
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.filter((r) => (r.data as Record<string, unknown>).source !== 'auto')
                  .length === 0 && (
                  <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">ავტომატური</p>
                <h3 className="font-semibold text-sm">ავზების ტემპ. (სიმკვრივის გაზომვიდან)</h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი/დრო</th>
                      <th className="p-3">ავზი</th>
                      <th className="p-3">ტემპ. °C</th>
                      <th className="p-3">სიმკვრ. SG</th>
                      <th className="p-3">პარტია</th>
                      <th className="p-3">შემსრ.</th>
                      <th className="p-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows
                      .filter((r) => {
                        const d = r.data as Record<string, unknown>
                        return (d.source === 'auto' || d.source === 'backfill') && d.batchId
                      })
                      .map((r) => {
                        const d = r.data as Record<string, unknown>
                        const temp = d.temperature != null ? Number(d.temperature) : null
                        return (
                          <tr key={r.id} className="border-b border-border/60">
                            <td className="p-3 whitespace-nowrap">
                              {mounted ? new Date(r.recordedAt).toLocaleString('ka-GE') : ''}
                            </td>
                            <td className="p-3 font-medium">{String(d.tankName || d.area || '—')}</td>
                            <td className="p-3">
                              <span
                                className={
                                  temp !== null && temp > 25
                                    ? 'text-red-400 font-medium'
                                    : 'text-emerald-400 font-medium'
                                }
                              >
                                {temp !== null ? `${temp}°C` : '—'}
                              </span>
                            </td>
                            <td className="p-3">{d.gravity ? String(d.gravity) : '—'}</td>
                            <td className="p-3">{String(d.batchNumber || '—')}</td>
                            <td className="p-3">{r.user?.name || r.user?.email || '—'}</td>
                            <td className="p-3">
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    {rows.filter((r) => {
                      const d = r.data as Record<string, unknown>
                      return (d.source === 'auto' || d.source === 'backfill') && d.batchId
                    }).length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-4 text-text-muted text-sm text-center">
                          ავზების ჩანაწერები არ არის — სიმკვრივის გაზომვისას ავტომატ. დაემატება
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}{tab === 'KEG_WASHING' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">კეგ-CIP</p>
                <h2 className="font-semibold">
                  {kw_editing ? '✏️ ჩანაწერის რედაქტირება' : 'კეგის რეცხვის ჟურნალი'}
                </h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-xs text-text-muted">
                ✅ ავტომატური ჩანაწერი იქმნება კეგის დაბრუნებისას &quot;გასარეცხი&quot; სტატუსით. ხელით შეავსეთ თუ ჩანაწერი ავტომატ. ვერ
                დაფიქსირდა.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={kw_date}
                    onChange={(e) => setKw_date(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">კეგი №</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={kw_kegNumber}
                    onChange={(e) => setKw_kegNumber(e.target.value)}
                    placeholder="მაგ: KEG-30-251857-002"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">ზომა (L)</label>
                  <select className={inputClass} value={kw_size} onChange={(e) => setKw_size(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    <option value="20">20L</option>
                    <option value="30">30L</option>
                    <option value="50">50L</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">სარეცხი საშუალება</label>
                  <select className={inputClass} value={kw_chemical} onChange={(e) => setKw_chemical(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    <option>NaOH (ტუტე)</option>
                    <option>HNO3 (მჟავა)</option>
                    <option>Peracetic Acid</option>
                    <option>ცხელი წყალი</option>
                    <option>ორთქლი</option>
                    <option>სხვა</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">კონც. %</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={kw_concentration}
                    onChange={(e) => setKw_concentration(e.target.value)}
                    placeholder="0.0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">ტემპ. °C</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={kw_temp}
                    onChange={(e) => setKw_temp(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">ხანგრძლ. (წთ)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={kw_duration}
                    onChange={(e) => setKw_duration(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">შედეგი</label>
                  <select className={inputClass} value={kw_result} onChange={(e) => setKw_result(e.target.value)}>
                    <option value="კარგი">✅ კარგი</option>
                    <option value="გასამეორებელი">⚠️ გასამეორებელი</option>
                    <option value="ვერ გარეცხა">❌ ვერ გარეცხა</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">შემსრულებელი</label>
                  <select className={inputClass} value={kw_executor} onChange={(e) => setKw_executor(e.target.value)}>
                    <option value="">— მიმდინარე მომხ. —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">შენიშვნა</label>
                <input type="text" className={inputClass} value={kw_notes} onChange={(e) => setKw_notes(e.target.value)} />
              </div>

              {kw_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}

              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={kw_submitting || !kw_date}
                  onClick={async () => {
                    setKw_submitting(true)
                    setKw_success(false)
                    try {
                      const body = {
                        type: 'KEG_WASHING',
                        recordedAt: new Date(kw_date + 'T12:00:00').toISOString(),
                        data: {
                          kegNumber: kw_kegNumber || undefined,
                          size: kw_size ? Number(kw_size) : undefined,
                          chemical: kw_chemical || undefined,
                          concentration: kw_concentration || undefined,
                          temp: kw_temp ? Number(kw_temp) : undefined,
                          duration: kw_duration ? Number(kw_duration) : undefined,
                          result: kw_result,
                          executedBy: kw_executor || undefined,
                          notes: kw_notes || undefined,
                          source: 'manual',
                        },
                      }
                      const res = kw_editing
                        ? await fetch(`/api/haccp/journals/${kw_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}))
                        alert(err?.error?.message || 'შენახვა ვერ მოხერხდა')
                        return
                      }
                      setKw_kegNumber('')
                      setKw_size('')
                      setKw_chemical('')
                      setKw_concentration('')
                      setKw_temp('')
                      setKw_duration('')
                      setKw_result('კარგი')
                      setKw_executor('')
                      setKw_notes('')
                      setKw_editing(null)
                      setKw_success(true)
                      await load(tab)
                      setTimeout(() => setKw_success(false), 3000)
                    } finally {
                      setKw_submitting(false)
                    }
                  }}
                >
                  {kw_submitting ? 'ინახება...' : kw_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {kw_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setKw_editing(null)
                      setKw_kegNumber('')
                      setKw_size('')
                      setKw_chemical('')
                      setKw_concentration('')
                      setKw_temp('')
                      setKw_duration('')
                      setKw_result('კარგი')
                      setKw_executor('')
                      setKw_notes('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">კეგი №</th>
                      <th className="p-3">ზომა</th>
                      <th className="p-3">მდგ.</th>
                      <th className="p-3">შედ.</th>
                      <th className="p-3">წყარო</th>
                      <th className="p-3">შემსრ.</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      const isAuto = d.source === 'auto'
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3 whitespace-nowrap">
                            {mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}
                          </td>
                          <td className="p-3 font-mono text-xs">{String(d.kegNumber || '—')}</td>
                          <td className="p-3">{d.size ? `${d.size}L` : '—'}</td>
                          <td className="p-3">{String(d.conditionLabel || d.condition || '—')}</td>
                          <td className="p-3">{String(d.result || '—')}</td>
                          <td className="p-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                isAuto ? 'bg-emerald-900/30 text-emerald-400' : 'bg-bg-tertiary text-text-muted'
                              }`}
                            >
                              {isAuto ? 'ავტო' : 'ხელით'}
                            </span>
                          </td>
                          <td className="p-3">{r.user?.name || r.user?.email || '—'}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const recDate = new Date(r.recordedAt)
                                  setKw_editing(r.id)
                                  setKw_date(
                                    `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
                                  )
                                  setKw_kegNumber(String(d.kegNumber || ''))
                                  setKw_size(String(d.size || ''))
                                  setKw_chemical(String(d.chemical || ''))
                                  setKw_concentration(String(d.concentration || ''))
                                  setKw_temp(String(d.temp || ''))
                                  setKw_duration(String(d.duration || ''))
                                  setKw_result(String(d.result || 'კარგი'))
                                  setKw_executor(String(d.executedBy || ''))
                                  setKw_notes(String(d.notes || ''))
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && (
                  <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}{tab === 'FILLING' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">ჩამოსხმა-01</p>
                <h2 className="font-semibold">
                  {fl_editing ? '✏️ ჩანაწერის რედაქტირება' : 'ჩამოსხმის ჟურნალი'}
                </h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-xs text-text-muted">
                ✅ ავტომატური ჩანაწერი იქმნება შეფუთვის დასრულებისას. ხელით შეავსეთ თუ ჩანაწერი ავტომატ. ვერ დაფიქსირდა.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input type="date" className={inputClass} value={fl_date} onChange={(e) => setFl_date(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">პარტია №</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={fl_batchNumber}
                    onChange={(e) => setFl_batchNumber(e.target.value)}
                    placeholder="მაგ: BRW-2026-0001"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">შეფუთვის ტიპი *</label>
                  <select
                    className={inputClass}
                    value={fl_packageType}
                    onChange={(e) => setFl_packageType(e.target.value)}
                  >
                    <option value="">— აირჩიეთ —</option>
                    <option value="KEG_20">კეგი 20L</option>
                    <option value="KEG_30">კეგი 30L</option>
                    <option value="KEG_50">კეგი 50L</option>
                    <option value="BOTTLE_500">ბოთლი 500ml</option>
                    <option value="BOTTLE_330">ბოთლი 330ml</option>
                    <option value="CAN_330">ქილა 330ml</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">რაოდენობა</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={fl_quantity}
                    onChange={(e) => setFl_quantity(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">მოცულობა (L)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={fl_volume}
                    onChange={(e) => setFl_volume(e.target.value)}
                    placeholder="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">შემსრულებელი</label>
                  <select className={inputClass} value={fl_executor} onChange={(e) => setFl_executor(e.target.value)}>
                    <option value="">— მიმდინარე მომხ. —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">შენიშვნა</label>
                <input type="text" className={inputClass} value={fl_notes} onChange={(e) => setFl_notes(e.target.value)} />
              </div>

              {fl_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}

              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={fl_submitting || !fl_date || !fl_packageType}
                  onClick={async () => {
                    setFl_submitting(true)
                    setFl_success(false)
                    try {
                      const body = {
                        type: 'FILLING',
                        recordedAt: new Date(fl_date + 'T12:00:00').toISOString(),
                        data: {
                          batchNumber: fl_batchNumber || undefined,
                          packageType: fl_packageType,
                          quantity: fl_quantity ? Number(fl_quantity) : undefined,
                          volumeTotal: fl_volume || undefined,
                          performedBy: fl_executor || undefined,
                          notes: fl_notes || undefined,
                          source: 'manual',
                        },
                      }
                      const res = fl_editing
                        ? await fetch(`/api/haccp/journals/${fl_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}))
                        alert(err?.error?.message || 'შენახვა ვერ მოხერხდა')
                        return
                      }
                      setFl_batchNumber('')
                      setFl_packageType('')
                      setFl_quantity('')
                      setFl_volume('')
                      setFl_executor('')
                      setFl_notes('')
                      setFl_editing(null)
                      setFl_success(true)
                      await load(tab)
                      setTimeout(() => setFl_success(false), 3000)
                    } finally {
                      setFl_submitting(false)
                    }
                  }}
                >
                  {fl_submitting ? 'ინახება...' : fl_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {fl_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setFl_editing(null)
                      setFl_batchNumber('')
                      setFl_packageType('')
                      setFl_quantity('')
                      setFl_volume('')
                      setFl_executor('')
                      setFl_notes('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">პარტია</th>
                      <th className="p-3">ტიპი</th>
                      <th className="p-3">რაოდ.</th>
                      <th className="p-3">მოც. L</th>
                      <th className="p-3">წყარო</th>
                      <th className="p-3">შემსრ.</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      const isAuto = d.source === 'auto'
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3 whitespace-nowrap">
                            {mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}
                          </td>
                          <td className="p-3">{String(d.batchNumber || '—')}</td>
                          <td className="p-3">{String(d.packageType || '—')}</td>
                          <td className="p-3">{d.quantity ? String(d.quantity) : '—'}</td>
                          <td className="p-3">{d.volumeTotal ? `${d.volumeTotal}L` : '—'}</td>
                          <td className="p-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                isAuto ? 'bg-emerald-900/30 text-emerald-400' : 'bg-bg-tertiary text-text-muted'
                              }`}
                            >
                              {isAuto ? 'ავტო' : 'ხელით'}
                            </span>
                          </td>
                          <td className="p-3">{r.user?.name || r.user?.email || '—'}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const recDate = new Date(r.recordedAt)
                                  setFl_editing(r.id)
                                  setFl_date(
                                    `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
                                  )
                                  setFl_batchNumber(String(d.batchNumber || ''))
                                  setFl_packageType(String(d.packageType || ''))
                                  setFl_quantity(String(d.quantity || ''))
                                  setFl_volume(String(d.volumeTotal || ''))
                                  setFl_executor(String(d.performedBy || ''))
                                  setFl_notes(String(d.notes || ''))
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && (
                  <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}{tab === 'SUPPLIER' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between w-full">
                <div>
                  <p className="text-xs text-copper-light font-semibold">RS-08.1</p>
                  <h2 className="font-semibold">მომწოდებლების ნუსხა</h2>
                </div>
                <div className="flex gap-2">
                  <a
                    href="/api/haccp/suppliers/pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-copper hover:text-copper-light"
                  >
                    📄 PDF
                  </a>
                  <Link
                    href="/haccp/suppliers"
                    className="text-sm font-medium text-text-muted hover:text-text-primary"
                  >
                    + მომწოდებელი
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {suppliersLoading ? (
                <p className="text-text-muted text-sm">იტვირთება...</p>
              ) : (
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                        <th className="p-3">№</th>
                        <th className="p-3">სახელი</th>
                        <th className="p-3">საკ. პირი</th>
                        <th className="p-3">ტელეფონი</th>
                        <th className="p-3">ელ.ფოსტა</th>
                        <th className="p-3">პროდუქტი</th>
                        <th className="p-3">მოქმედება</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierRows.map((s, i) => (
                        <tr key={s.id} className="border-b border-border/60">
                          <td className="p-3 text-text-muted">{i + 1}</td>
                          <td className="p-3 font-medium">{s.name}</td>
                          <td className="p-3">{s.contactPerson || '—'}</td>
                          <td className="p-3">{s.phone || '—'}</td>
                          <td className="p-3">{s.email || '—'}</td>
                          <td className="p-3">{(s.products || []).join(', ') || '—'}</td>
                          <td className="p-3">
                            <Link
                              href="/haccp/suppliers"
                              className="text-xs text-copper hover:text-copper-light"
                            >
                              რედაქტირება →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {supplierRows.length === 0 && (
                    <p className="p-4 text-text-muted text-sm">
                      მომწოდებლები არ არის.{' '}
                      <Link href="/haccp/suppliers" className="text-copper underline">
                        დაამატეთ →
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}{tab === 'INCIDENT' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">RS-07.1</p>
                <h2 className="font-semibold">{inc_editing ? '✏️ რედაქტირება' : 'ინციდენტების ჟურნალი'}</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input type="date" className={inputClass} value={inc_date} onChange={(e) => setInc_date(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">შემსრულებელი</label>
                  <select className={inputClass} value={inc_executor} onChange={(e) => setInc_executor(e.target.value)}>
                    <option value="">— მიმდინარე მომხ. —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">ინციდენტის დეტალური აღწერა *</label>
                <textarea
                  className={`${inputClass} h-24 resize-none`}
                  value={inc_description}
                  onChange={(e) => setInc_description(e.target.value)}
                  placeholder="რა მოხდა, სად, როდის..."
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">განხორციელებული ქმედება</label>
                <textarea
                  className={`${inputClass} h-16 resize-none`}
                  value={inc_action}
                  onChange={(e) => setInc_action(e.target.value)}
                  placeholder="რა ღონისძიება გატარდა..."
                />
              </div>
              {inc_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={inc_submitting || !inc_description || !inc_date}
                  onClick={async () => {
                    setInc_submitting(true)
                    setInc_success(false)
                    try {
                      const body = {
                        type: 'INCIDENT',
                        recordedAt: new Date(inc_date + 'T12:00:00').toISOString(),
                        data: {
                          description: inc_description,
                          action: inc_action,
                          executedBy: inc_executor || undefined,
                        },
                      }
                      const res = inc_editing
                        ? await fetch(`/api/haccp/journals/${inc_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        alert('შენახვა ვერ მოხერხდა')
                        return
                      }
                      setInc_description('')
                      setInc_action('')
                      setInc_executor('')
                      setInc_editing(null)
                      setInc_success(true)
                      await load(tab)
                      setTimeout(() => setInc_success(false), 3000)
                    } finally {
                      setInc_submitting(false)
                    }
                  }}
                >
                  {inc_submitting ? 'ინახება...' : inc_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {inc_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setInc_editing(null)
                      setInc_description('')
                      setInc_action('')
                      setInc_executor('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">აღწერა</th>
                      <th className="p-3">ქმედება</th>
                      <th className="p-3">შემსრ.</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3 whitespace-nowrap">
                            {mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}
                          </td>
                          <td className="p-3 max-w-xs truncate">{String(d.description || '—')}</td>
                          <td className="p-3 max-w-xs truncate">{String(d.action || '—')}</td>
                          <td className="p-3">{r.user?.name || r.user?.email || '—'}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const recDate = new Date(r.recordedAt)
                                  setInc_editing(r.id)
                                  setInc_date(
                                    `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
                                  )
                                  setInc_description(String(d.description || ''))
                                  setInc_action(String(d.action || ''))
                                  setInc_executor(String(d.executedBy || ''))
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>}
              </div>
            </CardBody>
          </Card>
        </div>
      )}{tab === 'HEALTH_CHECK' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">RS-11.1</p>
                <h2 className="font-semibold">{hc_editing ? '✏️ რედაქტირება' : 'პერსონალის ჯანმრთელობა'}</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input type="date" className={inputClass} value={hc_date} onChange={(e) => setHc_date(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">პერსონალი *</label>
                  <select className={inputClass} value={hc_name} onChange={(e) => setHc_name(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">ჯანმრთელობის მდგ.</label>
                  <select className={inputClass} value={hc_status} onChange={(e) => setHc_status(e.target.value)}>
                    <option value="ჯანმრთელი">✅ ჯანმრთელი</option>
                    <option value="ავად">🤒 ავად</option>
                    <option value="სიმპტომი">⚠️ სიმპტომი</option>
                  </select>
                </div>
              </div>
              {hc_status !== 'ჯანმრთელი' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">სიმპტომი/დიაგნოზი</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={hc_symptom}
                      onChange={(e) => setHc_symptom(e.target.value)}
                      placeholder="რა სიმპტომი..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">განხ. ქმედება</label>
                    <select className={inputClass} value={hc_action} onChange={(e) => setHc_action(e.target.value)}>
                      <option value="">— აირჩიეთ —</option>
                      <option value="სამუშაოდ დაბრუნება შეზღუდულია">სამუშაოდ დაბრუნება შეზღუდულია</option>
                      <option value="სამედიცინო დახმარება">სამედიცინო დახმარება</option>
                      <option value="შვებულება">შვებულება</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">სამ. ადგ. დაბ. თარიღი</label>
                    <input type="date" className={inputClass} value={hc_returnDate} onChange={(e) => setHc_returnDate(e.target.value)} />
                  </div>
                </div>
              )}
              {hc_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={hc_submitting || !hc_name || !hc_date}
                  onClick={async () => {
                    setHc_submitting(true)
                    setHc_success(false)
                    try {
                      const body = {
                        type: 'HEALTH_CHECK',
                        recordedAt: new Date(hc_date + 'T12:00:00').toISOString(),
                        data: {
                          name: hc_name,
                          status: hc_status,
                          symptom: hc_symptom || undefined,
                          action: hc_action || undefined,
                          returnDate: hc_returnDate || undefined,
                        },
                      }
                      const res = hc_editing
                        ? await fetch(`/api/haccp/journals/${hc_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        alert('შენახვა ვერ მოხერხდა')
                        return
                      }
                      setHc_name('')
                      setHc_status('ჯანმრთელი')
                      setHc_symptom('')
                      setHc_action('')
                      setHc_returnDate('')
                      setHc_editing(null)
                      setHc_success(true)
                      await load(tab)
                      setTimeout(() => setHc_success(false), 3000)
                    } finally {
                      setHc_submitting(false)
                    }
                  }}
                >
                  {hc_submitting ? 'ინახება...' : hc_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {hc_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setHc_editing(null)
                      setHc_name('')
                      setHc_status('ჯანმრთელი')
                      setHc_symptom('')
                      setHc_action('')
                      setHc_returnDate('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">პერსონალი</th>
                      <th className="p-3">მდგ.</th>
                      <th className="p-3">სიმპტ.</th>
                      <th className="p-3">ქმედება</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3 whitespace-nowrap">
                            {mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}
                          </td>
                          <td className="p-3">{String(d.name || '—')}</td>
                          <td
                            className={`p-3 font-medium ${d.status !== 'ჯანმრთელი' ? 'text-red-400' : 'text-emerald-400'}`}
                          >
                            {String(d.status || '—')}
                          </td>
                          <td className="p-3">{String(d.symptom || '—')}</td>
                          <td className="p-3">{String(d.action || '—')}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const recDate = new Date(r.recordedAt)
                                  setHc_editing(r.id)
                                  setHc_date(
                                    `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
                                  )
                                  setHc_name(String(d.name || ''))
                                  setHc_status(String(d.status || 'ჯანმრთელი'))
                                  setHc_symptom(String(d.symptom || ''))
                                  setHc_action(String(d.action || ''))
                                  setHc_returnDate(String(d.returnDate || ''))
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>}
              </div>
            </CardBody>
          </Card>
        </div>

      )}{tab === 'THERMOMETER_CALIBRATION' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">RS-04.1</p>
                <h2 className="font-semibold">{tc_editing ? '✏️ რედაქტირება' : 'თერმომეტრის კალიბრაცია'}</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input type="date" className={inputClass} value={tc_date} onChange={(e) => setTc_date(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">თერმომეტრის სახელი *</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={tc_thermometer}
                    onChange={(e) => setTc_thermometer(e.target.value)}
                    placeholder="მაგ: ციფრული №1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">ეტალონის სახელი</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={tc_reference}
                    onChange={(e) => setTc_reference(e.target.value)}
                    placeholder="სარეფ. თერმომეტრი"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">სამ. გაზომვა °C</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={tc_measured}
                    onChange={(e) => {
                      setTc_measured(e.target.value)
                      setTc_difference(String((parseFloat(e.target.value) || 0) - (parseFloat(tc_actual) || 0)))
                    }}
                    step="0.1"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">ეტალ. ტემპ. °C</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={tc_actual}
                    onChange={(e) => {
                      setTc_actual(e.target.value)
                      setTc_difference(String((parseFloat(tc_measured) || 0) - (parseFloat(e.target.value) || 0)))
                    }}
                    step="0.1"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">სხვაობა °C</label>
                  <input
                    type="number"
                    className={`${inputClass} ${Math.abs(parseFloat(tc_difference) || 0) > 0.5 ? 'border-red-500' : ''}`}
                    value={tc_difference}
                    readOnly
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">შედეგი</label>
                  <select className={inputClass} value={tc_result} onChange={(e) => setTc_result(e.target.value)}>
                    <option value="გამართული">✅ გამართული</option>
                    <option value="გამოსაცვლელი">❌ გამოსაცვლელი</option>
                    <option value="კორექცია საჭირო">⚠️ კორექცია საჭირო</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">მაკორ. ქმედება</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={tc_action}
                    onChange={(e) => setTc_action(e.target.value)}
                    placeholder="რა გაკეთდა..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">შემსრულებელი</label>
                  <select className={inputClass} value={tc_executor} onChange={(e) => setTc_executor(e.target.value)}>
                    <option value="">— მიმდინარე მომხ. —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {tc_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={tc_submitting || !tc_thermometer || !tc_date}
                  onClick={async () => {
                    setTc_submitting(true)
                    setTc_success(false)
                    try {
                      const body = {
                        type: 'THERMOMETER_CALIBRATION',
                        recordedAt: new Date(tc_date + 'T12:00:00').toISOString(),
                        data: {
                          thermometer: tc_thermometer,
                          reference: tc_reference,
                          measured: tc_measured ? Number(tc_measured) : null,
                          actual: tc_actual ? Number(tc_actual) : null,
                          difference: tc_difference ? Number(tc_difference) : null,
                          result: tc_result,
                          action: tc_action || undefined,
                          executedBy: tc_executor || undefined,
                        },
                      }
                      const res = tc_editing
                        ? await fetch(`/api/haccp/journals/${tc_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        alert('შენახვა ვერ მოხერხდა')
                        return
                      }
                      setTc_thermometer('')
                      setTc_reference('')
                      setTc_measured('')
                      setTc_actual('')
                      setTc_difference('')
                      setTc_result('გამართული')
                      setTc_action('')
                      setTc_executor('')
                      setTc_editing(null)
                      setTc_success(true)
                      await load(tab)
                      setTimeout(() => setTc_success(false), 3000)
                    } finally {
                      setTc_submitting(false)
                    }
                  }}
                >
                  {tc_submitting ? 'ინახება...' : tc_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {tc_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setTc_editing(null)
                      setTc_thermometer('')
                      setTc_reference('')
                      setTc_measured('')
                      setTc_actual('')
                      setTc_difference('')
                      setTc_result('გამართული')
                      setTc_action('')
                      setTc_executor('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">თერმომ.</th>
                      <th className="p-3">სხვ. °C</th>
                      <th className="p-3">შედ.</th>
                      <th className="p-3">შემსრ.</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      const diff = d.difference != null ? Number(d.difference) : null
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3 whitespace-nowrap">
                            {mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}
                          </td>
                          <td className="p-3">{String(d.thermometer || '—')}</td>
                          <td
                            className={`p-3 font-medium ${diff !== null && Math.abs(diff) > 0.5 ? 'text-red-400' : 'text-emerald-400'}`}
                          >
                            {diff !== null ? `${diff > 0 ? '+' : ''}${diff}°C` : '—'}
                          </td>
                          <td className="p-3">{String(d.result || '—')}</td>
                          <td className="p-3">{r.user?.name || r.user?.email || '—'}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const recDate = new Date(r.recordedAt)
                                  setTc_editing(r.id)
                                  setTc_date(
                                    `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
                                  )
                                  setTc_thermometer(String(d.thermometer || ''))
                                  setTc_reference(String(d.reference || ''))
                                  setTc_measured(String(d.measured ?? ''))
                                  setTc_actual(String(d.actual ?? ''))
                                  setTc_difference(String(d.difference ?? ''))
                                  setTc_result(String(d.result || 'გამართული'))
                                  setTc_action(String(d.action || ''))
                                  setTc_executor(String(d.executedBy || ''))
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>}
              </div>
            </CardBody>
          </Card>
        </div>

      )}{tab === 'TRAINING' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">RS-06.1</p>
                <h2 className="font-semibold">{tr_editing ? '✏️ რედაქტირება' : 'პერსონალის ტრენინგი'}</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input type="date" className={inputClass} value={tr_date} onChange={(e) => setTr_date(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">სტუდენტი (სახ./გვ.) *</label>
                  <select className={inputClass} value={tr_trainee} onChange={(e) => setTr_trainee(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">ინსტრუქტაჟის თემატიკა *</label>
                  <select className={inputClass} value={tr_topic} onChange={(e) => setTr_topic(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    <option>HACCP სისტემა — ზოგადი</option>
                    <option>პირადი ჰიგიენა</option>
                    <option>რეცხვა-დეზინფექცია</option>
                    <option>მავნებლების კონტროლი</option>
                    <option>ნარჩენების მართვა</option>
                    <option>ქიმიური საშუ. უსაფრთხოება</option>
                    <option>სახანძრო უსაფრთხოება</option>
                    <option>CCP მონიტ. პროცედურები</option>
                    <option>სხვა</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">ტრენერი</label>
                  <select className={inputClass} value={tr_trainer} onChange={(e) => setTr_trainer(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {tr_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={tr_submitting || !tr_trainee || !tr_topic || !tr_date}
                  onClick={async () => {
                    setTr_submitting(true)
                    setTr_success(false)
                    try {
                      const body = {
                        type: 'TRAINING',
                        recordedAt: new Date(tr_date + 'T12:00:00').toISOString(),
                        data: {
                          trainee: tr_trainee,
                          topic: tr_topic,
                          trainer: tr_trainer || undefined,
                        },
                      }
                      const res = tr_editing
                        ? await fetch(`/api/haccp/journals/${tr_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        alert('შენახვა ვერ მოხერხდა')
                        return
                      }
                      setTr_trainee('')
                      setTr_topic('')
                      setTr_trainer('')
                      setTr_editing(null)
                      setTr_success(true)
                      await load(tab)
                      setTimeout(() => setTr_success(false), 3000)
                    } finally {
                      setTr_submitting(false)
                    }
                  }}
                >
                  {tr_submitting ? 'ინახება...' : tr_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {tr_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setTr_editing(null)
                      setTr_trainee('')
                      setTr_topic('')
                      setTr_trainer('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">სტუდენტი</th>
                      <th className="p-3">თემა</th>
                      <th className="p-3">ტრენერი</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3 whitespace-nowrap">
                            {mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}
                          </td>
                          <td className="p-3">{String(d.trainee || '—')}</td>
                          <td className="p-3">{String(d.topic || '—')}</td>
                          <td className="p-3">{String(d.trainer || '—')}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const recDate = new Date(r.recordedAt)
                                  setTr_editing(r.id)
                                  setTr_date(
                                    `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
                                  )
                                  setTr_trainee(String(d.trainee || ''))
                                  setTr_topic(String(d.topic || ''))
                                  setTr_trainer(String(d.trainer || ''))
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>}
              </div>
            </CardBody>
          </Card>
        </div>

      )}{tab === 'HYGIENE_VIOLATION' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">RS-09.1</p>
                <h2 className="font-semibold">{hv_editing ? '✏️ რედაქტირება' : 'ჰიგიენის წესების დარღვევა'}</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input type="date" className={inputClass} value={hv_date} onChange={(e) => setHv_date(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">პერსონალი *</label>
                  <select className={inputClass} value={hv_name} onChange={(e) => setHv_name(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">პასუხისმგებელი</label>
                  <select className={inputClass} value={hv_executor} onChange={(e) => setHv_executor(e.target.value)}>
                    <option value="">— მიმდინარე მომხ. —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">დარღვევის აღწერა *</label>
                <select className={inputClass} value={hv_violation} onChange={(e) => setHv_violation(e.target.value)}>
                  <option value="">— აირჩიეთ —</option>
                  <option>სამუშაო ტანსაცმელი არ ეცვა</option>
                  <option>ხელები არ დაუბანია</option>
                  <option>სამკაული/საათი ეკეთა</option>
                  <option>სამუშაო ადგილზე ჭამა/სმა</option>
                  <option>მობილური ტელეფონი სამუშ. ზონაში</option>
                  <option>სხვა</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">განხ. ქმედება</label>
                <input
                  type="text"
                  className={inputClass}
                  value={hv_action}
                  onChange={(e) => setHv_action(e.target.value)}
                  placeholder="რა გაკეთდა..."
                />
              </div>
              {hv_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={hv_submitting || !hv_name || !hv_violation || !hv_date}
                  onClick={async () => {
                    setHv_submitting(true)
                    setHv_success(false)
                    try {
                      const body = {
                        type: 'HYGIENE_VIOLATION',
                        recordedAt: new Date(hv_date + 'T12:00:00').toISOString(),
                        data: {
                          name: hv_name,
                          violation: hv_violation,
                          action: hv_action || undefined,
                          executedBy: hv_executor || undefined,
                        },
                      }
                      const res = hv_editing
                        ? await fetch(`/api/haccp/journals/${hv_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        alert('შენახვა ვერ მოხერხდა')
                        return
                      }
                      setHv_name('')
                      setHv_violation('')
                      setHv_action('')
                      setHv_executor('')
                      setHv_editing(null)
                      setHv_success(true)
                      await load(tab)
                      setTimeout(() => setHv_success(false), 3000)
                    } finally {
                      setHv_submitting(false)
                    }
                  }}
                >
                  {hv_submitting ? 'ინახება...' : hv_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {hv_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setHv_editing(null)
                      setHv_name('')
                      setHv_violation('')
                      setHv_action('')
                      setHv_executor('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">პერსონალი</th>
                      <th className="p-3">დარღვევა</th>
                      <th className="p-3">ქმედება</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3 whitespace-nowrap">
                            {mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}
                          </td>
                          <td className="p-3">{String(d.name || '—')}</td>
                          <td className="p-3 text-red-400">{String(d.violation || '—')}</td>
                          <td className="p-3">{String(d.action || '—')}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const recDate = new Date(r.recordedAt)
                                  setHv_editing(r.id)
                                  setHv_date(
                                    `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
                                  )
                                  setHv_name(String(d.name || ''))
                                  setHv_violation(String(d.violation || ''))
                                  setHv_action(String(d.action || ''))
                                  setHv_executor(String(d.executedBy || ''))
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>}
              </div>
            </CardBody>
          </Card>
        </div>

      )}{tab === 'CHEMICAL_LOG' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">RS-03.1</p>
                <h2 className="font-semibold">{cl_editing ? '✏️ რედაქტირება' : 'ქიმიკატების აღრიცხვა'}</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">გახსნის თარიღი *</label>
                  <input type="date" className={inputClass} value={cl_date} onChange={(e) => setCl_date(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">ქიმიკატის სახელი *</label>
                  <select className={inputClass} value={cl_chemical} onChange={(e) => setCl_chemical(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    <option>NaOH (ტუტე)</option>
                    <option>HNO3 (მჟავა)</option>
                    <option>Peracetic Acid</option>
                    <option>Caustic Soda</option>
                    <option>Chlorine</option>
                    <option>სხვა</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">ტარის მოცულობა (L)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={cl_volume}
                    onChange={(e) => setCl_volume(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">გახსნის თარიღი</label>
                  <input type="date" className={inputClass} value={cl_openedDate} onChange={(e) => setCl_openedDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">ვარგისიანობის ვადა</label>
                  <input type="date" className={inputClass} value={cl_expiryDate} onChange={(e) => setCl_expiryDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">შემსრულებელი</label>
                  <select className={inputClass} value={cl_executor} onChange={(e) => setCl_executor(e.target.value)}>
                    <option value="">— მიმდინარე მომხ. —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {cl_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={cl_submitting || !cl_chemical || !cl_date}
                  onClick={async () => {
                    setCl_submitting(true)
                    setCl_success(false)
                    try {
                      const body = {
                        type: 'CHEMICAL_LOG',
                        recordedAt: new Date(cl_date + 'T12:00:00').toISOString(),
                        data: {
                          chemical: cl_chemical,
                          volume: cl_volume ? Number(cl_volume) : undefined,
                          openedDate: cl_openedDate || undefined,
                          expiryDate: cl_expiryDate || undefined,
                          executedBy: cl_executor || undefined,
                        },
                      }
                      const res = cl_editing
                        ? await fetch(`/api/haccp/journals/${cl_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        alert('შენახვა ვერ მოხერხდა')
                        return
                      }
                      setCl_chemical('')
                      setCl_volume('')
                      setCl_openedDate('')
                      setCl_expiryDate('')
                      setCl_executor('')
                      setCl_editing(null)
                      setCl_success(true)
                      await load(tab)
                      setTimeout(() => setCl_success(false), 3000)
                    } finally {
                      setCl_submitting(false)
                    }
                  }}
                >
                  {cl_submitting ? 'ინახება...' : cl_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {cl_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setCl_editing(null)
                      setCl_chemical('')
                      setCl_volume('')
                      setCl_openedDate('')
                      setCl_expiryDate('')
                      setCl_executor('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">ქიმიკატი</th>
                      <th className="p-3">მოც. L</th>
                      <th className="p-3">ვარგ. ვადა</th>
                      <th className="p-3">შემსრ.</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      const expiry = d.expiryDate ? new Date(String(d.expiryDate)) : null
                      const expired = expiry && expiry < new Date()
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3 whitespace-nowrap">
                            {mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}
                          </td>
                          <td className="p-3 font-medium">{String(d.chemical || '—')}</td>
                          <td className="p-3">{d.volume ? `${d.volume}L` : '—'}</td>
                          <td className={`p-3 ${expired ? 'text-red-400 font-medium' : ''}`}>
                            {expiry ? expiry.toLocaleDateString('ka-GE') : '—'}
                            {expired ? ' ⚠️' : ''}
                          </td>
                          <td className="p-3">{r.user?.name || r.user?.email || '—'}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const recDate = new Date(r.recordedAt)
                                  setCl_editing(r.id)
                                  setCl_date(
                                    `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
                                  )
                                  setCl_chemical(String(d.chemical || ''))
                                  setCl_volume(String(d.volume ?? ''))
                                  setCl_openedDate(String(d.openedDate || ''))
                                  setCl_expiryDate(String(d.expiryDate || ''))
                                  setCl_executor(String(d.executedBy || ''))
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>}
              </div>
            </CardBody>
          </Card>
        </div>

      )}{tab === 'STORAGE_CONTROL' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">RS-15.1</p>
                <h2 className="font-semibold">{sc_editing ? '✏️ რედაქტირება' : 'საწყობის კონტროლი'}</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input type="date" className={inputClass} value={sc_date} onChange={(e) => setSc_date(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">დრო</label>
                  <input type="time" className={inputClass} value={sc_time} onChange={(e) => setSc_time(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">საწყობი/ზონა *</label>
                  <select className={inputClass} value={sc_storage} onChange={(e) => setSc_storage(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    <option>მშრალი საწყობი №1</option>
                    <option>მშრალი საწყობი №2</option>
                    <option>გამაცივებელი საწყობი</option>
                    <option>ნედლეულის საწყობი</option>
                    <option>მზა პროდუქტის საწყობი</option>
                    <option>ქიმიკატების სათავსო</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">შემსრულებელი</label>
                  <select className={inputClass} value={sc_executor} onChange={(e) => setSc_executor(e.target.value)}>
                    <option value="">— მიმდინარე მომხ. —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">
                    ტემპ. °C <span className="text-text-muted">(ნორმა: 10–20°C)</span>
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    value={sc_temp}
                    onChange={(e) => setSc_temp(e.target.value)}
                    placeholder="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">
                    ფარდ. ტენიანობა % <span className="text-text-muted">(ნორმა: 40–65%)</span>
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    value={sc_humidity}
                    onChange={(e) => setSc_humidity(e.target.value)}
                    placeholder="0"
                    min={0}
                    max={100}
                  />
                </div>
              </div>
              {sc_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={sc_submitting || !sc_storage || !sc_date}
                  onClick={async () => {
                    setSc_submitting(true)
                    setSc_success(false)
                    try {
                      const recordedAt = new Date(`${sc_date}T${sc_time || '09:00'}:00`)
                      const body = {
                        type: 'STORAGE_CONTROL',
                        recordedAt: recordedAt.toISOString(),
                        data: {
                          storage: sc_storage,
                          temperature: sc_temp ? Number(sc_temp) : null,
                          humidity: sc_humidity ? Number(sc_humidity) : null,
                          executedBy: sc_executor || undefined,
                        },
                      }
                      const res = sc_editing
                        ? await fetch(`/api/haccp/journals/${sc_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        alert('შენახვა ვერ მოხერხდა')
                        return
                      }
                      setSc_storage('')
                      setSc_temp('')
                      setSc_humidity('')
                      setSc_executor('')
                      setSc_editing(null)
                      setSc_success(true)
                      await load(tab)
                      setTimeout(() => setSc_success(false), 3000)
                    } finally {
                      setSc_submitting(false)
                    }
                  }}
                >
                  {sc_submitting ? 'ინახება...' : sc_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {sc_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setSc_editing(null)
                      setSc_storage('')
                      setSc_temp('')
                      setSc_humidity('')
                      setSc_executor('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი/დრო</th>
                      <th className="p-3">საწყობი</th>
                      <th className="p-3">ტემპ. °C</th>
                      <th className="p-3">ტენ. %</th>
                      <th className="p-3">შემსრ.</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      const temp = d.temperature != null ? Number(d.temperature) : null
                      const hum = d.humidity != null ? Number(d.humidity) : null
                      const tempOk = temp === null || (temp >= 10 && temp <= 20)
                      const humOk = hum === null || (hum >= 40 && hum <= 65)
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3 whitespace-nowrap">
                            {mounted ? new Date(r.recordedAt).toLocaleString('ka-GE') : ''}
                          </td>
                          <td className="p-3">{String(d.storage || '—')}</td>
                          <td className={`p-3 font-medium ${!tempOk ? 'text-red-400' : 'text-emerald-400'}`}>
                            {temp != null ? `${temp}°C ${!tempOk ? '⚠️' : '✓'}` : '—'}
                          </td>
                          <td className={`p-3 font-medium ${!humOk ? 'text-red-400' : 'text-emerald-400'}`}>
                            {hum != null ? `${hum}% ${!humOk ? '⚠️' : '✓'}` : '—'}
                          </td>
                          <td className="p-3">{r.user?.name || r.user?.email || '—'}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const recDate = new Date(r.recordedAt)
                                  setSc_editing(r.id)
                                  setSc_date(
                                    `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
                                  )
                                  setSc_time(
                                    `${String(recDate.getHours()).padStart(2, '0')}:${String(recDate.getMinutes()).padStart(2, '0')}`
                                  )
                                  setSc_storage(String(d.storage || ''))
                                  setSc_temp(d.temperature != null ? String(d.temperature) : '')
                                  setSc_humidity(d.humidity != null ? String(d.humidity) : '')
                                  setSc_executor(String(d.executedBy || ''))
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>}
              </div>
            </CardBody>
          </Card>
        </div>
      )}{tab === 'JOURNAL_VERIFICATION' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">RS-18.01</p>
                <h2 className="font-semibold">
                  {jv_editing ? '✏️ რედაქტირება' : 'ჟურნალების გადამოწმება (კვირეული)'}
                </h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-xs text-text-muted bg-bg-tertiary p-3 rounded-lg">
                📋 გადამოწმება ხდება <strong>7 დღეში ერთხელ</strong> — HACCP ლიდერი ამოწმებს ყველა ჟურნალი სწორად და
                დროულად შეივსო.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">გადამოწმების თარიღი *</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={jv_date}
                    onChange={(e) => setJv_date(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">ჯგუფის ლიდერი *</label>
                  <select className={inputClass} value={jv_leader} onChange={(e) => setJv_leader(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">შენიშვნა / დასკვნა</label>
                <textarea
                  className={`${inputClass} h-24 resize-none`}
                  value={jv_notes}
                  onChange={(e) => setJv_notes(e.target.value)}
                  placeholder="ყველა ჟურნალი შემოწმდა. შენიშვნები: ..."
                />
              </div>
              {jv_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={jv_submitting || !jv_leader || !jv_date}
                  onClick={async () => {
                    setJv_submitting(true)
                    setJv_success(false)
                    try {
                      const body = {
                        type: 'JOURNAL_VERIFICATION',
                        recordedAt: new Date(jv_date + 'T12:00:00').toISOString(),
                        data: {
                          leader: jv_leader,
                          notes: jv_notes || undefined,
                          verifiedAt: new Date().toISOString(),
                        },
                      }
                      const res = jv_editing
                        ? await fetch(`/api/haccp/journals/${jv_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        alert('შენახვა ვერ მოხერხდა')
                        return
                      }
                      setJv_notes('')
                      setJv_leader('')
                      setJv_editing(null)
                      setJv_success(true)
                      await load(tab)
                      setTimeout(() => setJv_success(false), 3000)
                    } finally {
                      setJv_submitting(false)
                    }
                  }}
                >
                  {jv_submitting ? 'ინახება...' : jv_editing ? 'განახლება' : 'დამტკიცება ✓'}
                </Button>
                {jv_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setJv_editing(null)
                      setJv_notes('')
                      setJv_leader('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">გადამოწმების ისტორია</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">ჯგ. ლიდერი</th>
                      <th className="p-3">შენიშვნა</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3 whitespace-nowrap">
                            {mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}
                          </td>
                          <td className="p-3 font-medium">{String(d.leader || '—')}</td>
                          <td className="p-3 max-w-xs truncate text-text-muted">{String(d.notes || '—')}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const recDate = new Date(r.recordedAt)
                                  setJv_editing(r.id)
                                  setJv_date(
                                    `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
                                  )
                                  setJv_leader(String(d.leader || ''))
                                  setJv_notes(String(d.notes || ''))
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && (
                  <p className="p-4 text-text-muted text-sm">გადამოწმება ჯერ არ ჩატარებულა</p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      {tab === 'MANAGEMENT_REVIEW' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">F-08 | მჯმ ოქმი</p>
                <h2 className="font-semibold">{mr_editing ? '✏️ რედაქტირება' : 'მენეჯმენტის განხილვის ოქმი'}</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input type="date" className={inputClass} value={mr_date} onChange={(e) => setMr_date(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">თავმჯდომარე *</label>
                  <select className={inputClass} value={mr_leader} onChange={(e) => setMr_leader(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">მონაწილეები</label>
                <input
                  type="text"
                  className={inputClass}
                  value={mr_participants}
                  onChange={(e) => setMr_participants(e.target.value)}
                  placeholder="სახელები, თანამდებობები..."
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">დღის წესრიგი / მიზანი *</label>
                <textarea
                  className={`${inputClass} h-20 resize-none`}
                  value={mr_agenda}
                  onChange={(e) => setMr_agenda(e.target.value)}
                  placeholder="განხილვის თემები..."
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">მიღებული გადაწყვეტილებები</label>
                <textarea
                  className={`${inputClass} h-20 resize-none`}
                  value={mr_decisions}
                  onChange={(e) => setMr_decisions(e.target.value)}
                  placeholder="გადაწყვეტილებები, ვადები..."
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">შემდეგი შეხვედრის თარიღი</label>
                <input type="date" className={inputClass} value={mr_nextDate} onChange={(e) => setMr_nextDate(e.target.value)} />
              </div>
              {mr_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={mr_submitting || !mr_date || !mr_agenda || !mr_leader}
                  onClick={async () => {
                    setMr_submitting(true)
                    setMr_success(false)
                    try {
                      const body = {
                        type: 'MANAGEMENT_REVIEW',
                        recordedAt: new Date(mr_date + 'T12:00:00').toISOString(),
                        data: {
                          leader: mr_leader,
                          participants: mr_participants,
                          agenda: mr_agenda,
                          decisions: mr_decisions,
                          nextDate: mr_nextDate || undefined,
                        },
                      }
                      const res = mr_editing
                        ? await fetch(`/api/haccp/journals/${mr_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        alert('შენახვა ვერ მოხერხდა')
                        return
                      }
                      setMr_agenda('')
                      setMr_participants('')
                      setMr_decisions('')
                      setMr_nextDate('')
                      setMr_leader('')
                      setMr_editing(null)
                      setMr_success(true)
                      if (tab) await load(tab)
                      setTimeout(() => setMr_success(false), 3000)
                    } finally {
                      setMr_submitting(false)
                    }
                  }}
                >
                  {mr_submitting ? 'ინახება...' : mr_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {mr_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setMr_editing(null)
                      setMr_agenda('')
                      setMr_participants('')
                      setMr_decisions('')
                      setMr_nextDate('')
                      setMr_leader('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">თავმჯდ.</th>
                      <th className="p-3">დღ. წ.</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3">{mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}</td>
                          <td className="p-3">{String(d.leader || '—')}</td>
                          <td className="p-3 max-w-xs truncate">{String(d.agenda || '—')}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const rd = new Date(r.recordedAt)
                                  setMr_editing(r.id)
                                  setMr_date(
                                    `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, '0')}-${String(rd.getDate()).padStart(2, '0')}`
                                  )
                                  setMr_leader(String(d.leader || ''))
                                  setMr_participants(String(d.participants || ''))
                                  setMr_agenda(String(d.agenda || ''))
                                  setMr_decisions(String(d.decisions || ''))
                                  const nd = d.nextDate ? String(d.nextDate) : ''
                                  setMr_nextDate(nd.length >= 10 ? nd.slice(0, 10) : nd)
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      {tab === 'AUDIT' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">F-09.3 | HACCP აუდიტი</p>
                <h2 className="font-semibold">{au_editing ? '✏️ რედაქტირება' : 'HACCP შიდა აუდიტი'}</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input type="date" className={inputClass} value={au_date} onChange={(e) => setAu_date(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">აუდიტორი *</label>
                  <select className={inputClass} value={au_auditor} onChange={(e) => setAu_auditor(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-2">აუდიტის პუნქტები</label>
                <div className="space-y-2">
                  {[
                    '1. სახელმძღვანელო, ბლოკ-სქემები, CCP კონტროლი',
                    '2. ჩანაწერები და დოკუმენტების მართვა',
                    '3. ვალიდაცია და ვერიფიკაციის დოკუმენტები',
                    '4. შიდა აუდიტები',
                    '5. პერსონალის ჰიგიენა და GMP',
                    '6. ინფრასტრუქტურა და სამუშ. პროცესები',
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 bg-bg-tertiary rounded-lg">
                      <span className="text-xs text-text-secondary flex-1">{item}</span>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            au_items[String(idx)] === 'yes'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-bg-card border border-border text-text-muted'
                          }`}
                          onClick={() =>
                            setAu_items((p) => ({
                              ...p,
                              [String(idx)]: p[String(idx)] === 'yes' ? null : 'yes',
                            }))
                          }
                        >
                          კი
                        </button>
                        <button
                          type="button"
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            au_items[String(idx)] === 'no'
                              ? 'bg-red-500 text-white'
                              : 'bg-bg-card border border-border text-text-muted'
                          }`}
                          onClick={() =>
                            setAu_items((p) => ({
                              ...p,
                              [String(idx)]: p[String(idx)] === 'no' ? null : 'no',
                            }))
                          }
                        >
                          არა
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">შენიშვნები / დასკვნა</label>
                <textarea
                  className={`${inputClass} h-20 resize-none`}
                  value={au_notes}
                  onChange={(e) => setAu_notes(e.target.value)}
                  placeholder="აუდიტის შედეგები..."
                />
              </div>
              {au_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={au_submitting || !au_date || !au_auditor}
                  onClick={async () => {
                    setAu_submitting(true)
                    setAu_success(false)
                    try {
                      const body = {
                        type: 'AUDIT',
                        recordedAt: new Date(au_date + 'T12:00:00').toISOString(),
                        data: { auditor: au_auditor, items: au_items, notes: au_notes || undefined },
                      }
                      const res = au_editing
                        ? await fetch(`/api/haccp/journals/${au_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        alert('შენახვა ვერ მოხერხდა')
                        return
                      }
                      setAu_items({})
                      setAu_notes('')
                      setAu_auditor('')
                      setAu_editing(null)
                      setAu_success(true)
                      if (tab) await load(tab)
                      setTimeout(() => setAu_success(false), 3000)
                    } finally {
                      setAu_submitting(false)
                    }
                  }}
                >
                  {au_submitting ? 'ინახება...' : au_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {au_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setAu_editing(null)
                      setAu_items({})
                      setAu_notes('')
                      setAu_auditor('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">აუდიტორი</th>
                      <th className="p-3">შენიშვნა</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3">{mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}</td>
                          <td className="p-3">{String(d.auditor || '—')}</td>
                          <td className="p-3 max-w-xs truncate">{String(d.notes || '—')}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const rd = new Date(r.recordedAt)
                                  setAu_editing(r.id)
                                  setAu_date(
                                    `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, '0')}-${String(rd.getDate()).padStart(2, '0')}`
                                  )
                                  setAu_auditor(String(d.auditor || ''))
                                  setAu_notes(String(d.notes || ''))
                                  const rawItems = d.items as Record<string, unknown> | undefined
                                  const nextItems: Record<string, 'yes' | 'no' | null> = {}
                                  if (rawItems) {
                                    for (const [k, v] of Object.entries(rawItems)) {
                                      nextItems[k] = v === 'yes' || v === 'no' ? v : null
                                    }
                                  }
                                  setAu_items(nextItems)
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      {tab === 'CORRECTIVE_ACTION' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">F-10.2</p>
                <h2 className="font-semibold">{ca_editing ? '✏️ რედაქტირება' : 'მაკორექტირებელი ქმედების ჩანაწერი'}</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input type="date" className={inputClass} value={ca_date} onChange={(e) => setCa_date(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">პასუხისმგებელი</label>
                  <select className={inputClass} value={ca_responsible} onChange={(e) => setCa_responsible(e.target.value)}>
                    <option value="">— აირჩიეთ —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">გადახრის/შეუსაბამობის აღწერა *</label>
                <textarea
                  className={`${inputClass} h-20 resize-none`}
                  value={ca_description}
                  onChange={(e) => setCa_description(e.target.value)}
                  placeholder="რა პრობლემა გამოვლინდა..."
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">მიზეზის კვლევა</label>
                <textarea
                  className={`${inputClass} h-16 resize-none`}
                  value={ca_cause}
                  onChange={(e) => setCa_cause(e.target.value)}
                  placeholder="რატომ მოხდა..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">გატარებული ქმედება *</label>
                  <textarea
                    className={`${inputClass} h-16 resize-none`}
                    value={ca_action}
                    onChange={(e) => setCa_action(e.target.value)}
                    placeholder="რა გაკეთდა..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">შესრულების ვადა</label>
                  <input type="date" className={inputClass} value={ca_deadline} onChange={(e) => setCa_deadline(e.target.value)} />
                </div>
              </div>
              {ca_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={ca_submitting || !ca_description || !ca_date || !ca_action}
                  onClick={async () => {
                    setCa_submitting(true)
                    setCa_success(false)
                    try {
                      const body = {
                        type: 'CORRECTIVE_ACTION',
                        recordedAt: new Date(ca_date + 'T12:00:00').toISOString(),
                        data: {
                          description: ca_description,
                          cause: ca_cause || undefined,
                          action: ca_action,
                          responsible: ca_responsible || undefined,
                          deadline: ca_deadline || undefined,
                        },
                      }
                      const res = ca_editing
                        ? await fetch(`/api/haccp/journals/${ca_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        alert('შენახვა ვერ მოხერხდა')
                        return
                      }
                      setCa_description('')
                      setCa_cause('')
                      setCa_action('')
                      setCa_responsible('')
                      setCa_deadline('')
                      setCa_editing(null)
                      setCa_success(true)
                      if (tab) await load(tab)
                      setTimeout(() => setCa_success(false), 3000)
                    } finally {
                      setCa_submitting(false)
                    }
                  }}
                >
                  {ca_submitting ? 'ინახება...' : ca_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {ca_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setCa_editing(null)
                      setCa_description('')
                      setCa_cause('')
                      setCa_action('')
                      setCa_responsible('')
                      setCa_deadline('')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">პრობლემა</th>
                      <th className="p-3">ქმედება</th>
                      <th className="p-3">ვადა</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      const deadline = d.deadline ? new Date(String(d.deadline)) : null
                      const overdue = deadline !== null && !Number.isNaN(deadline.getTime()) && deadline < new Date()
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3">{mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}</td>
                          <td className="p-3 max-w-[200px] truncate">{String(d.description || '—')}</td>
                          <td className="p-3 max-w-[200px] truncate">{String(d.action || '—')}</td>
                          <td className={`p-3 ${overdue ? 'text-red-400 font-medium' : ''}`}>
                            {deadline && !Number.isNaN(deadline.getTime())
                              ? `${deadline.toLocaleDateString('ka-GE')}${overdue ? ' ⚠️' : ''}`
                              : '—'}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const rd = new Date(r.recordedAt)
                                  setCa_editing(r.id)
                                  setCa_date(
                                    `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, '0')}-${String(rd.getDate()).padStart(2, '0')}`
                                  )
                                  setCa_description(String(d.description || ''))
                                  setCa_cause(String(d.cause || ''))
                                  setCa_action(String(d.action || ''))
                                  setCa_responsible(String(d.responsible || ''))
                                  const dl = d.deadline ? String(d.deadline) : ''
                                  setCa_deadline(dl.length >= 10 ? dl.slice(0, 10) : dl)
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      {tab === 'RODENT_TRAP' && (
        <div className="print:hidden space-y-4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs text-copper-light font-semibold">F-24 | სათაგურები</p>
                <h2 className="font-semibold">{rt_editing ? '✏️ რედაქტირება' : 'სათაგურების შემოწმების ჟურნალი'}</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">თარიღი *</label>
                  <input type="date" className={inputClass} value={rt_date} onChange={(e) => setRt_date(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">კვირა</label>
                  <select className={inputClass} value={rt_week} onChange={(e) => setRt_week(e.target.value)}>
                    <option value="I">I კვირა</option>
                    <option value="II">II კვირა</option>
                    <option value="III">III კვირა</option>
                    <option value="IV">IV კვირა</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">შემსრულებელი</label>
                  <select className={inputClass} value={rt_executor} onChange={(e) => setRt_executor(e.target.value)}>
                    <option value="">— მიმდინარე მომხ. —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name || u.email || u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-2">სათაგურების შემოწმება (მონიშნეთ შემოწმებული)</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <label
                      key={n}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        rt_traps[n] ? 'bg-emerald-900/20 border-emerald-600/40' : 'bg-bg-tertiary border-border'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="w-3 h-3 accent-emerald-500"
                        checked={!!rt_traps[n]}
                        onChange={(e) => setRt_traps((p) => ({ ...p, [n]: e.target.checked }))}
                      />
                      <span className="text-xs">№{n}</span>
                      {rt_traps[n] && <span className="ml-auto text-emerald-400 text-xs">✓</span>}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    className="text-xs text-copper hover:text-copper-light"
                    onClick={() => setRt_traps(Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, true])))}
                  >
                    ყველა ✓
                  </button>
                  <span className="text-text-muted text-xs">·</span>
                  <button type="button" className="text-xs text-text-muted hover:text-text-primary" onClick={() => setRt_traps({})}>
                    გასუფთავება
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">შენიშვნა</label>
                <input
                  type="text"
                  className={inputClass}
                  value={rt_notes}
                  onChange={(e) => setRt_notes(e.target.value)}
                  placeholder="მოვლენები, დაზიანებები..."
                />
              </div>
              {rt_success && <p className="text-sm text-emerald-400">✅ შენახულია!</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={rt_submitting || !rt_date}
                  onClick={async () => {
                    setRt_submitting(true)
                    setRt_success(false)
                    try {
                      const checkedCount = Object.values(rt_traps).filter(Boolean).length
                      const body = {
                        type: 'RODENT_TRAP',
                        recordedAt: new Date(rt_date + 'T12:00:00').toISOString(),
                        data: {
                          week: rt_week,
                          traps: rt_traps,
                          checkedCount,
                          notes: rt_notes || undefined,
                          executedBy: rt_executor || undefined,
                        },
                      }
                      const res = rt_editing
                        ? await fetch(`/api/haccp/journals/${rt_editing}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                        : await fetch('/api/haccp/journals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                      if (!res.ok) {
                        alert('შენახვა ვერ მოხერხდა')
                        return
                      }
                      setRt_traps({})
                      setRt_notes('')
                      setRt_executor('')
                      setRt_week('I')
                      setRt_editing(null)
                      setRt_success(true)
                      if (tab) await load(tab)
                      setTimeout(() => setRt_success(false), 3000)
                    } finally {
                      setRt_submitting(false)
                    }
                  }}
                >
                  {rt_submitting ? 'ინახება...' : rt_editing ? 'განახლება' : 'შენახვა'}
                </Button>
                {rt_editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setRt_editing(null)
                      setRt_traps({})
                      setRt_notes('')
                      setRt_executor('')
                      setRt_week('I')
                    }}
                  >
                    გაუქმება
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">ბოლო ჩანაწერები</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                      <th className="p-3">თარიღი</th>
                      <th className="p-3">კვირა</th>
                      <th className="p-3">შემოწ.</th>
                      <th className="p-3">შემსრ.</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.data as Record<string, unknown>
                      return (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3">{mounted ? new Date(r.recordedAt).toLocaleDateString('ka-GE') : ''}</td>
                          <td className="p-3">{String(d.week || '—')} კვირა</td>
                          <td className="p-3 font-medium">{d.checkedCount != null ? `${d.checkedCount}/10 ✓` : '—'}</td>
                          <td className="p-3">{r.user?.name || r.user?.email || '—'}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-xs text-copper hover:text-copper-light"
                                onClick={() => {
                                  const rd = new Date(r.recordedAt)
                                  setRt_editing(r.id)
                                  setRt_date(
                                    `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, '0')}-${String(rd.getDate()).padStart(2, '0')}`
                                  )
                                  setRt_week(String(d.week || 'I'))
                                  const rawTraps = d.traps as Record<string, unknown> | undefined
                                  const nextTraps: Record<number, boolean> = {}
                                  if (rawTraps) {
                                    for (const [k, v] of Object.entries(rawTraps)) {
                                      const n = Number(k)
                                      if (!Number.isNaN(n)) nextTraps[n] = Boolean(v)
                                    }
                                  }
                                  setRt_traps(nextTraps)
                                  setRt_notes(String(d.notes || ''))
                                  setRt_executor(String(d.executedBy || ''))
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => deleteJournal(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

          </div>
        )}
      </div>

      {modalOpen &&
        tab &&
        tab !== 'MANAGEMENT_REVIEW' &&
        tab !== 'AUDIT' &&
        tab !== 'CORRECTIVE_ACTION' &&
        tab !== 'RODENT_TRAP' && (
        <div
          className="print:hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className="bg-bg-card border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold">ახალი ჩანიშვნა — {tabLabel}</h3>
              <button
                type="button"
                className="text-text-muted hover:text-text-primary text-xl leading-none"
                onClick={() => !submitting && setModalOpen(false)}
                aria-label="დახურვა"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex gap-2 pt-2">
                <Button type="button" onClick={submitJournal} disabled={submitting}>
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

      <div className="hidden print:block text-center text-xs text-black mt-8 pt-4 border-t border-gray-400">
        დაბეჭდილია: {mounted ? new Date().toLocaleString('ka-GE') : ''}
      </div>
    </DashboardLayout>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      <input type={type} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      <textarea className={`${inputClass} min-h-[80px]`} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
    </div>
  )
}

