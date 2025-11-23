import { useState } from "react"

export function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-5xl font-bold mb-2">Env Manager</h1>
        <p className="text-xl opacity-90 mb-6">
          Env Manager is running on Electron + React
        </p>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
        >
          Count: {count}
        </button>
      </div>
    </div>
  )
}
