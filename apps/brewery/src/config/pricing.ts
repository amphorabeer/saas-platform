// Keg deposit prices by size (in GEL)
export const KEG_DEPOSIT_PRICES: Record<number, number> = {
  20: 100,  // 20L კეგი = 100₾ დეპოზიტი
  30: 150,  // 30L კეგი = 150₾ დეპოზიტი
  50: 200,  // 50L კეგი = 200₾ დეპოზიტი
}

// Keg deposit prices by package type
export const KEG_DEPOSITS: Record<string, number> = {
  KEG_50: 200,
  KEG_30: 150,
  KEG_20: 100,
}

// Keg deposit prices by size (alias for consistency)
export const KEG_DEPOSIT_BY_SIZE: Record<number, number> = {
  50: 200,
  30: 150,
  20: 100,
}

/**
 * Get keg deposit price by size
 * @param size - Keg size in liters (20, 30, or 50)
 * @returns Deposit amount in GEL
 */
export const getKegDeposit = (size: number): number => {
  return KEG_DEPOSIT_PRICES[size] || 150 // default 150₾
}

/**
 * Get keg deposit by size (alias)
 * @param size - Keg size in liters (20, 30, or 50)
 * @returns Deposit amount in GEL
 */
export function getKegDepositBySize(size: number): number {
  return KEG_DEPOSIT_BY_SIZE[size] || 150
}

/**
 * Extract keg size from package type
 * @param packageType - Package type string (e.g., "KEG_30", "KEG_50")
 * @returns Keg size in liters, or null if not a keg
 */
export const getKegSizeFromPackageType = (packageType: string): number | null => {
  if (!packageType.startsWith('KEG_')) {
    return null
  }
  
  const sizeMatch = packageType.match(/KEG_(\d+)/)
  if (sizeMatch) {
    return parseInt(sizeMatch[1], 10)
  }
  
  return null
}

/**
 * Get keg deposit from package type
 * @param packageType - Package type string (e.g., "KEG_30", "KEG_50")
 * @returns Deposit amount in GEL, or 0 if not a keg
 */
export function getKegDepositFromPackageType(packageType: string): number {
  return KEG_DEPOSITS[packageType] || 0
}

/**
 * Check if package type is a keg
 * @param packageType - Package type string
 * @returns true if package type is a keg, false otherwise
 */
export function isKegPackageType(packageType: string): boolean {
  return packageType.startsWith('KEG')
}

