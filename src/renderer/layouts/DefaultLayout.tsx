import type { ReactNode } from "react"
import { FileSidebar } from "@/renderer/components/FileSidebar"

type DefaultLayoutProps = {
  children: ReactNode
}

export function DefaultLayout({ children }: DefaultLayoutProps) {
  return (
    <div className="h-full w-full flex">
      <FileSidebar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
