import { useState, useEffect, useCallback, useRef } from "react"
import { Eye, EyeOff, Plus, Trash2, List, Code, MessageSquare, Variable, GripVertical, Clipboard, FileIcon, Braces } from "lucide-react"
import Editor, { loader } from "@monaco-editor/react"
import type { EnvEntry, ViewMode } from "@/renderer/types/env"
import { Toast } from "@/renderer/components/Toast"
import { Tooltip } from "@/renderer/components/Tooltip"
import { FileActions } from "@/renderer/components/FileActions"
import { useAppContext } from "@/renderer/context/AppContext"
import { parseEnvString, parseEnvFile } from "@/renderer/utils/envParser"
import { entriesToEnvString } from "@/renderer/utils/fileFormatter"

// Configure Monaco to work in Electron by using the CDN
loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs",
  },
})

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
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
  const inputBaseClass = `px-3 py-2 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 font-mono text-sm ${
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
      <div className="flex-1">
        <input
          type="text"
          value={entry.key}
          onChange={(e) => onUpdate(entry.id, { key: e.target.value })}
          placeholder="VARIABLE_NAME"
          className={`w-full ${keyInputClass}`}
        />
      </div>
      <span className={isDisabled ? "text-gray-600" : "text-gray-400"}>=</span>
      <div className="flex-1 relative flex items-center">
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
  const { getActiveFile, updateFileEntries, saveFile } = useAppContext()
  const activeFile = getActiveFile()

  const [localEntries, setLocalEntries] = useState<EnvEntry[]>([createEmptyEntry()])
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [rawText, setRawText] = useState("")
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const dragItemId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [localFilePath] = useState<string | null>(null)
  const [isFileDragOver, setIsFileDragOver] = useState(false)

  // Sync entries from active file
  const entries = activeFile ? activeFile.entries : localEntries
  const filePath = activeFile ? activeFile.path : localFilePath

  const setEntries = useCallback((updater: EnvEntry[] | ((prev: EnvEntry[]) => EnvEntry[])) => {
    if (activeFile) {
      const newEntries = typeof updater === "function" ? updater(activeFile.entries) : updater
      updateFileEntries(activeFile.id, newEntries)
    } else {
      setLocalEntries(updater)
    }
  }, [activeFile, updateFileEntries])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        if (activeFile) {
          const success = await saveFile(activeFile.id)
          setToastMessage(success ? "File saved" : "Failed to save file")
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [activeFile, saveFile])

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
  }, [dragOverId, setEntries])

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

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length === 0) return

    let totalEntries = 0

    Array.from(droppedFiles).forEach((file) => {
      parseEnvFile(file, (parsed) => {
        if (parsed.length > 0) {
          // Merge into current entries
          setEntries((prev) => {
            const hasContent = prev.some(
              (e) => e.type === "comment" || e.key.trim() || e.value.trim()
            )
            if (hasContent) {
              return [...prev, ...parsed]
            }
            return parsed
          })
          totalEntries += parsed.length
          setToastMessage(`Added ${totalEntries} variable(s) from ${droppedFiles.length} file(s)`)
        }
      })
    })
  }, [setEntries])

  const handleUpdate = useCallback(
    (id: string, updates: Partial<EnvEntry>) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
      )
    },
    [setEntries]
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
  }, [setEntries])

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
      className={`w-full h-full p-6 ${isFileDragOver ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-900 rounded-lg" : ""}`}
      onDragOver={handleFileDragOver}
      onDragLeave={handleFileDragLeave}
      onDrop={handleFileDrop}
    >
      {/* File path and actions toolbar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
          <FileIcon size={14} className="text-gray-500 shrink-0" />
          {filePath ? (
            <span className="text-gray-400 font-mono truncate" title={filePath}>
              {filePath}
            </span>
          ) : (
            <span className="text-gray-600 italic">No associated file</span>
          )}
        </div>
        <FileActions
          fileId={activeFile?.id || null}
          isDirty={activeFile?.isDirty || false}
          hasPath={!!filePath}
        />
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
