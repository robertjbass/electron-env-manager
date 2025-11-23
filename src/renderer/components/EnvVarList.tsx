import { useState, useEffect, useCallback, useRef } from "react"
import { Eye, EyeOff, Plus, Trash2, List, Code, MessageSquare, Variable, GripVertical, Clipboard, FileIcon, Braces } from "lucide-react"
import Editor, { loader } from "@monaco-editor/react"
import type { EnvEntry, ViewMode } from "@/renderer/types/env"
import { Toast } from "@/renderer/components/Toast"
import { Tooltip } from "@/renderer/components/Tooltip"

// Configure Monaco to work in Electron by using the CDN
loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs",
  },
})

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function parseEnvString(raw: string): EnvEntry[] {
  // Trim leading/trailing blank lines but preserve internal ones
  const allLines = raw.split("\n")
  let start = 0
  let end = allLines.length - 1
  while (start <= end && !allLines[start].trim()) start++
  while (end >= start && !allLines[end].trim()) end--
  const lines = allLines.slice(start, end + 1)

  const entries: EnvEntry[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Blank lines become empty comments
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

    // Check if it's a commented-out variable (e.g., #KEY=value or # KEY=value)
    if (trimmed.startsWith("#")) {
      const afterHash = trimmed.substring(1).trim()
      const eqIndex = afterHash.indexOf("=")

      if (eqIndex > 0) {
        const key = afterHash.substring(0, eqIndex).trim()
        // Check if it looks like a variable (not just a comment)
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
      // It's a regular comment
      entries.push({
        id: generateId(),
        type: "comment",
        key: afterHash,
        value: "",
        enabled: true,
      })
      continue
    }

    // Regular variable
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

function isEnvFormat(text: string): boolean {
  const lines = text.split("\n").filter((l) => l.trim())
  if (lines.length === 0) return false

  return lines.some((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith("#")) return true
    const eqIndex = trimmed.indexOf("=")
    if (eqIndex <= 0) return false
    const key = trimmed.substring(0, eqIndex).trim()
    return /^[A-Z_][A-Z0-9_]*$/i.test(key)
  })
}

function stripOuterQuotes(text: string): string {
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1)
  }
  return text
}

function entriesToEnvString(entries: EnvEntry[]): string {
  return entries
    .filter((e) => e.type === "comment" || e.key.trim())
    .map((e) => {
      if (e.type === "comment") {
        // Empty comments become blank lines
        return e.key ? `# ${e.key}` : ""
      }
      const needsQuotes = e.value.includes(" ") || e.value.includes("\n")
      const value = needsQuotes ? `"${e.value}"` : e.value
      const line = `${e.key}=${value}`
      return e.enabled ? line : `#${line}`
    })
    .join("\n")
}

