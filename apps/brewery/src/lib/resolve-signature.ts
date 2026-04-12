import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Resolves a signatureUrl to a data:image base64 string.
 * Handles both data URLs (already base64) and relative paths (/signatures/...).
 */
export function resolveSignatureUrl(url: string | null | undefined): string | null {
  if (!url) return null

  // Already a data URL — use as-is
  if (url.startsWith('data:image')) return url

  // Relative path — read from filesystem
  if (url.startsWith('/signatures/') || url.startsWith('/uploads/')) {
    try {
      const filePath = join(process.cwd(), 'public', url)
      const buffer = readFileSync(filePath)
      const base64 = buffer.toString('base64')
      const ext = url.split('.').pop()?.toLowerCase()
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg'
      return `data:${mime};base64,${base64}`
    } catch {
      return null
    }
  }

  return null
}
