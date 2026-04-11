import { jsPDF } from 'jspdf'
import { NOTO_SANS_BASE64 } from '@/lib/noto-sans-font'

const FONT_VFS = 'NotoSans-Regular.ttf'
export const NOTO_FONT_FAMILY = 'NotoSans'

/** Registers bundled Noto Sans for Georgian; returns font family name for jsPDF / autoTable. */
export function registerNotoSansOnce(doc: jsPDF, logTag = 'PDF'): string {
  try {
    const b64 = NOTO_SANS_BASE64.replace(/\s/g, '')
    const binary = Buffer.from(b64, 'base64').toString('binary')
    doc.addFileToVFS(FONT_VFS, binary)
    doc.addFont(FONT_VFS, NOTO_FONT_FAMILY, 'normal')
    doc.setFont(NOTO_FONT_FAMILY, 'normal')
    return NOTO_FONT_FAMILY
  } catch (e) {
    console.warn(`[${logTag}] NotoSans not loaded, using helvetica:`, e)
    doc.setFont('helvetica', 'normal')
    return 'helvetica'
  }
}
