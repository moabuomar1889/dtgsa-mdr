import Link from "next/link"
import { ArrowRightIcon, Clock3Icon, FileCheck2Icon } from "lucide-react"
import type { CommandWorkspaceTask } from "@/features/dashboard/types"

export function NextBestAction({
  task,
}: {
  task: CommandWorkspaceTask | null
}) {
  if (!task) {
    return (
      <section className="border-line bg-panel rounded-[10px] border p-5">
        <p className="text-dim font-mono text-[9px] tracking-[0.1em] uppercase">
          Your next best action
        </p>
        <h2 className="mt-3 text-[18px] font-medium">You are caught up</h2>
        <p className="text-soft mt-1 text-[11px]">
          New preparation, review, approval, and DC work will appear here.
        </p>
      </section>
    )
  }

  return (
    <section className="border-accent-line bg-panel relative overflow-hidden rounded-[9px] border">
      <span className="bg-accent absolute inset-y-0 left-0 w-[3px]" />
      <div className="grid min-h-[126px] items-center gap-4 px-5 py-5 md:grid-cols-[minmax(0,1.25fr)_minmax(220px,0.9fr)_auto]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="border-accent-line bg-accent-bg text-accent-txt flex size-10 shrink-0 items-center justify-center rounded-[8px] border">
            <FileCheck2Icon className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-accent-txt font-mono text-[8.5px] tracking-[0.1em]">
              Your next best action
            </p>
            <h2 className="mt-1 truncate text-[14px] font-semibold tracking-[-0.01em]">
              {task.document.number} Rev {task.revisionLabel}
            </h2>
            <p className="text-dim mt-0.5 truncate text-[9.5px]">
              {task.project.code} {task.project.name} · {task.document.title}
            </p>
          </div>
        </div>

        <div className="border-line md:border-l md:pl-5">
          <p className="text-soft text-[9.5px] leading-4">
            {task.whyAttention}
          </p>
          <p className="text-dim mt-2 flex flex-wrap items-center gap-2 text-[8.5px]">
            <span className="flex items-center gap-1">
              <Clock3Icon className="size-3" aria-hidden="true" />
              {task.estimatedEffort}
            </span>
            <span>·</span>
            <span
              className={task.priority === "High" ? "text-bad" : "text-warn"}
            >
              {task.attentionLabel}
            </span>
          </p>
        </div>

        <Link
          href={task.href}
          className="bg-accent text-on-accent flex items-center justify-center gap-2 rounded-[7px] px-4 py-2.5 text-[10px] font-semibold whitespace-nowrap"
        >
          Continue{" "}
          {task.kind === "Prepare" ? "preparation" : task.kind.toLowerCase()}
          <ArrowRightIcon className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
