export interface TaxBreakdown {
  gross: number
  net: number
  taxes: Array<{ name: string; rate: number; amount: number }>
  totalTax: number
}

/**
 * Calculate tax breakdown from gross amount (TAX INCLUSIVE)
 * Prices INCLUDE taxes. This function shows the breakdown for transparency.
 * 
 * @param grossAmount - The total amount including all taxes
 * @returns Tax breakdown with net amount, individual taxes, and total tax
 */
export const calculateTaxBreakdown = (grossAmount: number): TaxBreakdown => {
  // Load tax rates from Settings
  let taxes: Array<{ id?: string; name: string; rate: number; type?: string; value?: number }> = [
    { id: '1', name: 'VAT', rate: 18 },
    { id: '2', name: 'Service', rate: 10 }
  ]

  if (typeof window !== 'undefined') {
    const savedTaxes = localStorage.getItem('hotelTaxes')
    if (savedTaxes) {
      try {
        const parsed = JSON.parse(savedTaxes)
        
        // Handle both array and object formats
        if (Array.isArray(parsed)) {
          taxes = parsed.map((t: any) => ({
            name: t.name || t.type || 'Tax',
            rate: t.rate || t.value || 0
          }))
        } else if (typeof parsed === 'object' && parsed !== null) {
          // Convert object to array format
          taxes = Object.entries(parsed).map(([key, value]: [string, any]) => ({
            name: key,
            rate: typeof value === 'number' ? value : (value?.rate || value?.value || 0)
          }))
        }
      } catch (e) {
        console.error('Error loading taxes:', e)
      }
    }
  }

  // Calculate total tax rate
  const totalTaxRate = taxes.reduce((sum, t) => sum + (t.rate || 0), 0)

  // Tax Inclusive: Net = Gross / (1 + totalRate)
  if (grossAmount === 0 || totalTaxRate === 0) {
    return {
      gross: grossAmount,
      net: grossAmount,
      taxes: [],
      totalTax: 0
    }
  }

  const divisor = 1 + (totalTaxRate / 100)
  const netAmount = grossAmount / divisor

  // Calculate each tax
  const taxDetails = taxes
    .filter(t => (t.rate || 0) > 0)
    .map(t => ({
      name: t.name,
      rate: t.rate || 0,
      amount: Math.round(netAmount * ((t.rate || 0) / 100) * 100) / 100
    }))

  const totalTax = taxDetails.reduce((sum, t) => sum + t.amount, 0)

  return {
    gross: grossAmount,
    net: Math.round(netAmount * 100) / 100,
    taxes: taxDetails,
    totalTax: Math.round(totalTax * 100) / 100
  }
}

