import type { EnvEntry } from "@/renderer/types/env"

/**
 * Convert entries to .env file format
 */
export function entriesToEnvString(entries: EnvEntry[]): string {
  return entries
    .filter((e) => e.type === "comment" || e.key.trim())
    .map((e) => {
      if (e.type === "comment") {
        // Empty comments become blank lines
        return e.key ? `# ${e.key}` : ""
      }
      const needsQuotes = e.value.includes(" ") || e.value.includes("\n") || e.value.includes('"')
      const value = needsQuotes ? `"${e.value.replace(/"/g, '\\"')}"` : e.value
      const line = `${e.key}=${value}`
      return e.enabled ? line : `#${line}`
    })
    .join("\n")
}

/**
 * Convert entries to JSON format (only enabled variables)
 */
export function entriesToJson(entries: EnvEntry[], includeDisabled = false): string {
  const obj: Record<string, string> = {}
  for (const entry of entries) {
    if (entry.type === "variable" && entry.key.trim()) {
      if (entry.enabled || includeDisabled) {
        obj[entry.key] = entry.value
      }
    }
  }
  return JSON.stringify(obj, null, 2)
}

/**
 * Convert entries to shell export format
 */
export function entriesToShellExport(entries: EnvEntry[]): string {
  return entries
    .filter((e) => e.type === "variable" && e.enabled && e.key.trim())
    .map((e) => {
      const needsQuotes = e.value.includes(" ") || e.value.includes("\n") || e.value.includes("$")
      const value = needsQuotes ? `"${e.value.replace(/"/g, '\\"')}"` : e.value
      return `export ${e.key}=${value}`
    })
    .join("\n")
}

/**
 * Get full metadata as JSON (for debugging/backup)
 */
export function entriesToFullJson(entries: EnvEntry[]): string {
  return JSON.stringify(entries, null, 2)
}

export type ExportFormat = "env" | "json" | "shell" | "full-json"

/**
 * Convert entries to specified format
 */
export function formatEntries(entries: EnvEntry[], format: ExportFormat): string {
  switch (format) {
    case "env":
      return entriesToEnvString(entries)
    case "json":
      return entriesToJson(entries)
    case "shell":
      return entriesToShellExport(entries)
    case "full-json":
      return entriesToFullJson(entries)
    default:
      return entriesToEnvString(entries)
  }
}

/**
 * Get file extension for format
 */
export function getExtensionForFormat(format: ExportFormat): string {
  switch (format) {
    case "env":
      return "env"
    case "json":
    case "full-json":
      return "json"
    case "shell":
      return "sh"
    default:
      return "env"
  }
}
