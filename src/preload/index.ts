import { contextBridge, ipcRenderer, webUtils } from "electron"

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

contextBridge.exposeInMainWorld("electron", {
  // Get the full file path from a dropped file
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  // Storage API
  storage: {
    read: (): Promise<AppStorageData> => ipcRenderer.invoke("storage:read"),
    write: (data: AppStorageData): Promise<boolean> => ipcRenderer.invoke("storage:write", data),

    getCurrentView: (): Promise<string | null> => ipcRenderer.invoke("storage:getCurrentView"),
    setCurrentView: (view: string | null): Promise<boolean> =>
      ipcRenderer.invoke("storage:setCurrentView", view),

    getLinkedEnvironments: (): Promise<LinkedEnvironment[]> =>
      ipcRenderer.invoke("storage:getLinkedEnvironments"),
    addLinkedEnvironment: (env: LinkedEnvironment): Promise<boolean> =>
      ipcRenderer.invoke("storage:addLinkedEnvironment", env),
    updateLinkedEnvironment: (
      filepath: string,
      updates: Partial<LinkedEnvironment>
    ): Promise<boolean> =>
      ipcRenderer.invoke("storage:updateLinkedEnvironment", filepath, updates),
    removeLinkedEnvironment: (filepath: string): Promise<boolean> =>
      ipcRenderer.invoke("storage:removeLinkedEnvironment", filepath),
    setEnvironmentOpen: (filepath: string, isOpen: boolean): Promise<boolean> =>
      ipcRenderer.invoke("storage:setEnvironmentOpen", filepath, isOpen),
    clear: (): Promise<boolean> => ipcRenderer.invoke("storage:clear"),
  },
})
