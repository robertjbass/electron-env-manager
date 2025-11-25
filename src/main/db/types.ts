export type LinkedEnvironment = {
  projectName: string
  envName: string
  filepath: string
  isOpen: boolean
}

export type AppStorageData = {
  currentView: string | null
  linkedEnvironments: LinkedEnvironment[]
}

export const DEFAULT_STORAGE_DATA: AppStorageData = {
  currentView: null,
  linkedEnvironments: [],
}
