"use client"

import { useEffect } from "react"
import Link from "next/link"
import { TriangleAlertIcon } from "lucide-react"
import { Button } from "@/components/dtg/button"

// Without this boundary any thrown server error in a module route escalated to
// the framework fallback and replaced the whole authenticated shell.
export default function AppSegmentError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error("mdr-web module error", error)
  }, [error])

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 md:px-6">
      <section className="border-line bg-panel w-full max-w-xl overflow-hidden rounded-[9px] border">
        <header className="border-line bg-head border-b px-6 py-5">
          <div className="border-accent-line bg-accent-bg text-accent-txt flex size-11 items-center justify-center rounded-[8px] border">
            <TriangleAlertIcon className="size-5" aria-hidden="true" />
          </div>
          <p className="text-accent-txt mt-5 font-mono text-[9.5px] tracking-[0.09em] uppercase">
            Module error
          </p>
          <h1 className="mt-2 text-[22px] font-medium tracking-[-0.02em]">
            This workspace module could not be loaded
          </h1>
        </header>
        <div className="px-6 py-6">
          <p className="text-soft text-[12px] leading-6">
            The request failed before the module finished rendering. Retrying
            re-runs the server render without losing your session.
          </p>
          {error.digest ? (
            <p className="text-dim mt-3 font-mono text-[10px]">
              Reference: {error.digest}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={() => unstable_retry()}>
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Return to dashboard</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
