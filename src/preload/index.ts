import { contextBridge, ipcRenderer, webUtils } from "electron"
import type {
  LinkedEnvironment,
  AppStorageData,
  SaveDialogOptions,
  OpenDialogOptions,
  FileDialogResult,
} from "../shared/types"

// Re-export types for convenience
export type { LinkedEnvironment, AppStorageData }

type FileChangeEvent = {
  filepath: string
  eventType: string
}

type FileChangeCallback = (event: FileChangeEvent) => void

// Store callbacks for file change events
const fileChangeCallbacks = new Map<string, FileChangeCallback>()

// Listen for file change events from main process
ipcRenderer.on("fs:fileChanged", (_event, data: FileChangeEvent) => {
  const callback = fileChangeCallbacks.get(data.filepath)
  if (callback) {
    callback(data)
  }
})

contextBridge.exposeInMainWorld("electron", {
  // Get the full file path from a dropped file
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  // File system API
  readFile: (filepath: string): Promise<string> =>
    ipcRenderer.invoke("fs:readFile", filepath),

  writeFile: (filepath: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke("fs:writeFile", filepath, content),

  fileExists: (filepath: string): Promise<boolean> =>
    ipcRenderer.invoke("fs:exists", filepath),

  getFileInfo: (filepath: string): Promise<{ name: string; directory: string }> =>
    ipcRenderer.invoke("fs:getFileInfo", filepath),

  showSaveDialog: (options: SaveDialogOptions): Promise<FileDialogResult> =>
    ipcRenderer.invoke("fs:showSaveDialog", options),

  showOpenDialog: (options: OpenDialogOptions): Promise<FileDialogResult> =>
    ipcRenderer.invoke("fs:showOpenDialog", options),

  // File watching
  watchFile: (filepath: string, callback: FileChangeCallback): Promise<boolean> => {
    fileChangeCallbacks.set(filepath, callback)
    return ipcRenderer.invoke("fs:watchFile", filepath)
  },

  unwatchFile: (filepath: string): Promise<boolean> => {
    fileChangeCallbacks.delete(filepath)
    return ipcRenderer.invoke("fs:unwatchFile", filepath)
  },

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
