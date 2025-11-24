import { useState, useCallback } from "react"
import { FileText, X, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useAppContext } from "@/renderer/context/AppContext"
import { parseEnvFile } from "@/renderer/utils/envParser"
import { Toast } from "@/renderer/components/Toast"

export function FileSidebar() {
  const { state, setActiveFile, removeFile, toggleSidebar, addFile } = useAppContext()
  const { files, activeFileId, sidebarCollapsed } = state
  const [isDragOver, setIsDragOver] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length === 0) return

    const duplicates: string[] = []
    let addedCount = 0

    Array.from(droppedFiles).forEach((file) => {
      parseEnvFile(file, (parsed, fullPath) => {
        const filePath = fullPath || file.name
        const alreadyLoaded = files.some((f) => f.path === filePath)

        if (alreadyLoaded) {
          duplicates.push(file.name)
        } else if (parsed.length > 0) {
          addFile(filePath, file.name, parsed)
          addedCount++
        }

        // Show toast after processing all files
        if (duplicates.length > 0 && addedCount === 0) {
          setToastMessage(`${duplicates.join(", ")} already loaded`)
        } else if (duplicates.length > 0) {
          setToastMessage(`Added ${addedCount} file(s). ${duplicates.join(", ")} already loaded`)
        }
      })
    })
  }, [addFile, files])

  const dropZoneClass = isDragOver
    ? "ring-2 ring-indigo-500 ring-inset bg-indigo-500/10"
    : ""

  if (files.length === 0) {
    return (
      <>
        {toastMessage && (
          <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
        )}
        <div
          className={`w-56 bg-gray-900 border-r border-gray-700 flex flex-col ${dropZoneClass}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Open Files
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-gray-500 text-sm">
              <Plus size={24} className="mx-auto mb-2 opacity-50" />
              <p>Drop .env files here</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (sidebarCollapsed) {
    return (
      <>
        {toastMessage && (
          <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
        )}
        <div
          className={`w-10 bg-gray-900 border-r border-gray-700 flex flex-col ${dropZoneClass}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight size={18} />
          </button>
          <div className="flex-1 flex flex-col items-center pt-2 gap-1">
            {files.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => setActiveFile(file.id)}
                className={`p-2 rounded transition-colors ${
                  activeFileId === file.id
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
                title={file.name}
              >
                <FileText size={16} />
              </button>
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
      <div
        className={`w-56 bg-gray-900 border-r border-gray-700 flex flex-col ${dropZoneClass}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Open Files
          </span>
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {files.map((file) => (
            <div
              key={file.id}
              className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                activeFileId === file.id
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
              onClick={() => setActiveFile(file.id)}
            >
              <FileText size={14} className="flex-shrink-0 text-gray-500" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  {file.isDirty && (
                    <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  )}
                  <span className="text-sm truncate" title={file.name}>
                    {file.name}
                  </span>
                </div>
                <span
                  className="text-xs text-gray-500 truncate block"
                  title={file.path}
                >
                  {getDirectoryPath(file.path)}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(file.id)
                }}
                className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                title="Close file"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        {isDragOver && (
          <div className="px-3 py-2 border-t border-gray-700 text-xs text-indigo-400 text-center">
            Drop to add new file(s)
          </div>
        )}
      </div>
    </>
  )
}

function getDirectoryPath(fullPath: string): string {
  const parts = fullPath.split(/[/\\]/)
  parts.pop()
  const dir = parts.join("/")
  if (dir.length > 30) {
    return "..." + dir.slice(-27)
  }
  return dir || "/"
}
