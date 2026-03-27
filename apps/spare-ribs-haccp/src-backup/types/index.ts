// src/types/index.ts

export const CCP_LIMITS = {
  'CCP-1': {
    nameKa: 'Sous-Vide — SmartVide 4',
    nameEn: 'Sous-Vide',
    limitKa: '≥74°C / ≥12სთ',
    limitEn: '≥74°C / ≥12h',
    tempMin: 74.0,
    hoursMin: 12,
    form: 'F-001',
  },
  'CCP-2': {
    nameKa: 'Blast Chilling — ყ. გ.',
    nameEn: 'Blast Chilling',
    limitKa: '≤4°C / ≤90წთ',
    limitEn: '≤4°C / ≤90min',
    tempFinalMax: 4.0,
    minsMax: 90,
    form: 'F-002',
  },
  'CCP-3': {
    nameKa: 'შენახვის ტემპ.',
    nameEn: 'Storage Temperature',
    limitKa: 'მ.: 0–4°C | მ-ზ.: ≤-18°C',
    limitEn: 'Fridge: 0–4°C | Freezer: ≤-18°C',
    fridgeMin: 0,
    fridgeMax: 4.0,
    freezerMax: -18,
    form: 'F-003',
  },
  'CCP-4': {
    nameKa: 'CIP სანიტარია',
    nameEn: 'CIP Sanitation',
    limitKa: 'NaOH 1.5–2% | PAA 150–200ppm | pH 6.5–7.5',
    limitEn: 'NaOH 1.5–2% | PAA 150–200ppm | pH 6.5–7.5',
    naohMin: 1.5,
    naohMax: 2.0,
    tempMin: 70,
    paaMin: 150,
    paaMax: 200,
    phMin: 6.5,
    phMax: 7.5,
    form: 'F-004',
  },
} as const

export type CcpKey = keyof typeof CCP_LIMITS

export interface CheckResult {
  compliant: boolean
  issues: string[]
}

export function checkCCP1(t1: number, t2: number, t3: number, hours: number): CheckResult {
  const issues: string[] = []
  if (t1 < 74) issues.push(`დ.ტ. ${t1}°C < 74°C`)
  if (t2 < 74) issues.push(`შ.ტ. ${t2}°C < 74°C`)
  if (t3 < 74) issues.push(`ბ.ტ. ${t3}°C < 74°C`)
  if (hours < 12) issues.push(`${hours}სთ < 12სთ`)
  return { compliant: issues.length === 0, issues }
}

export function checkCCP2(tempFinal: number, mins: number): CheckResult {
  const issues: string[] = []
  if (tempFinal > 4) issues.push(`ბ.ტ. ${tempFinal}°C > 4°C`)
  if (mins > 90) issues.push(`${mins}წთ > 90წთ`)
  return { compliant: issues.length === 0, issues }
}

export function checkCCP3(fAm: number, fPm: number, zAm: number, zPm: number): CheckResult {
  const issues: string[] = []
  if (fAm < 0 || fAm > 4) issues.push(`მ.დ. ${fAm}°C`)
  if (fPm < 0 || fPm > 4) issues.push(`მ.ს. ${fPm}°C`)
  if (zAm > -18) issues.push(`მ-ზ.დ. ${zAm}°C > -18°C`)
  if (zPm > -18) issues.push(`მ-ზ.ს. ${zPm}°C > -18°C`)
  return { compliant: issues.length === 0, issues }
}

export function checkCCP4(naoh: number, temp: number, paa: number, ph: number): CheckResult {
  const issues: string[] = []
  if (naoh < 1.5 || naoh > 2.0) issues.push(`NaOH ${naoh}%`)
  if (temp < 70) issues.push(`ტ. ${temp}°C < 70°C`)
  if (paa < 150 || paa > 200) issues.push(`PAA ${paa}ppm`)
  if (ph < 6.5 || ph > 7.5) issues.push(`pH ${ph}`)
  return { compliant: issues.length === 0, issues }
}

