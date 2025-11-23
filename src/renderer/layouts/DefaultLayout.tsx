import type { ReactNode } from "react"

type DefaultLayoutProps = {
  children: ReactNode
}

export function DefaultLayout({ children }: DefaultLayoutProps) {
  return <div className="h-full w-full">{children}</div>
}
