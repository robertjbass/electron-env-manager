import { useEffect } from "react"
import { X } from "lucide-react"

type ToastProps = {
  message: string
  onClose: () => void
  duration?: number
}

export function Toast({ message, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  return (
    <div className="fixed bottom-4 right-4 flex items-center gap-3 bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-2">
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="text-gray-400 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  )
}
