import type { EnvEntry } from "@/renderer/types/env"

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function parseEnvString(raw: string): EnvEntry[] {
  const allLines = raw.split("\n")
  let start = 0
  let end = allLines.length - 1
  while (start <= end && !allLines[start].trim()) start++
  while (end >= start && !allLines[end].trim()) end--
  const lines = allLines.slice(start, end + 1)

  const entries: EnvEntry[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      entries.push({
        id: generateId(),
        type: "comment",
        key: "",
        value: "",
        enabled: true,
      })
      continue
    }

    if (trimmed.startsWith("#")) {
      const afterHash = trimmed.substring(1).trim()
      const eqIndex = afterHash.indexOf("=")

      if (eqIndex > 0) {
        const key = afterHash.substring(0, eqIndex).trim()
        if (/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
          let value = afterHash.substring(eqIndex + 1).trim()
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1)
          }
          entries.push({
            id: generateId(),
            type: "variable",
            key,
            value,
            enabled: false,
          })
          continue
        }
      }
      entries.push({
        id: generateId(),
        type: "comment",
        key: afterHash,
        value: "",
        enabled: true,
      })
      continue
    }

    const eqIndex = trimmed.indexOf("=")
    if (eqIndex === -1) continue

    const key = trimmed.substring(0, eqIndex).trim()
    let value = trimmed.substring(eqIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (key) {
      entries.push({
        id: generateId(),
        type: "variable",
        key,
        value,
        enabled: true,
      })
    }
  }

  return entries
}

export function parseEnvFile(
  file: File,
  callback: (entries: EnvEntry[], fullPath: string | null) => void
): void {
  const electronApi = (window as { electron?: { getPathForFile?: (file: File) => string } }).electron
  let fullPath: string | null = null

  if (electronApi?.getPathForFile) {
    try {
      fullPath = electronApi.getPathForFile(file)
    } catch (err) {
      console.error("Failed to get file path:", err)
    }
  }

  const reader = new FileReader()
  reader.onload = (event) => {
    const content = event.target?.result as string
    if (content) {
      const parsed = parseEnvString(content)
      callback(parsed, fullPath)
    }
  }
  reader.readAsText(file)
}
