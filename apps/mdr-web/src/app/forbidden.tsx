import Link from "next/link"
import { ShieldXIcon } from "lucide-react"
import { Button } from "@/components/dtg/button"

export default function Forbidden() {
  return (
    <main className="bg-bg text-text flex min-h-svh items-center justify-center px-5 py-10">
      <section className="border-line bg-panel w-full max-w-xl overflow-hidden rounded-[9px] border">
        <header className="border-line bg-head border-b px-6 py-5">
          <div className="border-accent-line bg-accent-bg text-accent-txt flex size-11 items-center justify-center rounded-[8px] border">
            <ShieldXIcon className="size-5" aria-hidden="true" />
          </div>
          <p className="text-accent-txt mt-5 font-mono text-[9.5px] tracking-[0.09em] uppercase">
            Permission required
          </p>
          <h1 className="mt-2 text-[22px] font-medium tracking-[-0.02em]">
            Access restricted
          </h1>
        </header>
        <div className="px-6 py-6">
          <p className="text-soft text-[12px] leading-6">
            Your current role does not include access to this workspace. Return
            to the dashboard or ask an administrator to assign the required
            permission.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard">Return to dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/profile">View my profile</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
