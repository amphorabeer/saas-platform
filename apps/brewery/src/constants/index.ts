export const NAV_ITEMS = [
  { href: '/', label: 'დეშბორდი', icon: '📊' },
  { href: '/production', label: 'წარმოება', icon: '🍺' },
  // ფერმენტაცია წაშლილია - გადავიდა წარმოებაში ტაბად
  { href: '/recipes', label: 'რეცეპტები', icon: '📋' },
  { href: '/calendar', label: 'კალენდარი', icon: '📅' },
  { href: '/inventory', label: 'მარაგები', icon: '📦' },
  { href: '/sales', label: 'გაყიდვები', icon: '💰' },
  { href: '/quality', label: 'ხარისხი', icon: '✅' },
  { href: '/equipment', label: 'აღჭურვილობა', icon: '⚙️' },
  { href: '/reports', label: 'რეპორტები', icon: '📈' },
  { href: '/finances', label: 'ფინანსები', icon: '💵' },
  { href: '/settings', label: 'პარამეტრები', icon: '🔧' },
]

export const BATCH_STATUS = {
  planned: { label: 'დაგეგმილი', color: 'text-blue-400', bgColor: 'bg-blue-400/20' },
  brewing: { label: 'მზადდება', color: 'text-amber-400', bgColor: 'bg-amber-400/20' },
  fermenting: { label: 'ფერმენტაცია', color: 'text-purple-400', bgColor: 'bg-purple-400/20' },
  conditioning: { label: 'კონდიცირება', color: 'text-cyan-400', bgColor: 'bg-cyan-400/20' },
  ready: { label: 'მზადაა', color: 'text-green-400', bgColor: 'bg-green-400/20' },
  packaged: { label: 'დაფასოებული', color: 'text-emerald-400', bgColor: 'bg-emerald-400/20' },
  cancelled: { label: 'გაუქმებული', color: 'text-red-400', bgColor: 'bg-red-400/20' },
}

export const TANK_STATUS = {
  available: { label: 'თავისუფალი', color: 'text-green-400', bgColor: 'bg-green-400/20' },
  in_use: { label: 'აქტიური', color: 'text-amber-400', bgColor: 'bg-amber-400/20' },
  cleaning: { label: 'წმენდა', color: 'text-blue-400', bgColor: 'bg-blue-400/20' },
  maintenance: { label: 'მოვლაზე', color: 'text-red-400', bgColor: 'bg-red-400/20' },
}

export const BEER_STYLES = [
  'Lager',
  'Pilsner', 
  'IPA',
  'Pale Ale',
  'Stout',
  'Porter',
  'Wheat Beer',
  'Amber Ale',
  'Brown Ale',
  'Saison',
  'Sour',
]

// Production page tabs
export const PRODUCTION_TABS = [
  { key: 'batches', label: 'პარტიები', icon: '📋' },
  { key: 'brewhouse', label: 'სახარში ქვაბი', icon: '🍳' },
  { key: 'tanks', label: 'ავზები', icon: '🛢️' },
]

// Batch Phase Configuration
export const BATCH_PHASE_CONFIG = {
  PLANNED: {
    label: 'დაგეგმილი',
    icon: '📅',
    color: 'bg-slate-500',
    headerColor: 'bg-gradient-to-r from-slate-600 to-slate-700',
    textColor: 'text-slate-400',
    nextPhase: 'BREWING',
    nextPhaseLabel: '🍺 ხარშვის დაწყება',
  },
  BREWING: {
    label: 'ხარშვა',
    icon: '🍺',
    color: 'bg-amber-500',
    headerColor: 'bg-gradient-to-r from-amber-500 to-orange-600',
    textColor: 'text-amber-400',
    nextPhase: 'FERMENTING',
    nextPhaseLabel: '🧪 ფერმენტაციის დაწყება',
  },
  FERMENTING: {
    label: 'ფერმენტაცია',
    icon: '🧪',
    color: 'bg-green-500',
    headerColor: 'bg-gradient-to-r from-green-500 to-emerald-600',
    textColor: 'text-green-400',
    nextPhase: 'CONDITIONING',
    nextPhaseLabel: '🔵 კონდიცირებაში გადასვლა',
  },
  CONDITIONING: {
    label: 'კონდიცირება',
    icon: '🔵',
    color: 'bg-blue-500',
    headerColor: 'bg-gradient-to-r from-blue-500 to-cyan-600',
    textColor: 'text-blue-400',
    nextPhase: 'READY',
    nextPhaseLabel: '✅ მზადაა',
  },
  READY: {
    label: 'მზადაა',
    icon: '✅',
    color: 'bg-emerald-500',
    headerColor: 'bg-gradient-to-r from-emerald-500 to-green-600',
    textColor: 'text-emerald-400',
    nextPhase: 'PACKAGING',
    nextPhaseLabel: '📦 დაფასოების დაწყება',
  },
  PACKAGING: {
    label: 'დაფასოება',
    icon: '📦',
    color: 'bg-purple-500',
    headerColor: 'bg-gradient-to-r from-purple-500 to-violet-600',
    textColor: 'text-purple-400',
    nextPhase: 'COMPLETED',
    nextPhaseLabel: '🏁 დასრულება',
  },
  COMPLETED: {
    label: 'დასრულებული',
    icon: '🏁',
    color: 'bg-gray-500',
    headerColor: 'bg-gradient-to-r from-gray-500 to-gray-600',
    textColor: 'text-gray-400',
    nextPhase: null,
    nextPhaseLabel: null,
  },
} as const

