import { EnvVarList } from "@/renderer/components/EnvVarList"

export function MainView() {
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Env Manager</h1>
        <p className="text-gray-400">Manage your environment variables</p>
        <p className="text-gray-500 text-sm mt-1">Tip: Paste multiple lines at once to import them</p>
      </div>
      <EnvVarList />
    </div>
  )
}
