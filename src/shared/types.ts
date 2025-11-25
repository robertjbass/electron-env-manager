// Shared types used by both main and renderer processes

export type LinkedEnvironment = {
  projectName: string
  envName: string
  displayName?: string // Optional custom display name for renaming
  filepath: string
  isOpen: boolean
}

export type AppStorageData = {
  currentView: string | null
  linkedEnvironments: LinkedEnvironment[]
}

export type ExportFormat = "env" | "json" | "shell"

export type FileDialogResult = {
  canceled: boolean
  filePath?: string
  filePaths?: string[]
}

export type SaveDialogOptions = {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}

export type OpenDialogOptions = {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
  properties?: Array<"openFile" | "openDirectory" | "multiSelections">
}
