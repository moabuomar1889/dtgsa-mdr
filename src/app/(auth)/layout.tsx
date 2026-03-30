import type { ReactNode } from "react"

type AuthLayoutProps = {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4 py-10">
      <div className="w-full max-w-5xl">{children}</div>
    </main>
  )
}
