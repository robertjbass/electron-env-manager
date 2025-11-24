import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { EnvEntry } from "@/renderer/types/env"
import type { LinkedEnvironment } from "@/renderer/types/electron"

type LoadedFile = {
  id: string
  path: string
  name: string
  entries: EnvEntry[]
  isDirty: boolean
}

type AppState = {
  files: LoadedFile[]
  activeFileId: string | null
  sidebarCollapsed: boolean
}

type AppContextValue = {
  state: AppState
  addFile: (path: string, name: string, entries: EnvEntry[]) => Promise<string>
  removeFile: (id: string) => Promise<void>
  setActiveFile: (id: string | null) => void
  updateFileEntries: (id: string, entries: EnvEntry[]) => void
  markFileDirty: (id: string, isDirty: boolean) => void
  toggleSidebar: () => void
  getActiveFile: () => LoadedFile | null
  // Storage methods
  linkedEnvironments: LinkedEnvironment[]
  addLinkedEnvironment: (env: LinkedEnvironment) => Promise<void>
  removeLinkedEnvironment: (filepath: string) => Promise<void>
  updateLinkedEnvironment: (filepath: string, updates: Partial<LinkedEnvironment>) => Promise<void>
  loadLinkedEnvironments: () => Promise<void>
}

const initialState: AppState = {
  files: [],
  activeFileId: null,
  sidebarCollapsed: false,
}

const AppContext = createContext<AppContextValue | null>(null)

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState)
  const [linkedEnvironments, setLinkedEnvironments] = useState<LinkedEnvironment[]>([])

  // Load linked environments on mount
  useEffect(() => {
    const loadStorage = async () => {
      try {
        const environments = await window.electron.storage.getLinkedEnvironments()
        setLinkedEnvironments(environments)
      } catch (error) {
        console.error("Failed to load linked environments:", error)
      }
    }
    loadStorage()
  }, [])

  const addFile = useCallback(async (path: string, name: string, entries: EnvEntry[]): Promise<string> => {
    const id = generateId()
    setState((prev) => ({
      ...prev,
      files: [...prev.files, { id, path, name, entries, isDirty: false }],
      activeFileId: id,
    }))

    // Add to linked environments
    try {
      await window.electron.storage.addLinkedEnvironment({
        projectName: name.replace(/\.env.*$/, ""), // Extract project name from file name
        envName: name,
        filepath: path,
        isOpen: true,
      })
      await loadLinkedEnvironments()
    } catch (error) {
      console.error("Failed to save linked environment:", error)
    }

    return id
  }, [loadLinkedEnvironments])

  const removeFile = useCallback(async (id: string) => {
    setState((prev) => {
      const fileToRemove = prev.files.find((f) => f.id === id)
      const newFiles = prev.files.filter((f) => f.id !== id)
      const newActiveId = prev.activeFileId === id
        ? (newFiles.length > 0 ? newFiles[0].id : null)
        : prev.activeFileId

      // Mark environment as closed in storage
      if (fileToRemove) {
        window.electron.storage.setEnvironmentOpen(fileToRemove.path, false)
          .catch((error) => console.error("Failed to update environment status:", error))
      }

      return {
        ...prev,
        files: newFiles,
        activeFileId: newActiveId,
      }
    })
  }, [])

  const setActiveFile = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, activeFileId: id }))
  }, [])

  const updateFileEntries = useCallback((id: string, entries: EnvEntry[]) => {
    setState((prev) => ({
      ...prev,
      files: prev.files.map((f) =>
        f.id === id ? { ...f, entries, isDirty: true } : f
      ),
    }))
  }, [])

  const markFileDirty = useCallback((id: string, isDirty: boolean) => {
    setState((prev) => ({
      ...prev,
      files: prev.files.map((f) =>
        f.id === id ? { ...f, isDirty } : f
      ),
    }))
  }, [])

  const toggleSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }))
  }, [])

  const getActiveFile = useCallback((): LoadedFile | null => {
    return state.files.find((f) => f.id === state.activeFileId) || null
  }, [state.files, state.activeFileId])

  // Storage methods
  const loadLinkedEnvironments = useCallback(async () => {
    try {
      const environments = await window.electron.storage.getLinkedEnvironments()
      setLinkedEnvironments(environments)
    } catch (error) {
      console.error("Failed to load linked environments:", error)
    }
  }, [])

  const addLinkedEnvironment = useCallback(async (env: LinkedEnvironment) => {
    try {
      const success = await window.electron.storage.addLinkedEnvironment(env)
      if (success) {
        await loadLinkedEnvironments()
      }
    } catch (error) {
      console.error("Failed to add linked environment:", error)
    }
  }, [loadLinkedEnvironments])

  const removeLinkedEnvironment = useCallback(async (filepath: string) => {
    try {
      const success = await window.electron.storage.removeLinkedEnvironment(filepath)
      if (success) {
        await loadLinkedEnvironments()
      }
    } catch (error) {
      console.error("Failed to remove linked environment:", error)
    }
  }, [loadLinkedEnvironments])

  const updateLinkedEnvironment = useCallback(async (filepath: string, updates: Partial<LinkedEnvironment>) => {
    try {
      const success = await window.electron.storage.updateLinkedEnvironment(filepath, updates)
      if (success) {
        await loadLinkedEnvironments()
      }
    } catch (error) {
      console.error("Failed to update linked environment:", error)
    }
  }, [loadLinkedEnvironments])

  // Persist active file to storage when it changes
  useEffect(() => {
    const syncActiveFile = async () => {
      const activeFile = getActiveFile()
      if (activeFile) {
        await window.electron.storage.setCurrentView(activeFile.path)
      } else {
        await window.electron.storage.setCurrentView(null)
      }
    }
    syncActiveFile()
  }, [state.activeFileId, getActiveFile])

  return (
    <AppContext.Provider
      value={{
        state,
        addFile,
        removeFile,
        setActiveFile,
        updateFileEntries,
        markFileDirty,
        toggleSidebar,
        getActiveFile,
        linkedEnvironments,
        addLinkedEnvironment,
        removeLinkedEnvironment,
        updateLinkedEnvironment,
        loadLinkedEnvironments,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === null) {
    throw new Error("useAppContext must be used within an AppContextProvider")
  }
  return context
}
