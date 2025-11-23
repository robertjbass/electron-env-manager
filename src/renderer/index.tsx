import { createRoot } from "react-dom/client"
import { App } from "@/renderer/App"
import { AppContextProvider } from "@/renderer/context/AppContext"
import "@/renderer/styles/app.css"

const root = createRoot(document.getElementById("root")!)
root.render(
  <AppContextProvider>
    <App />
  </AppContextProvider>,
)
