import { contextBridge, webUtils } from "electron"

contextBridge.exposeInMainWorld("electron", {
  // Get the full file path from a dropped file
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
})
