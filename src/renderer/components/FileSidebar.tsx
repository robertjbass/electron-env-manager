import { useState, useCallback, useRef, useEffect } from "react"
import { FileText, X, ChevronLeft, ChevronRight, Plus, Pencil, Check, FolderOpen, Copy } from "lucide-react"
import { useAppContext } from "@/renderer/context/AppContext"
import { parseEnvFile } from "@/renderer/utils/envParser"
import { Toast } from "@/renderer/components/Toast"
import { Tooltip } from "@/renderer/components/Tooltip"

export function FileSidebar() {
  const {
    state,
    setActiveFile,
    removeFile,
    toggleSidebar,
    addFile,
    importFile,
    renameFile,
    cloneFile,
  } = useAppContext()
  const { files, activeFileId, sidebarCollapsed } = state
  const [isDragOver, setIsDragOver] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing starts
  useEffect(() => {
    if (editingFileId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingFileId])

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
      parseEnvFile(file, async (parsed, fullPath) => {
        const filePath = fullPath || file.name
        const alreadyLoaded = files.some((f) => f.path === filePath)

        if (alreadyLoaded) {
          duplicates.push(file.name)
        } else if (parsed.length > 0) {
          await addFile(filePath, file.name, parsed)
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

  const handleImportClick = async () => {
    const id = await importFile()
    if (id) {
      setToastMessage("File imported")
    }
  }

  const startRename = (fileId: string, currentName: string, displayName?: string) => {
    setEditingFileId(fileId)
    setEditName(displayName || currentName)
  }

  const confirmRename = async () => {
    if (editingFileId && editName.trim()) {
      await renameFile(editingFileId, editName.trim())
    }
    setEditingFileId(null)
    setEditName("")
  }

  const cancelRename = () => {
    setEditingFileId(null)
    setEditName("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      confirmRename()
    } else if (e.key === "Escape") {
      cancelRename()
    }
  }

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
            <Tooltip text="Import file">
              <button
                type="button"
                onClick={handleImportClick}
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              >
                <FolderOpen size={16} />
              </button>
            </Tooltip>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-gray-500 text-sm">
              <Plus size={24} className="mx-auto mb-2 opacity-50" />
              <p>Drop .env files here</p>
              <p className="mt-1 text-xs text-gray-600">or click the folder icon</p>
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
                title={file.displayName || file.name}
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
          <div className="flex items-center gap-1">
            <Tooltip text="Import file">
              <button
                type="button"
                onClick={handleImportClick}
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              >
                <FolderOpen size={16} />
              </button>
            </Tooltip>
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
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
              onClick={() => {
                if (editingFileId !== file.id) {
                  setActiveFile(file.id)
                }
              }}
            >
              <FileText size={14} className="shrink-0 text-gray-500" />
              <div className="flex-1 min-w-0">
                {editingFileId === file.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={confirmRename}
                      className="flex-1 px-1 py-0.5 text-sm bg-gray-800 border border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        confirmRename()
                      }}
                      className="p-0.5 text-green-400 hover:text-green-300"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      {file.isDirty && (
                        <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                      )}
                      <span className="text-sm truncate" title={file.displayName || file.name}>
                        {file.displayName || file.name}
                      </span>
                    </div>
                    <span
                      className="text-xs text-gray-500 truncate block"
                      title={file.path}
                    >
                      {getDirectoryPath(file.path)}
                    </span>
                  </>
                )}
              </div>
              {editingFileId !== file.id && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                  <Tooltip text="Clone">
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation()
                        const id = await cloneFile(file.id)
                        if (id) {
                          setToastMessage("File cloned")
                        }
                      }}
                      className="p-1 text-gray-500 hover:text-green-400"
                    >
                      <Copy size={12} />
                    </button>
                  </Tooltip>
                  <Tooltip text="Rename">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        startRename(file.id, file.name, file.displayName)
                      }}
                      className="p-1 text-gray-500 hover:text-blue-400"
                    >
                      <Pencil size={12} />
                    </button>
                  </Tooltip>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(file.id)
                    }}
                    className="p-1 text-gray-500 hover:text-red-400"
                    title="Close file"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
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