type EnvVarRowProps = {
  entry: EnvEntry
  onUpdate: (id: string, updates: Partial<EnvEntry>) => void
  onDelete: (id: string) => void
  duplicateStatus: "none" | "first" | "duplicate"
  onDragStart: (id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  isDragging: boolean
  isDragOver: boolean
}

function EnvVarRow({
  entry,
  onUpdate,
  onDelete,
  duplicateStatus,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
}: EnvVarRowProps) {
  const [showValue, setShowValue] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(entry.value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const toggleType = () => {
    if (entry.type === "comment") {
      // Convert comment to variable
      onUpdate(entry.id, { type: "variable", key: "", value: entry.key, enabled: true })
    } else {
      // Convert variable to comment - combine key=value as comment text
      const commentText = entry.key && entry.value
        ? `${entry.key}=${entry.value}`
        : entry.key || entry.value || ""
      onUpdate(entry.id, { type: "comment", key: commentText, value: "", enabled: true })
    }
  }

  const rowClass = `flex items-center gap-2 ${isDragging ? "opacity-50" : ""} ${isDragOver ? "border-t-2 border-indigo-500" : ""}`

  if (entry.type === "comment") {
    return (
      <div
        className={rowClass}
        data-id={entry.id}
        draggable
        onDragStart={() => onDragStart(entry.id)}
        onDragOver={(e) => onDragOver(e, entry.id)}
        onDragEnd={onDragEnd}
      >
        <div
          className="p-1 cursor-grab text-gray-600 hover:text-gray-400 transition-colors"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </div>
        <Tooltip text="Convert to variable">
          <button
            type="button"
            onClick={toggleType}
            className="p-1 text-gray-500 hover:text-indigo-400 transition-colors"
          >
            <MessageSquare size={16} />
          </button>
        </Tooltip>
        <div className="w-4" />
        <input
          type="text"
          value={entry.key}
          onChange={(e) => onUpdate(entry.id, { key: e.target.value })}
          placeholder="Empty line / blank comment"
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-500 font-mono text-sm italic placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    )
  }

  const isDisabled = !entry.enabled
  const inputBaseClass = `flex-1 px-3 py-2 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 font-mono text-sm ${
    isDisabled ? "bg-gray-800 text-gray-500" : "bg-gray-700 text-white"
  }`

  const getBorderClass = () => {
    if (duplicateStatus === "first") return "border-2 border-blue-500 focus:ring-blue-500"
    if (duplicateStatus === "duplicate") return "border-2 border-red-500 focus:ring-red-500"
    return "border border-gray-600 focus:ring-indigo-500"
  }

  const keyInputClass = `${inputBaseClass} ${getBorderClass()}`

  const valueInputClass = `w-full px-3 py-2 pr-10 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 font-mono text-sm ${
    isDisabled ? "bg-gray-800 text-gray-500" : "bg-gray-700 text-white"
  } ${getBorderClass()}`

  return (
    <div
      className={rowClass}
      data-id={entry.id}
      draggable
      onDragStart={() => onDragStart(entry.id)}
      onDragOver={(e) => onDragOver(e, entry.id)}
      onDragEnd={onDragEnd}
    >
      <div
        className="p-1 cursor-grab text-gray-600 hover:text-gray-400 transition-colors"
        title="Drag to reorder"
      >
        <GripVertical size={16} />
      </div>
      <Tooltip text="Convert to comment">
        <button
          type="button"
          onClick={toggleType}
          className="p-1 text-gray-400 hover:text-indigo-400 transition-colors"
        >
          <Variable size={16} />
        </button>
      </Tooltip>
      <Tooltip text={entry.enabled ? "Disable variable" : "Enable variable"}>
        <input
          type="checkbox"
          checked={entry.enabled}
          onChange={(e) => onUpdate(entry.id, { enabled: e.target.checked })}
          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
        />
      </Tooltip>
      <input
        type="text"
        value={entry.key}
        onChange={(e) => onUpdate(entry.id, { key: e.target.value })}
        placeholder="VARIABLE_NAME"
        className={keyInputClass}
      />
      <span className={isDisabled ? "text-gray-600" : "text-gray-400"}>=</span>
      <div className="flex-2 relative flex items-center">
        <Tooltip text={copied ? "Copied!" : "Copy value"}>
          <button
            type="button"
            onClick={handleCopy}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors z-10"
          >
            <Clipboard size={16} />
          </button>
        </Tooltip>
        <input
          type={showValue ? "text" : "password"}
          value={entry.value}
          onChange={(e) => onUpdate(entry.id, { value: e.target.value })}
          placeholder="value"
          className={`${valueInputClass} pl-9`}
        />
        <button
          type="button"
          onClick={() => setShowValue(!showValue)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
        >
          {showValue ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <button
        type="button"
        onClick={() => onDelete(entry.id)}
        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}

function createEmptyEntry(): EnvEntry {
  return {
    id: generateId(),
    type: "variable",
    key: "",
    value: "",
    enabled: true,
  }
}

export function EnvVarList() {
  const [entries, setEntries] = useState<EnvEntry[]>([createEmptyEntry()])
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [rawText, setRawText] = useState("")
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const dragItemId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [isFileDragOver, setIsFileDragOver] = useState(false)

  const handleDragStart = useCallback((id: string) => {
    dragItemId.current = id
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (dragItemId.current !== id) {
      setDragOverId(id)
    }
  }, [])

  const handleDragEnd = useCallback(() => {
    if (dragItemId.current && dragOverId && dragItemId.current !== dragOverId) {
      setEntries((prev) => {
        const dragIndex = prev.findIndex((e) => e.id === dragItemId.current)
        const dropIndex = prev.findIndex((e) => e.id === dragOverId)
        if (dragIndex === -1 || dropIndex === -1) return prev

        const newEntries = [...prev]
        const [draggedItem] = newEntries.splice(dragIndex, 1)
        newEntries.splice(dropIndex, 0, draggedItem)
        return newEntries
      })
    }
    dragItemId.current = null
    setDragOverId(null)
  }, [dragOverId])

  // File drop handlers
  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes("Files")) {
      setIsFileDragOver(true)
    }
  }, [])

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFileDragOver(false)
  }, [])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFileDragOver(false)

    const files = e.dataTransfer.files
    if (files.length === 0) return

    const file = files[0]
    // Use Electron's webUtils API exposed via preload to get the full path
    const electronApi = (window as { electron?: { getPathForFile?: (file: File) => string } }).electron
    let fullPath: string | null = null

    if (electronApi?.getPathForFile) {
      try {
        fullPath = electronApi.getPathForFile(file)
      } catch (err) {
        console.error("Failed to get file path:", err)
      }
    } else {
      console.warn("electron.getPathForFile not available")
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        const parsed = parseEnvString(content)
        if (parsed.length > 0) {
          setEntries(parsed)
          setFilePath(fullPath)
          setToastMessage(`Loaded ${parsed.length} entry(s) from ${file.name}`)
        }
      }
    }
    reader.readAsText(file)
  }, [])

  const handleUpdate = useCallback(
    (id: string, updates: Partial<EnvEntry>) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
      )
    },
    []
  )

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const clipboardText = e.clipboardData?.getData("text") || ""
    if (!clipboardText) return

    const target = e.target as HTMLElement
    const isValueInput =
      target.tagName === "INPUT" &&
      (target as HTMLInputElement).type === "password"
    const isKeyInput =
      target.tagName === "INPUT" &&
      (target as HTMLInputElement).type === "text" &&
      (target as HTMLInputElement).placeholder === "VARIABLE_NAME"

    if (isEnvFormat(clipboardText)) {
      e.preventDefault()
      const parsed = parseEnvString(clipboardText)
      if (parsed.length > 0) {
        setEntries((prev) => {
          const hasContent = prev.some(
            (e) => e.type === "comment" || e.key.trim() || e.value.trim()
          )
          if (hasContent) {
            return [...prev, ...parsed]
          }
          return parsed
        })
        setToastMessage(`Added ${parsed.length} entry(s)`)
      }
    } else if (isValueInput || isKeyInput) {
      e.preventDefault()
      const cleanValue = stripOuterQuotes(clipboardText)
      const input = target as HTMLInputElement
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const currentValue = input.value
      const newValue =
        currentValue.substring(0, start) +
        cleanValue +
        currentValue.substring(end)

      const rowDiv = input.closest("div.flex.items-center.gap-2")
      const dataId = rowDiv?.getAttribute("data-id")

      if (dataId) {
        if (isKeyInput) {
          setEntries((prev) =>
            prev.map((e) => (e.id === dataId ? { ...e, key: newValue } : e))
          )
        } else {
          setEntries((prev) =>
            prev.map((e) => (e.id === dataId ? { ...e, value: newValue } : e))
          )
        }
      }
    }
  }, [])

  useEffect(() => {
    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [handlePaste])

  const handleDelete = (id: string) => {
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.id !== id)
      return filtered.length === 0 ? [createEmptyEntry()] : filtered
    })
  }

  const handleAdd = () => {
    setEntries((prev) => [...prev, createEmptyEntry()])
  }

  const switchToRaw = () => {
    setRawText(entriesToEnvString(entries))
    setViewMode("raw")
  }

  const switchToTable = () => {
    if (viewMode === "raw") {
      const parsed = parseEnvString(rawText)
      setEntries(parsed.length > 0 ? parsed : [createEmptyEntry()])
    }
    setViewMode("table")
  }

  const switchToJson = () => {
    setViewMode("json")
  }

  const getJsonText = () => {
    return JSON.stringify(entries, null, 2)
  }

  // Track first occurrence of each key among enabled variables
  const getDuplicateStatus = (entry: EnvEntry): "none" | "first" | "duplicate" => {
    if (entry.type !== "variable" || !entry.key.trim() || !entry.enabled) {
      return "none"
    }

    const normalizedKey = entry.key.trim().toUpperCase()
    const enabledVarsWithSameKey = entries.filter(
      (e) => e.type === "variable" && e.enabled && e.key.trim().toUpperCase() === normalizedKey
    )

    // No duplicates if only one enabled variable with this key
    if (enabledVarsWithSameKey.length <= 1) {
      return "none"
    }

    // First occurrence gets blue, subsequent get red
    const firstOccurrence = enabledVarsWithSameKey[0]
    return entry.id === firstOccurrence.id ? "first" : "duplicate"
  }

  return (
    <div
      className={`w-full max-w-3xl mx-auto ${isFileDragOver ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-900 rounded-lg" : ""}`}
      onDragOver={handleFileDragOver}
      onDragLeave={handleFileDragLeave}
      onDrop={handleFileDrop}
    >
      {/* File path display */}
      <div className="flex items-center gap-2 mb-3 text-sm">
        <FileIcon size={14} className="text-gray-500" />
        {filePath ? (
          <span className="text-gray-400 font-mono truncate" title={filePath}>
            {filePath}
          </span>
        ) : (
          <span className="text-gray-600 italic">No associated file</span>
        )}
        {/*
          TODO: Future Features
          - File linking: Allow users to browse and select a file to link
          - Save/Load functionality: Save current entries to file, load from file
          - .env file realtime sync: Watch file for changes and auto-reload
          - Global save to database: Persist entries across sessions
          - Connect to GitHub: Sync .env files with GitHub repositories
        */}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          Environment Variables
        </h2>
        <div className="flex gap-1 bg-gray-700 rounded-lg p-1">
          <button
            type="button"
            onClick={switchToTable}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              viewMode === "table"
                ? "bg-indigo-600 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            <List size={16} />
            Table
          </button>
          <button
            type="button"
            onClick={switchToRaw}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              viewMode === "raw"
                ? "bg-indigo-600 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            <Code size={16} />
            Raw
          </button>
          <button
            type="button"
            onClick={switchToJson}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              viewMode === "json"
                ? "bg-indigo-600 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            <Braces size={16} />
            JSON
          </button>
        </div>
      </div>

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {viewMode === "table" && (
        <div className="space-y-2">
          {entries.map((entry) => (
            <EnvVarRow
              key={entry.id}
              entry={entry}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              duplicateStatus={getDuplicateStatus(entry)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              isDragging={dragItemId.current === entry.id}
              isDragOver={dragOverId === entry.id}
            />
          ))}
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <Plus size={16} />
            Add Line
          </button>
        </div>
      )}

      {viewMode === "raw" && (
        <div className="border border-gray-600 rounded-lg overflow-hidden">
          <Editor
            height="256px"
            defaultLanguage="shell"
            value={rawText}
            onChange={(value) => setRawText(value || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "monospace",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
      )}

      {viewMode === "json" && (
        <div className="border border-gray-600 rounded-lg overflow-hidden">
          <Editor
            height="400px"
            defaultLanguage="json"
            value={getJsonText()}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "monospace",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              readOnly: true,
            }}
          />
        </div>
      )}
    </div>
  )
}
