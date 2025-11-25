import { useCallback, useEffect, useState } from "react"
import type { AppStorageData, LinkedEnvironment } from "../types/electron"

export function useStorage() {
  const [storageData, setStorageData] = useState<AppStorageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load storage data on mount
  useEffect(() => {
    const loadStorage = async () => {
      try {
        const data = await window.electron.storage.read()
        setStorageData(data)
      } catch (error) {
        console.error("Failed to load storage:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStorage()
  }, [])

  const writeStorage = useCallback(async (data: AppStorageData): Promise<boolean> => {
    try {
      const success = await window.electron.storage.write(data)
      if (success) {
        setStorageData(data)
      }
      return success
    } catch (error) {
      console.error("Failed to write storage:", error)
      return false
    }
  }, [])

  const getCurrentView = useCallback(async (): Promise<string | null> => {
    try {
      return await window.electron.storage.getCurrentView()
    } catch (error) {
      console.error("Failed to get current view:", error)
      return null
    }
  }, [])

  const setCurrentView = useCallback(async (view: string | null): Promise<boolean> => {
    try {
      const success = await window.electron.storage.setCurrentView(view)
      if (success && storageData) {
        setStorageData({ ...storageData, currentView: view })
      }
      return success
    } catch (error) {
      console.error("Failed to set current view:", error)
      return false
    }
  }, [storageData])

  const getLinkedEnvironments = useCallback(async (): Promise<LinkedEnvironment[]> => {
    try {
      return await window.electron.storage.getLinkedEnvironments()
    } catch (error) {
      console.error("Failed to get linked environments:", error)
      return []
    }
  }, [])

  const addLinkedEnvironment = useCallback(
    async (env: LinkedEnvironment): Promise<boolean> => {
      try {
        const success = await window.electron.storage.addLinkedEnvironment(env)
        if (success && storageData) {
          const environments = await getLinkedEnvironments()
          setStorageData({ ...storageData, linkedEnvironments: environments })
        }
        return success
      } catch (error) {
        console.error("Failed to add linked environment:", error)
        return false
      }
    },
    [storageData, getLinkedEnvironments]
  )

  const updateLinkedEnvironment = useCallback(
    async (filepath: string, updates: Partial<LinkedEnvironment>): Promise<boolean> => {
      try {
        const success = await window.electron.storage.updateLinkedEnvironment(filepath, updates)
        if (success && storageData) {
          const environments = await getLinkedEnvironments()
          setStorageData({ ...storageData, linkedEnvironments: environments })
        }
        return success
      } catch (error) {
        console.error("Failed to update linked environment:", error)
        return false
      }
    },
    [storageData, getLinkedEnvironments]
  )

  const removeLinkedEnvironment = useCallback(
    async (filepath: string): Promise<boolean> => {
      try {
        const success = await window.electron.storage.removeLinkedEnvironment(filepath)
        if (success && storageData) {
          const environments = await getLinkedEnvironments()
          setStorageData({ ...storageData, linkedEnvironments: environments })
        }
        return success
      } catch (error) {
        console.error("Failed to remove linked environment:", error)
        return false
      }
    },
    [storageData, getLinkedEnvironments]
  )

  const setEnvironmentOpen = useCallback(
    async (filepath: string, isOpen: boolean): Promise<boolean> => {
      try {
        const success = await window.electron.storage.setEnvironmentOpen(filepath, isOpen)
        if (success && storageData) {
          const environments = await getLinkedEnvironments()
          setStorageData({ ...storageData, linkedEnvironments: environments })
        }
        return success
      } catch (error) {
        console.error("Failed to set environment open status:", error)
        return false
      }
    },
    [storageData, getLinkedEnvironments]
  )

  const clearStorage = useCallback(async (): Promise<boolean> => {
    try {
      const success = await window.electron.storage.clear()
      if (success) {
        setStorageData({ currentView: null, linkedEnvironments: [] })
      }
      return success
    } catch (error) {
      console.error("Failed to clear storage:", error)
      return false
    }
  }, [])

  return {
    storageData,
    isLoading,
    writeStorage,
    getCurrentView,
    setCurrentView,
    getLinkedEnvironments,
    addLinkedEnvironment,
    updateLinkedEnvironment,
    removeLinkedEnvironment,
    setEnvironmentOpen,
    clearStorage,
  }
}
