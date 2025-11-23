export type EnvEntry = {
  id: string
  type: "variable" | "comment"
  key: string
  value: string
  enabled: boolean
}

export type ViewMode = "table" | "raw" | "json"
