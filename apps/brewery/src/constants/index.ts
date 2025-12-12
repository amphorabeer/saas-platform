export const NAV_ITEMS = [
  { href: '/', label: 'დეშბორდი', icon: '📊' },
  { href: '/production', label: 'წარმოება', icon: '🍺' },
  { href: '/fermentation', label: 'ფერმენტაცია', icon: '🧪' },
  { href: '/recipes', label: 'რეცეპტები', icon: '📋' },
  { href: '/calendar', label: 'კალენდარი', icon: '📅' },
  { href: '/inventory', label: 'მარაგები', icon: '📦' },
  { href: '/sales', label: 'გაყიდვები', icon: '💰' },
  { href: '/quality', label: 'ხარისხი', icon: '✅' },
  { href: '/equipment', label: 'აღჭურვილობა', icon: '⚙️' },
  { href: '/reports', label: 'რეპორტები', icon: '📈' },
  { href: '/finances', label: 'ფინანსები', icon: '💰' },
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
  in_use: { label: 'გამოიყენება', color: 'text-amber-400', bgColor: 'bg-amber-400/20' },
  cleaning: { label: 'წმენდა', color: 'text-blue-400', bgColor: 'bg-blue-400/20' },
  maintenance: { label: 'რემონტი', color: 'text-red-400', bgColor: 'bg-red-400/20' },
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


