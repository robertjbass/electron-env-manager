import type {
  LinkedEnvironment,
  AppStorageData,
  SaveDialogOptions,
  OpenDialogOptions,
  FileDialogResult,
} from "../../shared/types"

// Re-export for convenience
export type { LinkedEnvironment, AppStorageData }

export type FileChangeEvent = {
  filepath: string
  eventType: string
}

export type FileChangeCallback = (event: FileChangeEvent) => void

export type ElectronAPI = {
  getPathForFile: (file: File) => string
  readFile: (filepath: string) => Promise<string>
  writeFile: (filepath: string, content: string) => Promise<boolean>
  fileExists: (filepath: string) => Promise<boolean>
  getFileInfo: (filepath: string) => Promise<{ name: string; directory: string }>
  showSaveDialog: (options: SaveDialogOptions) => Promise<FileDialogResult>
  showOpenDialog: (options: OpenDialogOptions) => Promise<FileDialogResult>
  watchFile: (filepath: string, callback: FileChangeCallback) => Promise<boolean>
  unwatchFile: (filepath: string) => Promise<boolean>
  storage: {
    read: () => Promise<AppStorageData>
    write: (data: AppStorageData) => Promise<boolean>
    getCurrentView: () => Promise<string | null>
    setCurrentView: (view: string | null) => Promise<boolean>
    getLinkedEnvironments: () => Promise<LinkedEnvironment[]>
    addLinkedEnvironment: (env: LinkedEnvironment) => Promise<boolean>
    updateLinkedEnvironment: (
      filepath: string,
      updates: Partial<LinkedEnvironment>
    ) => Promise<boolean>
    removeLinkedEnvironment: (filepath: string) => Promise<boolean>
    setEnvironmentOpen: (filepath: string, isOpen: boolean) => Promise<boolean>
    clear: () => Promise<boolean>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
