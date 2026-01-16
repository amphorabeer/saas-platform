import { useEffect } from 'react'
import { useBatchStore } from '@/store'


interface UseBatchesOptions {
  status?: string
  autoFetch?: boolean
}

export function useBatches(options: UseBatchesOptions = {}) {
  const { autoFetch = true, status } = options
  
  const batches = useBatchStore((state) => state.batches)
  const listStatus = useBatchStore((state) => state.listStatus)
  const error = useBatchStore((state) => state.error)
  const fetchBatches = useBatchStore((state) => state.fetchBatches)

  useEffect(() => {
    if (autoFetch && listStatus === 'idle') {
      fetchBatches({ status: status as any })
    }
  }, [autoFetch, listStatus, fetchBatches, status])

  return {
    batches,
    isLoading: listStatus === 'loading',
    isError: listStatus === 'error',
    error,
    refetch: () => fetchBatches({ status: status as any }),
  }
}

export function useBatch(id: string | null) {
  const selectedBatch = useBatchStore((state) => state.selectedBatch)
  const detailStatus = useBatchStore((state) => state.detailStatus)
  const error = useBatchStore((state) => state.error)
  const fetchBatch = useBatchStore((state) => state.fetchBatch)

  useEffect(() => {
    if (id && (!selectedBatch || selectedBatch.id !== id)) {
      fetchBatch(id)
    }
  }, [id, selectedBatch, fetchBatch])

  return {
    batch: selectedBatch,
    isLoading: detailStatus === 'loading',
    isError: detailStatus === 'error',
    error,
    refetch: () => id && fetchBatch(id),
  }
}









