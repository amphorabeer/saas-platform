/**
 * Canonical Manufacturer Normalization
 * Single source of truth for manufacturer name standardization
 */

export const MANUFACTURER_ALIASES: Record<string, string> = {
  // BestMalz variants
  "bestmalz": "BestMalz",
  "best malz": "BestMalz",
  "bestmalz®": "BestMalz",
  "bestmaltz": "BestMalz",
  "bestmalz gmbh": "BestMalz",

  // Weyermann variants
  "weyermann": "Weyermann",
  "weyermann®": "Weyermann",
  "weyermann malz": "Weyermann",
  "weyermann malting": "Weyermann",

  // Castle Malting variants
  "castle malting": "Castle Malting",
  "castlemalting": "Castle Malting",
  "castle": "Castle Malting",

  // IREKS variants
  "ireks": "IREKS",
  "ireks malz": "IREKS",
  "ireks malting": "IREKS",

  // Dingemans variants
  "dingemans": "Dingemans",
  "dingemans malt": "Dingemans",

  // Crisp variants
  "crisp": "Crisp",
  "crisp malting": "Crisp",

  // Simpsons variants
  "simpsons": "Simpsons",
  "simpsons malt": "Simpsons",

  // Rahr variants
  "rahr": "Rahr",
  "rahr malting": "Rahr",

  // Avangard variants
  "avangard": "Avangard",
  "avangard malz": "Avangard",
  "avangard malting": "Avangard",

  // Boortmalt variants
  "boortmalt": "Boortmalt",
  "boortmalt group": "Boortmalt",

  // Viking Malt variants
  "viking malt": "Viking Malt",
  "viking": "Viking Malt",

  // Swaen variants
  "swaen": "Swaen",
  "de swaen": "Swaen",

  // Soufflet variants
  "soufflet": "Soufflet",
  "malteries soufflet": "Soufflet",
  "soufflet malt": "Soufflet",

  // Franco-Belges variants
  "franco-belges": "Franco-Belges Malterie",
  "franco belges": "Franco-Belges Malterie",
  "franco-belges malterie": "Franco-Belges Malterie",

  // Van Roessel variants
  "van roessel": "Van Roessel",
  "van roessel malting": "Van Roessel",

  // Generic
  "generic": "Generic",
  "unknown": "Generic",
  "": "Generic",
}

/**
 * Normalize manufacturer name to canonical form
 * @param input - Raw manufacturer name (producer/supplier/manufacturer field)
 * @returns Canonical manufacturer name or null if empty
 */
export function normalizeManufacturer(input?: string | null): string | null {
  const raw = (input ?? "").trim()
  if (!raw) return null
  
  const key = raw.toLowerCase()
  const canonical = MANUFACTURER_ALIASES[key]
  
  if (canonical) {
    return canonical
  }
  
  // Fallback: Title case the original (capitalize first letter of each word)
  return raw
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Get all canonical manufacturers (for validation/testing)
 */
export function getCanonicalManufacturers(): string[] {
  const manufacturers = new Set<string>()
  Object.values(MANUFACTURER_ALIASES).forEach(canonical => {
    manufacturers.add(canonical)
  })
  return Array.from(manufacturers).sort()
}
