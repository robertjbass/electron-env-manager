import { app } from "electron"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import type { AppStorageData, LinkedEnvironment } from "../../shared/types"
import { DEFAULT_STORAGE_DATA } from "./types"

const STORAGE_FILE_NAME = "data.temp.json"

function getStoragePath(): string {
  // Use app.getPath('userData') for proper cross-platform storage
  // Falls back to app root in development
  const userDataPath = app.getPath("userData")
  return join(userDataPath, STORAGE_FILE_NAME)
}

export function readStorage(): AppStorageData {
  const storagePath = getStoragePath()

  if (!existsSync(storagePath)) {
    return { ...DEFAULT_STORAGE_DATA }
  }

  try {
    const data = readFileSync(storagePath, "utf-8")
    const parsed = JSON.parse(data) as AppStorageData
    return {
      currentView: parsed.currentView ?? null,
      linkedEnvironments: parsed.linkedEnvironments ?? [],
    }
  } catch {
    return { ...DEFAULT_STORAGE_DATA }
  }
}

export function writeStorage(data: AppStorageData): boolean {
  const storagePath = getStoragePath()

  try {
    writeFileSync(storagePath, JSON.stringify(data, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

export function getCurrentView(): string | null {
  const data = readStorage()
  return data.currentView
}

export function setCurrentView(view: string | null): boolean {
  const data = readStorage()
  data.currentView = view
  return writeStorage(data)
}

export function getLinkedEnvironments(): LinkedEnvironment[] {
  const data = readStorage()
  return data.linkedEnvironments
}

export function addLinkedEnvironment(env: LinkedEnvironment): boolean {
  const data = readStorage()

  // Check if environment with same filepath already exists
  const existingIndex = data.linkedEnvironments.findIndex(
    (e) => e.filepath === env.filepath
  )

  if (existingIndex >= 0) {
    // Update existing
    data.linkedEnvironments[existingIndex] = env
  } else {
    // Add new
    data.linkedEnvironments.push(env)
  }

  return writeStorage(data)
}

export function updateLinkedEnvironment(
  filepath: string,
  updates: Partial<LinkedEnvironment>
): boolean {
  const data = readStorage()

  const index = data.linkedEnvironments.findIndex((e) => e.filepath === filepath)

  if (index < 0) {
    return false
  }

  data.linkedEnvironments[index] = {
    ...data.linkedEnvironments[index],
    ...updates,
  }

  return writeStorage(data)
}

export function removeLinkedEnvironment(filepath: string): boolean {
  const data = readStorage()
  data.linkedEnvironments = data.linkedEnvironments.filter(
    (e) => e.filepath !== filepath
  )
  return writeStorage(data)
}

export function setEnvironmentOpen(filepath: string, isOpen: boolean): boolean {
  return updateLinkedEnvironment(filepath, { isOpen })
}

export function clearStorage(): boolean {
  return writeStorage({ ...DEFAULT_STORAGE_DATA })
}
