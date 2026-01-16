import { useEffect } from 'react'
import { useInventoryStore } from '@/store'

interface UseInventoryOptions {
  category?: string
  lowStock?: boolean
  autoFetch?: boolean
}

export function useInventory(options: UseInventoryOptions = {}) {
  const { autoFetch = true } = options
  
  const items = useInventoryStore((state) => state.items)
  const listStatus = useInventoryStore((state) => state.listStatus)
  const error = useInventoryStore((state) => state.error)
  const fetchItems = useInventoryStore((state) => state.fetchItems)
  const categoryFilter = useInventoryStore((state) => state.categoryFilter)
  const lowStockOnly = useInventoryStore((state) => state.lowStockOnly)

  useEffect(() => {
    if (autoFetch && listStatus === 'idle') {
      fetchItems({ category: options.category, lowStock: options.lowStock })
    }
  }, [autoFetch, listStatus, fetchItems, options.category, options.lowStock])

  return {
    items,
    isLoading: listStatus === 'loading',
    isError: listStatus === 'error',
    error,
    categoryFilter,
    lowStockOnly,
    refetch: () => fetchItems(),
  }
}









