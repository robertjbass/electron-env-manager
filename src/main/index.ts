import { app, BrowserWindow, shell, ipcMain } from "electron"
import { join } from "path"
import { is } from "@electron-toolkit/utils"
import { autoUpdater } from "electron-updater"
import {
  readStorage,
  writeStorage,
  getCurrentView,
  setCurrentView,
  getLinkedEnvironments,
  addLinkedEnvironment,
  updateLinkedEnvironment,
  removeLinkedEnvironment,
  setEnvironmentOpen,
  clearStorage,
} from "./db"
import {
  readFile,
  writeFile,
  fileExists,
  getFileInfo,
  showSaveDialog,
  showOpenDialog,
  watchFile,
  unwatchFile,
  unwatchAllFiles,
} from "./fileOperations"
import type {
  AppStorageData,
  LinkedEnvironment,
  SaveDialogOptions,
  OpenDialogOptions,
} from "../shared/types"

let mainWindow: BrowserWindow | null = null

function setupStorageHandlers(): void {
  // File operations
  ipcMain.handle("fs:readFile", (_event, filepath: string): string => {
    return readFile(filepath)
  })

  ipcMain.handle("fs:writeFile", (_event, filepath: string, content: string): boolean => {
    return writeFile(filepath, content)
  })

  ipcMain.handle("fs:exists", (_event, filepath: string): boolean => {
    return fileExists(filepath)
  })

  ipcMain.handle("fs:getFileInfo", (_event, filepath: string): { name: string; directory: string } => {
    return getFileInfo(filepath)
  })

  ipcMain.handle("fs:showSaveDialog", async (_event, options: SaveDialogOptions) => {
    return showSaveDialog(options)
  })

  ipcMain.handle("fs:showOpenDialog", async (_event, options: OpenDialogOptions) => {
    return showOpenDialog(options)
  })

  // File watching
  ipcMain.handle("fs:watchFile", (_event, filepath: string): boolean => {
    return watchFile(filepath, (eventType) => {
      // Send event to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("fs:fileChanged", { filepath, eventType })
      }
    })
  })

  ipcMain.handle("fs:unwatchFile", (_event, filepath: string): boolean => {
    return unwatchFile(filepath)
  })

  // Read/Write entire storage
  ipcMain.handle("storage:read", (): AppStorageData => {
    return readStorage()
  })

  ipcMain.handle("storage:write", (_event, data: AppStorageData): boolean => {
    return writeStorage(data)
  })

  // Current view operations
  ipcMain.handle("storage:getCurrentView", (): string | null => {
    return getCurrentView()
  })

  ipcMain.handle("storage:setCurrentView", (_event, view: string | null): boolean => {
    return setCurrentView(view)
  })

  // Linked environments operations
  ipcMain.handle("storage:getLinkedEnvironments", (): LinkedEnvironment[] => {
    return getLinkedEnvironments()
  })

  ipcMain.handle("storage:addLinkedEnvironment", (_event, env: LinkedEnvironment): boolean => {
    return addLinkedEnvironment(env)
  })

  ipcMain.handle(
    "storage:updateLinkedEnvironment",
    (_event, filepath: string, updates: Partial<LinkedEnvironment>): boolean => {
      return updateLinkedEnvironment(filepath, updates)
    }
  )

  ipcMain.handle("storage:removeLinkedEnvironment", (_event, filepath: string): boolean => {
    return removeLinkedEnvironment(filepath)
  })

  ipcMain.handle(
    "storage:setEnvironmentOpen",
    (_event, filepath: string, isOpen: boolean): boolean => {
      return setEnvironmentOpen(filepath, isOpen)
    }
  )

  ipcMain.handle("storage:clear", (): boolean => {
    return clearStorage()
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Required for webUtils.getPathForFile
    },
  })

  mainWindow.maximize()
  mainWindow.show()

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }
}

app.whenReady().then(() => {
  // Register IPC handlers for storage
  setupStorageHandlers()

  createWindow()

  // Check for updates in production
  if (!is.dev) {
    autoUpdater.checkForUpdatesAndNotify()
  }
})

app.on("window-all-closed", () => {
  unwatchAllFiles()
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
