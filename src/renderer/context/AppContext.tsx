import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { EnvEntry } from "@/renderer/types/env"
import type { LinkedEnvironment } from "@/renderer/types/electron"
import { parseEnvString } from "@/renderer/utils/envParser"
import { entriesToEnvString, formatEntries, getExtensionForFormat, type ExportFormat } from "@/renderer/utils/fileFormatter"

type LoadedFile = {
  id: string
  path: string
  name: string
  displayName?: string
  entries: EnvEntry[]
  isDirty: boolean
  originalContent?: string // Track original content for sync detection
}

type AppState = {
  files: LoadedFile[]
  activeFileId: string | null
  sidebarCollapsed: boolean
}

type AppContextValue = {
  state: AppState
  addFile: (path: string, name: string, entries: EnvEntry[], displayName?: string) => Promise<string>
  removeFile: (id: string) => Promise<void>
  setActiveFile: (id: string | null) => void
  updateFileEntries: (id: string, entries: EnvEntry[]) => void
  markFileDirty: (id: string, isDirty: boolean) => void
  toggleSidebar: () => void
  getActiveFile: () => LoadedFile | null
  // File operations
  saveFile: (id: string) => Promise<boolean>
  saveFileAs: (id: string, format?: ExportFormat) => Promise<boolean>
  exportFile: (id: string, format: ExportFormat) => Promise<boolean>
  reloadFile: (id: string) => Promise<boolean>
  importFile: () => Promise<string | null>
  cloneFile: (id: string) => Promise<string | null>
  syncFileFromDisk: (id: string) => Promise<{ changed: boolean; content?: string }>
  // Storage methods
  linkedEnvironments: LinkedEnvironment[]
  addLinkedEnvironment: (env: LinkedEnvironment) => Promise<void>
  removeLinkedEnvironment: (filepath: string) => Promise<void>
  updateLinkedEnvironment: (filepath: string, updates: Partial<LinkedEnvironment>) => Promise<void>
  loadLinkedEnvironments: () => Promise<void>
  // Rename
  renameFile: (id: string, newDisplayName: string) => Promise<void>
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

  // Load linked environments and restore open files on mount
  useEffect(() => {
    const loadStorage = async () => {
      try {
        const environments = await window.electron.storage.getLinkedEnvironments()
        setLinkedEnvironments(environments)

        // Restore open files
        const openEnvironments = environments.filter((env) => env.isOpen)
        if (openEnvironments.length === 0) return

        const loadedFiles: LoadedFile[] = []

        for (const env of openEnvironments) {
          try {
            // Read the file from disk
            const content = await window.electron.readFile(env.filepath)
            // Parse it
            const entries = parseEnvString(content)

            loadedFiles.push({
              id: generateId(),
              path: env.filepath,
              name: env.envName,
              displayName: env.displayName,
              entries,
              isDirty: false,
              originalContent: content,
            })
          } catch (error) {
            console.error(`Failed to load file ${env.filepath}:`, error)
          }
        }

        if (loadedFiles.length > 0) {
          // Get the last active view
          const currentView = await window.electron.storage.getCurrentView()
          const activeFile = loadedFiles.find((f) => f.path === currentView) || loadedFiles[0]

          setState((prev) => ({
            ...prev,
            files: loadedFiles,
            activeFileId: activeFile.id,
          }))
        }
      } catch (error) {
        console.error("Failed to load linked environments:", error)
      }
    }
    loadStorage()
  }, [])

  // Storage methods - defined first since other callbacks depend on them
  const loadLinkedEnvironments = useCallback(async () => {
    try {
      const environments = await window.electron.storage.getLinkedEnvironments()
      setLinkedEnvironments(environments)
    } catch (error) {
      console.error("Failed to load linked environments:", error)
    }
  }, [])

  const addFile = useCallback(async (path: string, name: string, entries: EnvEntry[], displayName?: string): Promise<string> => {
    const id = generateId()
    const content = entriesToEnvString(entries)

    setState((prev) => ({
      ...prev,
      files: [...prev.files, { id, path, name, displayName, entries, isDirty: false, originalContent: content }],
      activeFileId: id,
    }))

    // Add to linked environments
    try {
      await window.electron.storage.addLinkedEnvironment({
        projectName: name.replace(/\.env.*$/, ""), // Extract project name from file name
        envName: name,
        displayName,
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

  // File operations
  const saveFile = useCallback(async (id: string): Promise<boolean> => {
    const file = state.files.find((f) => f.id === id)
    if (!file || !file.path) return false

    try {
      const content = entriesToEnvString(file.entries)
      const success = await window.electron.writeFile(file.path, content)

      if (success) {
        setState((prev) => ({
          ...prev,
          files: prev.files.map((f) =>
            f.id === id ? { ...f, isDirty: false, originalContent: content } : f
          ),
        }))
      }

      return success
    } catch (error) {
      console.error("Failed to save file:", error)
      return false
    }
  }, [state.files])

  const saveFileAs = useCallback(async (id: string, format: ExportFormat = "env"): Promise<boolean> => {
    const file = state.files.find((f) => f.id === id)
    if (!file) return false

    try {
      const extension = getExtensionForFormat(format)
      const result = await window.electron.showSaveDialog({
        title: "Save As",
        defaultPath: file.path || `environment.${extension}`,
        filters: [
          { name: "Environment Files", extensions: ["env"] },
          { name: "JSON Files", extensions: ["json"] },
          { name: "Shell Scripts", extensions: ["sh"] },
          { name: "All Files", extensions: ["*"] },
        ],
      })

      if (result.canceled || !result.filePath) return false

      const content = formatEntries(file.entries, format)
      const success = await window.electron.writeFile(result.filePath, content)

      if (success && format === "env") {
        // Update the file path if saved as env
        const fileInfo = await window.electron.getFileInfo(result.filePath)
        setState((prev) => ({
          ...prev,
          files: prev.files.map((f) =>
            f.id === id ? {
              ...f,
              path: result.filePath!,
              name: fileInfo.name,
              isDirty: false,
              originalContent: content
            } : f
          ),
        }))

        // Update linked environment
        await window.electron.storage.addLinkedEnvironment({
          projectName: fileInfo.name.replace(/\.env.*$/, ""),
          envName: fileInfo.name,
          displayName: file.displayName,
          filepath: result.filePath,
          isOpen: true,
        })
        await loadLinkedEnvironments()
      }

      return success
    } catch (error) {
      console.error("Failed to save file as:", error)
      return false
    }
  }, [state.files, loadLinkedEnvironments])

  const exportFile = useCallback(async (id: string, format: ExportFormat): Promise<boolean> => {
    const file = state.files.find((f) => f.id === id)
    if (!file) return false

    try {
      const extension = getExtensionForFormat(format)
      const baseName = file.name.replace(/\.[^/.]+$/, "")

      const result = await window.electron.showSaveDialog({
        title: `Export as ${format.toUpperCase()}`,
        defaultPath: `${baseName}.${extension}`,
        filters: [
          { name: `${format.toUpperCase()} Files`, extensions: [extension] },
          { name: "All Files", extensions: ["*"] },
        ],
      })

      if (result.canceled || !result.filePath) return false

      const content = formatEntries(file.entries, format)
      return await window.electron.writeFile(result.filePath, content)
    } catch (error) {
      console.error("Failed to export file:", error)
      return false
    }
  }, [state.files])

  const reloadFile = useCallback(async (id: string): Promise<boolean> => {
    const file = state.files.find((f) => f.id === id)
    if (!file || !file.path) return false

    try {
      const content = await window.electron.readFile(file.path)
      const entries = parseEnvString(content)

      setState((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.id === id ? { ...f, entries, isDirty: false, originalContent: content } : f
        ),
      }))

      return true
    } catch (error) {
      console.error("Failed to reload file:", error)
      return false
    }
  }, [state.files])

  const importFile = useCallback(async (): Promise<string | null> => {
    try {
      const result = await window.electron.showOpenDialog({
        title: "Import Environment File",
        filters: [
          { name: "Environment Files", extensions: ["env", "local", "development", "production", "test", "staging"] },
          { name: "All Files", extensions: ["*"] },
        ],
        properties: ["openFile"],
      })

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return null
      }

      const filePath = result.filePaths[0]

      // Check if already loaded
      const existingFile = state.files.find((f) => f.path === filePath)
      if (existingFile) {
        setActiveFile(existingFile.id)
        return existingFile.id
      }

      const content = await window.electron.readFile(filePath)
      const entries = parseEnvString(content)
      const fileInfo = await window.electron.getFileInfo(filePath)

      return await addFile(filePath, fileInfo.name, entries)
    } catch (error) {
      console.error("Failed to import file:", error)
      return null
    }
  }, [state.files, addFile, setActiveFile])

  // Clone/duplicate an environment file
  const cloneFile = useCallback(async (id: string): Promise<string | null> => {
    const file = state.files.find((f) => f.id === id)
    if (!file) return null

    try {
      // Generate suggested filename
      const baseName = file.name.replace(/\.env/, "")
      const suggestedName = file.path
        ? file.path.replace(file.name, `${baseName}.copy.env`)
        : `${baseName}.copy.env`

      const result = await window.electron.showSaveDialog({
        title: "Clone Environment File",
        defaultPath: suggestedName,
        filters: [
          { name: "Environment Files", extensions: ["env"] },
          { name: "All Files", extensions: ["*"] },
        ],
      })

      if (result.canceled || !result.filePath) return null

      // Write the cloned content
      const content = entriesToEnvString(file.entries)
      const success = await window.electron.writeFile(result.filePath, content)

      if (!success) return null

      // Load the cloned file
      const fileInfo = await window.electron.getFileInfo(result.filePath)
      const clonedEntries = file.entries.map((e) => ({ ...e, id: generateId() }))

      return await addFile(result.filePath, fileInfo.name, clonedEntries)
    } catch (error) {
      console.error("Failed to clone file:", error)
      return null
    }
  }, [state.files, addFile])

  const syncFileFromDisk = useCallback(async (id: string): Promise<{ changed: boolean; content?: string }> => {
    const file = state.files.find((f) => f.id === id)
    if (!file || !file.path) return { changed: false }

    try {
      const content = await window.electron.readFile(file.path)
      const changed = content !== file.originalContent
      return { changed, content }
    } catch (error) {
      console.error("Failed to check file sync:", error)
      return { changed: false }
    }
  }, [state.files])

  // Rename file display name
  const renameFile = useCallback(async (id: string, newDisplayName: string) => {
    const file = state.files.find((f) => f.id === id)
    if (!file) return

    setState((prev) => ({
      ...prev,
      files: prev.files.map((f) =>
        f.id === id ? { ...f, displayName: newDisplayName } : f
      ),
    }))

    // Update in storage
    if (file.path) {
      try {
        await window.electron.storage.updateLinkedEnvironment(file.path, { displayName: newDisplayName })
        await loadLinkedEnvironments()
      } catch (error) {
        console.error("Failed to update display name:", error)
      }
    }
  }, [state.files, loadLinkedEnvironments])

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
        saveFile,
        saveFileAs,
        exportFile,
        reloadFile,
        importFile,
        cloneFile,
        syncFileFromDisk,
        linkedEnvironments,
        addLinkedEnvironment,
        removeLinkedEnvironment,
        updateLinkedEnvironment,
        loadLinkedEnvironments,
        renameFile,
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
