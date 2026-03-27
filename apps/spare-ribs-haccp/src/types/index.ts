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
  if (fAm < 0 || fAm > 4) issues.push(`მაც.დ. ${fAm}°C`)
  if (fPm < 0 || fPm > 4) issues.push(`მაც.ს. ${fPm}°C`)
  if (zAm > -18) issues.push(`საყინ.დ. ${zAm}°C > -18°C`)
  if (zPm > -18) issues.push(`საყინ.ს. ${zPm}°C > -18°C`)
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
  { section: 'A. დოკუმენტაცია', items: [
    'HACCP ჩანაწ. (F-001–F-007) სრულია?',
    'ჩანაწ. ბოლო 30 დღის განმავლობაში შენახულია?',
    'LOT სისტემა მუშაობს?',
    'ყველა გადახრის ოქმი (F-006) შედგენილია?',
  ]},
  { section: 'B. CCP-1 — Sous-Vide', items: [
    'F-001 ყოველ პარტიაზე შევსებულია?',
    'ტემპ. ≥74°C დაცულია?',
    '3 გაზომვა (დ./შ./ბ.) ყოველ პარტიაზე?',
    'სულ ≥12 საათი Sous-Vide?',
    'SmartVide 4 კალიბრირებულია?',
  ]},
  { section: 'C. CCP-2 — სწრაფი გაციება', items: [
    'F-002 ყოველ პარტიაზე შევსებულია?',
    'საბოლ. ≤4°C 90 წუთში?',
    '30 წუთში Blast Chiller-ში მოთავსება?',
  ]},
  { section: 'D. CCP-3 — შენახვა', items: [
    'F-003 ყოველდღიურად შევსებულია?',
    'მაცივარი 0–4°C?',
    'საყინულე ≤-18°C?',
    'ვარგისიანობა ≤21 დღე?',
  ]},
  { section: 'E. CCP-4 — CIP სანიტარია', items: [
    'F-004 ყოველ ცვლაზე შევსებულია?',
    'NaOH 1.5–2%?',
    'PAA 150–200ppm?',
    'საბოლ. pH 6.5–7.5?',
  ]},
  { section: 'F. ნედლეული — F-005', items: [
    'F-005 ყოველ მიწოდებაზე შევსებულია?',
    'ვეტ. სერტ. + COA გვაქვს?',
    'მიწ. ტემპ. ≤4°C?',
    'FIFO პრინციპი დაცულია?',
  ]},
  { section: 'G. ლაბ. ტესტი — F-007', items: [
    'F-007 თვეში 2-ჯერ მაინც?',
    'TVC ≤100,000?',
    'Salmonella/Listeria — ნეგ.?',
  ]},
  { section: 'H. პერსონალი', items: [
    'ჯანმ. სერტ. ≤1 წელი?',
    'HACCP ტრენინგი ≤6 თვე?',
    'ფორმა + ხელთათ. + ქუდი?',
    'ავადმყოფი = მუშაობა არ?',
  ]},
]
