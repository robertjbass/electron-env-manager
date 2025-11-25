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

export type ElectronAPI = {
  getPathForFile: (file: File) => string
  readFile: (filepath: string) => Promise<string>
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
