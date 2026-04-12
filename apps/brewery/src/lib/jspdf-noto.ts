import { jsPDF } from 'jspdf'
import { NOTO_SANS_BASE64 } from '@/lib/noto-sans-font'

const FONT_VFS = 'NotoSans-Regular.ttf'
export const NOTO_FONT_FAMILY = 'NotoSans'

export function registerNotoSansOnce(doc: jsPDF, logTag = 'PDF'): string {
  try {
    const b64 = NOTO_SANS_BASE64.replace(/\s/g, '')
    // jsPDF addFileToVFS requires latin1-decoded string, not raw base64
    const binary = Buffer.from(b64, 'base64').toString('latin1')
    doc.addFileToVFS(FONT_VFS, binary)
    doc.addFont(FONT_VFS, NOTO_FONT_FAMILY, 'normal')
    doc.setFont(NOTO_FONT_FAMILY, 'normal')
    return NOTO_FONT_FAMILY
  } catch (e) {
    console.error(`[${logTag}] NotoSans failed:`, e)
    doc.setFont('helvetica', 'normal')
    return 'helvetica'
  }
}