export type BatchPhase = keyof typeof BATCH_PHASE_CONFIG

// Phase color gradients mapping for TimelineBar and EventDetailModal
export const PHASE_COLOR_GRADIENTS: Record<string, { bar: string; header: string; text: string; badge: string }> = {
  amber: { 
    bar: 'bg-gradient-to-r from-amber-500 to-orange-500', 
    header: 'bg-gradient-to-r from-amber-500 to-orange-600', 
    text: 'text-amber-400',
    badge: 'bg-gradient-to-r from-amber-500 to-yellow-500'
  },
  orange: { 
    bar: 'bg-gradient-to-r from-orange-500 to-red-500', 
    header: 'bg-gradient-to-r from-orange-500 to-red-600', 
    text: 'text-orange-400',
    badge: 'bg-gradient-to-r from-orange-500 to-red-500'
  },
  yellow: { 
    bar: 'bg-gradient-to-r from-yellow-500 to-amber-500', 
    header: 'bg-gradient-to-r from-yellow-500 to-amber-600', 
    text: 'text-yellow-400',
    badge: 'bg-gradient-to-r from-yellow-500 to-amber-500'
  },
  green: { 
    bar: 'bg-gradient-to-r from-green-500 to-emerald-500', 
    header: 'bg-gradient-to-r from-green-500 to-emerald-600', 
    text: 'text-green-400',
    badge: 'bg-gradient-to-r from-green-500 to-emerald-500'
  },
  emerald: { 
    bar: 'bg-gradient-to-r from-emerald-500 to-green-600', 
    header: 'bg-gradient-to-r from-emerald-500 to-green-600', 
    text: 'text-emerald-400',
    badge: 'bg-gradient-to-r from-emerald-500 to-green-600'
  },
  teal: { 
    bar: 'bg-gradient-to-r from-teal-500 to-cyan-500', 
    header: 'bg-gradient-to-r from-teal-500 to-cyan-600', 
    text: 'text-teal-400',
    badge: 'bg-gradient-to-r from-teal-500 to-cyan-500'
  },
  cyan: { 
    bar: 'bg-gradient-to-r from-cyan-500 to-blue-500', 
    header: 'bg-gradient-to-r from-cyan-500 to-blue-600', 
    text: 'text-cyan-400',
    badge: 'bg-gradient-to-r from-cyan-500 to-blue-500'
  },
  blue: { 
    bar: 'bg-gradient-to-r from-blue-500 to-cyan-600', 
    header: 'bg-gradient-to-r from-blue-500 to-cyan-600', 
    text: 'text-blue-400',
    badge: 'bg-gradient-to-r from-blue-500 to-cyan-600'
  },
  indigo: { 
    bar: 'bg-gradient-to-r from-indigo-500 to-purple-500', 
    header: 'bg-gradient-to-r from-indigo-500 to-indigo-600', 
    text: 'text-indigo-400',
    badge: 'bg-gradient-to-r from-indigo-500 to-purple-500'
  },
  purple: { 
    bar: 'bg-gradient-to-r from-purple-500 to-violet-500', 
    header: 'bg-gradient-to-r from-purple-500 to-violet-600', 
    text: 'text-purple-400',
    badge: 'bg-gradient-to-r from-purple-500 to-violet-500'
  },
  violet: { 
    bar: 'bg-gradient-to-r from-violet-500 to-purple-600', 
    header: 'bg-gradient-to-r from-violet-500 to-purple-600', 
    text: 'text-violet-400',
    badge: 'bg-gradient-to-r from-violet-500 to-purple-600'
  },
  pink: { 
    bar: 'bg-gradient-to-r from-pink-500 to-rose-500', 
    header: 'bg-gradient-to-r from-pink-500 to-rose-600', 
    text: 'text-pink-400',
    badge: 'bg-gradient-to-r from-pink-500 to-rose-500'
  },
  red: { 
    bar: 'bg-gradient-to-r from-red-500 to-orange-500', 
    header: 'bg-gradient-to-r from-red-500 to-red-600', 
    text: 'text-red-400',
    badge: 'bg-gradient-to-r from-red-500 to-orange-500'
  },
  gray: { 
    bar: 'bg-gradient-to-r from-gray-500 to-slate-500', 
    header: 'bg-gradient-to-r from-gray-500 to-gray-600', 
    text: 'text-gray-400',
    badge: 'bg-gradient-to-r from-gray-500 to-slate-500'
  },
  slate: { 
    bar: 'bg-gradient-to-r from-slate-500 to-gray-600', 
    header: 'bg-gradient-to-r from-slate-600 to-slate-700', 
    text: 'text-slate-400',
    badge: 'bg-gradient-to-r from-slate-500 to-slate-400'
  },
}

// Helper to get phase key from batchStatus
export const getPhaseFromStatus = (status: string): keyof typeof BATCH_PHASE_CONFIG | null => {
  const normalized = status.toUpperCase()
  if (normalized in BATCH_PHASE_CONFIG) {
    return normalized as keyof typeof BATCH_PHASE_CONFIG
  }
  return null
}
