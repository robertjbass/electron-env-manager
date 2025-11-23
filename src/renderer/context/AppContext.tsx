import { createContext, useContext, useState, type ReactNode } from "react"

type AppState = {
  // Add your state properties here
  _placeholder?: never
}

type AppContextValue = {
  state: AppState
  setState: React.Dispatch<React.SetStateAction<AppState>>
}

const initialState: AppState = {}

const AppContext = createContext<AppContextValue | null>(null)

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState)

  return (
    <AppContext.Provider value={{ state, setState }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === null) {
    throw new Error("useAppContext must be used within an AppContextProvider")
  }
  return context
}
