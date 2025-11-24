import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { EnvEntry } from "@/renderer/types/env"

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
  addFile: (path: string, name: string, entries: EnvEntry[]) => string
  removeFile: (id: string) => void
  setActiveFile: (id: string | null) => void
  updateFileEntries: (id: string, entries: EnvEntry[]) => void
  markFileDirty: (id: string, isDirty: boolean) => void
  toggleSidebar: () => void
  getActiveFile: () => LoadedFile | null
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

  const addFile = useCallback((path: string, name: string, entries: EnvEntry[]): string => {
    const id = generateId()
    setState((prev) => ({
      ...prev,
      files: [...prev.files, { id, path, name, entries, isDirty: false }],
      activeFileId: id,
    }))
    return id
  }, [])

  const removeFile = useCallback((id: string) => {
    setState((prev) => {
      const newFiles = prev.files.filter((f) => f.id !== id)
      const newActiveId = prev.activeFileId === id
        ? (newFiles.length > 0 ? newFiles[0].id : null)
        : prev.activeFileId
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
