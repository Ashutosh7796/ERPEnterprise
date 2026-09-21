import { useCallback } from 'react'
import type { GridApi } from 'ag-grid-community'

export function useGridStatePersistence(persistenceKey?: string) {
  const saveState = useCallback(
    (api: GridApi) => {
      if (!persistenceKey || !api) return
      try {
        const columnState = api.getColumnState()
        localStorage.setItem(`erp_grid_state_${persistenceKey}`, JSON.stringify(columnState))
      } catch (err) {
        console.warn('Failed to save grid column state:', err)
      }
    },
    [persistenceKey]
  )

  const restoreState = useCallback(
    (api: GridApi) => {
      if (!persistenceKey || !api) return
      try {
        const saved = localStorage.getItem(`erp_grid_state_${persistenceKey}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            api.applyColumnState({
              state: parsed,
              applyOrder: true,
            })
          }
        }
      } catch (err) {
        console.warn('Failed to restore grid column state:', err)
      }
    },
    [persistenceKey]
  )

  const resetState = useCallback(
    (api: GridApi) => {
      if (!persistenceKey || !api) return
      try {
        localStorage.removeItem(`erp_grid_state_${persistenceKey}`)
        api.resetColumnState()
      } catch (err) {
        console.warn('Failed to reset grid column state:', err)
      }
    },
    [persistenceKey]
  )

  return { saveState, restoreState, resetState }
}
