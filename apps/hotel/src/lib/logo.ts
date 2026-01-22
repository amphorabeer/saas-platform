/** Default logo URL to never display (external placeholder). */
const DEFAULT_LOGO_URL =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRpLiMZBg19GNgbTVeEJG3UORb8b6CWr4do0ljLh0DJtvsxAkruGupVTGI&s'

/**
 * Returns true only if we should show a logo image.
 * Excludes null/undefined/empty and the default gstatic URL.
 */
export function hasDisplayableLogo(
  logo: string | null | undefined
): logo is string {
  if (logo == null || typeof logo !== 'string') return false
  const s = logo.trim()
  if (!s) return false
  if (s.includes('encrypted-tbn0.gstatic.com') || s === DEFAULT_LOGO_URL)
    return false
  return true
}

/**
 * Use when loading logo from API or localStorage.
 * Returns '' when logo is null/empty or the default URL.
 */
export function sanitizeLogo(logo: string | null | undefined): string {
  return hasDisplayableLogo(logo) ? (logo as string).trim() : ''
}
