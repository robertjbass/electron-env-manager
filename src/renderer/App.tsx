import { HashRouter, Routes, Route, Navigate } from "react-router-dom"
import { DefaultLayout } from "@/renderer/layouts/DefaultLayout"
import { MainView } from "@/renderer/views/MainView"

export function App() {
  return (
    <HashRouter>
      <DefaultLayout>
        <Routes>
          <Route path="/" element={<MainView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DefaultLayout>
    </HashRouter>
  )
}
