// Re-export shared types for backward compatibility
export type { LinkedEnvironment, AppStorageData } from "../../shared/types"

export const DEFAULT_STORAGE_DATA = {
  currentView: null,
  linkedEnvironments: [],
} as const
