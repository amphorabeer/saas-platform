/**
 * Format date as DD.MM.YYYY
 */
export function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

/**
 * Format date and time as DD.MM.YYYY HH:MM
 */
export function formatDateTime(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day}.${month}.${year} ${hours}:${minutes}`
}

/**
 * Format time as HH:MM
 */
export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Format date as short DD/MM
 */
export function formatShortDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${day}/${month}`
}

/**
 * Get relative time string (e.g., "2 დღის წინ")
 */
export function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'ახლახანს'
  if (diffMinutes < 60) return `${diffMinutes} წუთის წინ`
  if (diffHours < 24) return `${diffHours} საათის წინ`
  if (diffDays < 7) return `${diffDays} დღის წინ`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} კვირის წინ`
  return formatDate(date)
}

/**
 * Format relative time (e.g., "2 დღის წინ")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'ახლახანს'
  if (diffMins < 60) return `${diffMins} წუთის წინ`
  if (diffHours < 24) return `${diffHours} საათის წინ`
  if (diffDays < 7) return `${diffDays} დღის წინ`
  return date.toLocaleDateString('ka-GE')
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).replace(/,/g, ' ')
}

/**
 * Format currency (GEL)
 */
export function formatCurrency(amount: number): string {
  return `${formatNumber(amount, 2)}₾`
}



