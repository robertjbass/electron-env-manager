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
  type AppStorageData,
  type LinkedEnvironment,
} from "./db"

function setupStorageHandlers(): void {
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
  const win = new BrowserWindow({
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

  win.maximize()
  win.show()

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"))
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
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
