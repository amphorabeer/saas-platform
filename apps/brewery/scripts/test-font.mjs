import { jsPDF } from 'jspdf'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Read the noto-sans-font file
const __dir = dirname(fileURLToPath(import.meta.url))
const fontFile = join(__dir, '../src/lib/noto-sans-font.ts')
const content = readFileSync(fontFile, 'utf8')
const match = content.match(/NOTO_SANS_BASE64\s*=\s*"([^"]{100})/)
console.log('Base64 starts with:', match?.[1]?.slice(0, 50))

// Test 1: latin1
try {
  const doc1 = new jsPDF()
  const b64 = 'AAEAAAASAQAABAAgR0RFRg' // just a test prefix
  const bin = Buffer.from(b64, 'base64').toString('latin1')
  console.log('latin1 first 10 chars:', [...bin.slice(0,10)].map(c=>c.charCodeAt(0)))
} catch(e) { console.log('latin1 error:', e.message) }

// Test 2: binary  
try {
  const b64 = 'AAEAAAASAQAABAAgR0RFRg'
  const bin = Buffer.from(b64, 'base64').toString('binary')
  console.log('binary first 10 chars:', [...bin.slice(0,10)].map(c=>c.charCodeAt(0)))
} catch(e) { console.log('binary error:', e.message) }

// Test 3: direct base64
console.log('b64 prefix:', 'AAEAAAASAQAABAAgR0RFRg'.slice(0,10))
