import { dialog, BrowserWindow } from "electron"
import { readFileSync, writeFileSync, watch, existsSync } from "fs"
import { basename, dirname } from "path"
import type {
  FileDialogResult,
  SaveDialogOptions,
  OpenDialogOptions,
} from "../shared/types"

// Store file watchers by filepath
const fileWatchers = new Map<string, ReturnType<typeof watch>>()

export function readFile(filepath: string): string {
  return readFileSync(filepath, "utf-8")
}

export function writeFile(filepath: string, content: string): boolean {
  try {
    writeFileSync(filepath, content, "utf-8")
    return true
  } catch (error) {
    console.error("Failed to write file:", error)
    return false
  }
}

export function fileExists(filepath: string): boolean {
  return existsSync(filepath)
}

export function getFileInfo(filepath: string): { name: string; directory: string } {
  return {
    name: basename(filepath),
    directory: dirname(filepath),
  }
}

export async function showSaveDialog(
  options: SaveDialogOptions
): Promise<FileDialogResult> {
  const win = BrowserWindow.getFocusedWindow()
  const result = await dialog.showSaveDialog(win!, {
    title: options.title || "Save File",
    defaultPath: options.defaultPath,
    filters: options.filters || [
      { name: "Environment Files", extensions: ["env"] },
      { name: "JSON Files", extensions: ["json"] },
      { name: "All Files", extensions: ["*"] },
    ],
  })

  return {
    canceled: result.canceled,
    filePath: result.filePath,
  }
}

export async function showOpenDialog(
  options: OpenDialogOptions
): Promise<FileDialogResult> {
  const win = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(win!, {
    title: options.title || "Open File",
    defaultPath: options.defaultPath,
    filters: options.filters || [
      { name: "Environment Files", extensions: ["env", "local", "development", "production", "test", "staging"] },
      { name: "All Files", extensions: ["*"] },
    ],
    properties: options.properties || ["openFile"],
  })

  return {
    canceled: result.canceled,
    filePaths: result.filePaths,
  }
}

export function watchFile(
  filepath: string,
  callback: (eventType: string) => void
): boolean {
  try {
    // Close existing watcher if any
    unwatchFile(filepath)

    const watcher = watch(filepath, (eventType) => {
      callback(eventType)
    })

    fileWatchers.set(filepath, watcher)
    return true
  } catch (error) {
    console.error("Failed to watch file:", error)
    return false
  }
}

export function unwatchFile(filepath: string): boolean {
  const watcher = fileWatchers.get(filepath)
  if (watcher) {
    watcher.close()
    fileWatchers.delete(filepath)
    return true
  }
  return false
}

export function unwatchAllFiles(): void {
  for (const [filepath, watcher] of fileWatchers) {
    watcher.close()
    fileWatchers.delete(filepath)
  }
}
