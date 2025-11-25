import { useState, useRef, useEffect } from "react"
import {
  Save,
  Download,
  Upload,
  RefreshCw,
  MoreVertical,
  FileJson,
  FileCode,
  Terminal,
} from "lucide-react"
import { useAppContext } from "@/renderer/context/AppContext"
import { Tooltip } from "@/renderer/components/Tooltip"
import { Toast } from "@/renderer/components/Toast"
import type { ExportFormat } from "@/renderer/utils/fileFormatter"

type FileActionsProps = {
  fileId: string | null
  isDirty: boolean
  hasPath: boolean
}

export function FileActions({ fileId, isDirty, hasPath }: FileActionsProps) {
  const { saveFile, saveFileAs, exportFile, reloadFile, importFile } = useAppContext()
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSave = async () => {
    if (!fileId) return

    setIsSaving(true)
    try {
      if (hasPath) {
        const success = await saveFile(fileId)
        setToastMessage(success ? "File saved" : "Failed to save file")
      } else {
        const success = await saveFileAs(fileId)
        setToastMessage(success ? "File saved" : "Save cancelled")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAs = async () => {
    if (!fileId) return
    const success = await saveFileAs(fileId)
    setToastMessage(success ? "File saved" : "Save cancelled")
  }

  const handleExport = async (format: ExportFormat) => {
    if (!fileId) return
    setShowExportMenu(false)
    const success = await exportFile(fileId, format)
    if (success) {
      setToastMessage(`Exported as ${format.toUpperCase()}`)
    }
  }

  const handleReload = async () => {
    if (!fileId) return
    const success = await reloadFile(fileId)
    setToastMessage(success ? "File reloaded from disk" : "Failed to reload file")
  }

  const handleImport = async () => {
    const id = await importFile()
    if (id) {
      setToastMessage("File imported")
    }
  }

  return (
    <>
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
      <div className="flex items-center gap-1">
        {/* Import button */}
        <Tooltip text="Import file">
          <button
            type="button"
            onClick={handleImport}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Upload size={18} />
          </button>
        </Tooltip>

        {/* Save button */}
        <Tooltip text={hasPath ? "Save (Ctrl+S)" : "Save As"}>
          <button
            type="button"
            onClick={handleSave}
            disabled={!fileId || isSaving}
            className={`p-2 rounded-lg transition-colors ${
              isDirty
                ? "text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Save size={18} />
          </button>
        </Tooltip>

        {/* Reload button */}
        {hasPath && (
          <Tooltip text="Reload from disk">
            <button
              type="button"
              onClick={handleReload}
              disabled={!fileId}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={18} />
            </button>
          </Tooltip>
        )}

        {/* Export menu */}
        <div className="relative" ref={menuRef}>
          <Tooltip text="Export / Save As">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!fileId}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MoreVertical size={18} />
            </button>
          </Tooltip>

          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
              <div className="py-1">
                <button
                  type="button"
                  onClick={handleSaveAs}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <Save size={16} />
                  Save As...
                </button>
                <div className="border-t border-gray-700 my-1" />
                <div className="px-3 py-1 text-xs text-gray-500 uppercase">Export as</div>
                <button
                  type="button"
                  onClick={() => handleExport("env")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <FileCode size={16} />
                  .env format
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("json")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <FileJson size={16} />
                  JSON (key-value)
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("shell")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <Terminal size={16} />
                  Shell export
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("full-json")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <Download size={16} />
                  Full backup (JSON)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
