type BatchStatus = string
type PackageType = string

// ============================================
// Types
// ============================================

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  correlationId?: string
}

export interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
  status: number
}

// Batch types
export interface BatchListItem {
  id: string
  batchNumber: string
  status: BatchStatus
  volume: number
  recipe: { id: string; name: string; style: string }
  tank: { id: string; name: string; type: string } | null
  createdAt: string
}

export interface BatchDetail extends BatchListItem {
  targetOg: number | null
  actualOg: number | null
  currentGravity: number | null
  finalGravity: number | null
  calculatedAbv: number | null
  plannedDate: string
  brewedAt: string | null
  fermentationStartedAt: string | null
  conditioningStartedAt: string | null
  readyAt: string | null
  completedAt: string | null
  notes: string | null
  ingredients: BatchIngredient[]
  gravityReadings: GravityReading[]
  timeline: TimelineEvent[]
}

export interface BatchIngredient {
  id: string
  name: string
  category: string
  plannedAmount: number
  actualAmount: number | null
  unit: string
}

export interface GravityReading {
  id: string
  gravity: number
  temperature: number
  notes: string | null
  recordedAt: string
}

export interface TimelineEvent {
  id: string
  type: string
  title: string
  description: string | null
  createdAt: string
}

export interface CreateBatchInput {
  recipeId: string
  tankId: string
  volume: number
  plannedDate: string
  notes?: string
}

export interface CreateBatchResult {
  batch: { id: string; batchNumber: string; status: string }
  ingredientsConsumed: Array<{ itemId: string; name: string; quantity: number; unit: string }>
  tank: { id: string; name: string }
}

// Inventory types
export interface InventoryItem {
  id: string
  sku: string
  name: string
  category: string
  unit: string
  balance: number
  onHand: number // Alias for balance
  reorderPoint: number | null
  supplier: string | null
  costPerUnit: number | null
  totalValue: number | null
  isLowStock: boolean
  isCritical: boolean
  isOutOfStock: boolean
  updatedAt: string
}

export interface InventoryDetail extends InventoryItem {
  ledger: LedgerEntry[]
}

export interface LedgerEntry {
  id: string
  quantity: number
  type: string
  notes: string | null
  createdAt: string
  batch: { id: string; batchNumber: string } | null
}

// ============================================
// API Client
// ============================================

class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor() {
    this.baseUrl = '/api'
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  /**
   * Generate idempotency key for mutations
   */
  private generateIdempotencyKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Make API request with error handling
   */
  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown
      idempotent?: boolean
      signal?: AbortSignal
    }
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = { ...this.defaultHeaders }
    
    // Add idempotency key for POST/PUT/PATCH
    if (options?.idempotent && ['POST', 'PUT', 'PATCH'].includes(method)) {
      headers['x-idempotency-key'] = this.generateIdempotencyKey()
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: options?.signal,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          data: null,
          error: data.error || { code: 'UNKNOWN_ERROR', message: 'An error occurred' },
          status: response.status,
        }
      }

      return {
        data,
        error: null,
        status: response.status,
      }
    } catch (error) {
      // Network error or abort
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          data: null,
          error: { code: 'ABORTED', message: 'Request was cancelled' },
          status: 0,
        }
      }

      return {
        data: null,
        error: { code: 'NETWORK_ERROR', message: 'Network error occurred' },
        status: 0,
      }
    }
  }

  // ============================================
  // Batch endpoints
  // ============================================

  async getBatches(params?: { status?: BatchStatus; limit?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    
    const query = searchParams.toString()
    return this.request<{ batches: BatchListItem[] }>(
      'GET',
      `/batches${query ? `?${query}` : ''}`
    )
  }

  async getBatch(id: string) {
    return this.request<{ batch: BatchDetail }>('GET', `/batches/${id}`)
  }

  async createBatch(input: CreateBatchInput) {
    return this.request<CreateBatchResult>('POST', '/batches', {
      body: input,
      idempotent: true,
    })
  }

  async startBrewing(batchId: string, actualOg?: number) {
    return this.request<{ success: boolean }>('POST', `/batches/${batchId}/start-brewing`, {
      body: { actualOg },
    })
  }

  async startFermentation(batchId: string, tankId?: string) {
    return this.request<{ success: boolean }>('POST', `/batches/${batchId}/start-fermentation`, {
      body: { tankId },
    })
  }

  async transferToConditioning(batchId: string, newTankId?: string) {
    return this.request<{ success: boolean }>('POST', `/batches/${batchId}/transfer`, {
      body: { newTankId },
    })
  }

  async markReady(batchId: string, finalGravity?: number) {
    return this.request<{ success: boolean }>('POST', `/batches/${batchId}/ready`, {
      body: { finalGravity },
    })
  }

  async packageBatch(
    batchId: string,
    input: { packageType: PackageType; quantity: number; lotNumber?: string; notes?: string }
  ) {
    return this.request<{ packagingRunId: string; finishedGoodsSku: string }>(
      'POST',
      `/batches/${batchId}/package`,
      { body: input, idempotent: true }
    )
  }

  async cancelBatch(batchId: string, reason: string) {
    return this.request<{ success: boolean }>('POST', `/batches/${batchId}/cancel`, {
      body: { reason },
    })
  }

  async addGravityReading(
    batchId: string,
    input: { gravity: number; temperature: number; notes?: string }
  ) {
    return this.request<{ success: boolean }>('POST', `/batches/${batchId}/gravity`, {
      body: input,
    })
  }

  // ============================================
  // Inventory endpoints
  // ============================================

  async getInventory(params?: { category?: string; lowStock?: boolean; search?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set('category', params.category)
    if (params?.lowStock) searchParams.set('lowStock', 'true')
    if (params?.search) searchParams.set('search', params.search)
    
    const query = searchParams.toString()
    return this.request<{ items: InventoryItem[] }>(
      'GET',
      `/inventory${query ? `?${query}` : ''}`
    )
  }

  async getInventoryItem(id: string) {
    return this.request<{ item: InventoryItem; ledger: LedgerEntry[] }>(
      'GET',
      `/inventory/${id}`
    )
  }

  async createInventoryItem(input: {
    sku: string
    name: string
    category: string
    unit: string
    reorderPoint?: number
    supplier?: string
    costPerUnit?: number
  }) {
    return this.request<{ item: InventoryItem }>('POST', '/inventory', {
      body: input,
    })
  }

  async updateInventoryItem(id: string, input: {
    name?: string
    reorderPoint?: number
    supplier?: string
    costPerUnit?: number
  }) {
    return this.request<{ item: InventoryItem }>('PUT', `/inventory/${id}`, {
      body: input,
    })
  }

  async recordPurchase(
    itemId: string,
    input: {
      quantity: number
      costPerUnit?: number
      supplier?: string
      lotNumber?: string
      notes?: string
    }
  ) {
    return this.request<{ entry: LedgerEntry; newBalance: number }>(
      'POST',
      `/inventory/${itemId}/purchase`,
      { body: input }
    )
  }

  async recordAdjustment(
    itemId: string,
    input: { newQuantity: number; reason: string }
  ) {
    return this.request<{ entry: LedgerEntry; newBalance: number; adjustment: number }>(
      'POST',
      `/inventory/${itemId}/adjust`,
      { body: input }
    )
  }

  async recordWaste(
    itemId: string,
    input: { quantity: number; reason: string }
  ) {
    return this.request<{ entry: LedgerEntry; newBalance: number }>(
      'POST',
      `/inventory/${itemId}/waste`,
      { body: input }
    )
  }
}

export const apiClient = new ApiClient()









