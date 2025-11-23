import { app, BrowserWindow, shell } from "electron"
import { join } from "path"
import { is } from "@electron-toolkit/utils"
import { autoUpdater } from "electron-updater"

function createWindow(): void {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Required for webUtils.getPathForFile
    },
  })

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