export const LAB_LIMITS = {
  tvcMax: 100_000,
  ecoliMax: 10,
  staphMax: 100,
}

export function checkLab(tvc?: number, ecoli?: number, salm?: boolean, list?: boolean) {
  const issues: string[] = []
  if (tvc != null && tvc > LAB_LIMITS.tvcMax) issues.push(`TVC ${tvc.toLocaleString()} > 100,000`)
  if (ecoli != null && ecoli > LAB_LIMITS.ecoliMax) issues.push(`E.coli ${ecoli} > 10`)
  if (salm === true) issues.push('Salmonella გ-ვლ.! — RECALL!')
  if (list === true) issues.push('Listeria გ-ვლ.! — RECALL!')
  return { compliant: issues.length === 0, issues, requiresRecall: salm || list }
}

export function genLot(): string {
  const d = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  return `SR-${d}-${Math.floor(Math.random() * 900) + 100}`
}

export function genCar(): string {
  return `CAR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
}

export function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function fmtDateTime(d: Date | string) {
  return new Date(d).toLocaleString('ka-GE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export const AUDIT_CHECKLIST = [
  { section: 'A. დოკ. / Documentation', items: [
    'HACCP გ. (F-001–F-007) ✓? / HACCP plan available?',
    'ჩ. ბ. 30დ. ✓? / Records complete for 30 days?',
    'LOT სისტ. მ.? / LOT system working?',
    'კ.ქ. ა.? / Corrective actions documented?',
  ]},
  { section: 'B. CCP-1 Sous-Vide', items: [
    'F-001 ყ.პ. ✓? / F-001 filled every batch?',
    'ტ. ≥74°C ✓? / Temperature ≥74°C?',
    '3-ჯ. გ. ✓? / 3 measurements per batch?',
    'SmartVide 4 კ.? / SmartVide 4 calibrated?',
  ]},
  { section: 'C. CCP-2 Blast Chilling', items: [
    'F-002 ✓? / F-002 filled?',
    '≤4°C / 90წთ ✓? / ≤4°C in 90min?',
    'ყ. ი. ≤30წთ? / Transferred within 30min?',
  ]},
  { section: 'D. CCP-3 შ. / Storage', items: [
    'F-003 ყ.დ. ✓? / F-003 daily?',
    'მ. 0–4°C ✓? / Fridge 0–4°C?',
    'მ-ზ. ≤-18°C ✓? / Freezer ≤-18°C?',
    'ვ. ≤21დ. ✓? / Shelf life ≤21 days?',
  ]},
  { section: 'E. CCP-4 CIP', items: [
    'F-004 ყ.სმ. ✓? / F-004 every shift?',
    'NaOH 1.5–2% ✓? / NaOH in range?',
    'PAA 150–200ppm ✓? / PAA in range?',
    'pH 6.5–7.5 ✓? / Final rinse pH OK?',
  ]},
  { section: 'F. ნ-ლ. / Raw Materials', items: [
    'F-005 ✓? / F-005 filled?',
    'ვ.+COA ✓? / Vet cert + COA present?',
    'ტ. ≤4°C ✓? / Temperature ≤4°C?',
    'FIFO ✓? / FIFO observed?',
  ]},
  { section: 'G. Lab', items: [
    'F-007 თ.2-ჯ. ✓? / Lab test twice/month?',
    'TVC ≤100k ✓? / TVC in range?',
    'Salm./List. 0 ✓? / No Salmonella/Listeria?',
  ]},
  { section: 'H. პ. / Personnel', items: [
    'ჯ.სერ. ≤1წ.? / Health cert ≤1yr?',
    'ტრ. ≤6თ.? / Training ≤6mo?',
    'ფ+თ+ხ ✓? / Uniform+hat+gloves?',
    'ავ. ≠ სამ.? / Sick = no work?',
  ]},
]
